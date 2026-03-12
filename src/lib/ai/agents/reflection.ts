import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { buildSafeAIContext } from '@/lib/ai/safety/sanitise';
import { createServiceClient } from '@/lib/db/client';
import type { Reflection, ReflectionType } from '@/lib/db/types';

const anthropic = new Anthropic();

const WEEKLY_REFLECTION_PROMPT = `You are generating a weekly reflection for a C-Suite executive's AI chief of staff.
Given the executive's activity data from the past week, produce a structured JSON reflection.

Return a JSON object with exactly these fields:
{
  "summary": "2-3 sentence executive summary of the week — tone should be direct, insightful, and action-oriented",
  "accomplishments": [{"description": "What was accomplished", "source_ref": {"provider": "...", "message_id": "...", "excerpt": "..."}}],
  "slipped_items": [{"description": "What slipped or was missed", "source_ref": {"provider": "...", "message_id": "...", "excerpt": "..."}}],
  "relationship_highlights": [{"contact_name": "Name", "note": "Key interaction or status change — e.g. 'Most interacted with this week (12 touchpoints)', 'Relationship score declined 15 points', 'New VIP contact established'"}],
  "patterns": [{"observation": "Observed pattern", "suggestion": "Actionable suggestion"}],
  "recommendations": "1-2 sentences of strategic recommendations for next week",
  "strategic_recommendation": "One sentence: the single most impactful thing to change next week, based on all patterns observed. Be specific and actionable."
}

Rules:
- accomplishments: tasks resolved, meetings attended, emails actioned, tasks completed
- slipped_items: tasks that went overdue, emails left unanswered, meetings missed
- relationship_highlights: MUST include: (a) who you connected with most this week and how many touchpoints, (b) any VIP relationships that improved or declined, (c) contacts that went cold or were re-engaged. Use the relationship_scores and interaction data provided.
- patterns: recurring behaviours (e.g. "You tend to leave financial emails for 3+ days", "Your busiest day is Tuesday", "Peak productivity between 9-11am")
- strategic_recommendation: ONE sentence — the highest-leverage behavioural change or focus area for next week. Not generic advice. Based on THIS week's specific data.
- The input includes task_stats (completed/total) and screen_time_by_category. Reference these numbers directly in the summary: "You completed X of Y tasks (Z%)" and "You spent Nh in Development, Mh in Communications"
- Be specific with names, dates, and numbers — never be vague
- Maximum 5 items per array
- Respond ONLY with the JSON object`;

const MONTHLY_REFLECTION_PROMPT = `You are generating a monthly reflection for a C-Suite executive's AI chief of staff.
Given the executive's activity data from the past month, produce a structured JSON reflection with a higher-level strategic view.

Return a JSON object with exactly these fields:
{
  "summary": "3-4 sentence executive summary of the month — strategic, insightful, forward-looking",
  "accomplishments": [{"description": "Major accomplishment", "source_ref": {"provider": "...", "message_id": "...", "excerpt": "..."}}],
  "slipped_items": [{"description": "What slipped or was consistently missed", "source_ref": {"provider": "...", "message_id": "...", "excerpt": "..."}}],
  "relationship_highlights": [{"contact_name": "Name", "note": "Relationship trend over the month"}],
  "patterns": [{"observation": "Observed monthly pattern", "suggestion": "Strategic suggestion"}],
  "recommendations": "2-3 sentences of strategic recommendations for the coming month"
}

Rules:
- Focus on trends and patterns, not individual items
- accomplishments: major milestones, project completions, relationship wins
- slipped_items: recurring blind spots, consistently delayed areas
- relationship_highlights: who you invested most time in, who dropped off, new relationships formed
- patterns: monthly-level behavioural trends, workload distribution, response time patterns
- Be specific with numbers and names
- Maximum 8 items per array
- Respond ONLY with the JSON object`;

function extractText(content: Anthropic.ContentBlock[]): string {
  for (const block of content) {
    if (block.type === 'text') return block.text;
  }
  return '';
}

interface ReflectionData {
  summary: string;
  accomplishments: Array<{ description: string; source_ref?: { provider: string; message_id: string; excerpt: string } }>;
  slipped_items: Array<{ description: string; source_ref?: { provider: string; message_id: string; excerpt: string } }>;
  relationship_highlights: Array<{ contact_name: string; note: string }>;
  patterns: Array<{ observation: string; suggestion?: string }>;
  recommendations: string;
  strategic_recommendation?: string;
}

async function gatherPeriodData(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  periodStart: string,
  periodEnd: string,
): Promise<string> {
  // Gather briefing items for the period
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: briefingItems } = await (supabase as any)
    .from('briefing_items')
    .select('title, summary, section, item_type, sentiment, urgency_score, actioned_at, created_at')
    .eq('user_id', userId)
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd)
    .order('created_at', { ascending: false })
    .limit(100);

  // Gather tasks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tasks } = await (supabase as any)
    .from('tasks')
    .select('task_text, recipient_name, status, implied_deadline, resolved_at, created_at')
    .eq('user_id', userId)
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd);

  // Gather contact interactions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: interactions } = await (supabase as any)
    .from('contact_interactions')
    .select('contact_id, direction, channel, subject, interacted_at')
    .eq('user_id', userId)
    .gte('interacted_at', periodStart)
    .lte('interacted_at', periodEnd)
    .order('interacted_at', { ascending: false })
    .limit(50);

  // Gather contacts for relationship context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contacts } = await (supabase as any)
    .from('contacts')
    .select('id, name, email, is_vip, relationship_score, is_cold, interaction_count_30d')
    .eq('user_id', userId)
    .or('is_vip.eq.true,is_cold.eq.true');

  // Build a contact lookup
  const contactMap = new Map<string, { name: string; email: string; is_vip: boolean }>();
  if (contacts) {
    for (const c of contacts as Array<{ id: string; name: string | null; email: string; is_vip: boolean }>) {
      contactMap.set(c.id, { name: c.name ?? c.email, email: c.email, is_vip: c.is_vip });
    }
  }

  // Enrich interactions with contact names
  const enrichedInteractions = (interactions ?? []).map((i: { contact_id: string; direction: string; channel: string; subject: string | null; interacted_at: string }) => {
    const contact = contactMap.get(i.contact_id);
    return {
      ...i,
      contact_name: contact?.name ?? 'Unknown',
      is_vip: contact?.is_vip ?? false,
    };
  });

  // Gather audit log for automated actions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: auditEntries } = await (supabase as any)
    .from('audit_log')
    .select('action_type, outcome, created_at')
    .eq('user_id', userId)
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd);

  // Compute task completion stats
  const allTasks = (tasks ?? []) as Array<{ status: string }>;
  const completedTasks = allTasks.filter(c => c.status === 'resolved').length;
  const totalTasks = allTasks.length;
  const taskStats = {
    completed: completedTasks,
    total: totalTasks,
    completion_rate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
  };

  // Gather screen time by category from activity_sessions (observer data)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: activitySessions } = await (supabase as any)
    .from('activity_sessions')
    .select('app_category, duration_seconds')
    .eq('user_id', userId)
    .gte('started_at', periodStart)
    .lte('started_at', periodEnd);

  const screenTimeByCategory: Record<string, number> = {};
  for (const session of (activitySessions ?? []) as Array<{ app_category: string; duration_seconds: number | null }>) {
    const cat = session.app_category || 'unknown';
    const minutes = Math.round((session.duration_seconds ?? 0) / 60);
    screenTimeByCategory[cat] = (screenTimeByCategory[cat] ?? 0) + minutes;
  }

  // Gather relationship scores for top contacts (by interaction count)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: topContacts } = await (supabase as any)
    .from('contacts')
    .select('name, email, is_vip, relationship_score, score_history, interaction_count_30d')
    .eq('user_id', userId)
    .order('interaction_count_30d', { ascending: false, nullsFirst: false })
    .limit(15);

  const relationshipScores = (topContacts ?? []).map((c: { name: string | null; email: string; is_vip: boolean; relationship_score: number | null; score_history: Array<{ score: number; recorded_at: string }> | null; interaction_count_30d: number }) => ({
    name: c.name ?? c.email,
    email: c.email,
    is_vip: c.is_vip,
    score: c.relationship_score,
    score_trend: c.score_history && c.score_history.length >= 2
      ? c.score_history[0].score - c.score_history[1].score
      : 0,
    interactions_30d: c.interaction_count_30d,
  }));

  return JSON.stringify({
    period: { start: periodStart, end: periodEnd },
    briefing_items: briefingItems ?? [],
    tasks: tasks ?? [],
    task_stats: taskStats,
    interactions: enrichedInteractions,
    vip_and_cold_contacts: contacts ?? [],
    relationship_scores: relationshipScores,
    screen_time_by_category: screenTimeByCategory,
    automated_actions: auditEntries ?? [],
  });
}

export async function generateReflection(
  userId: string,
  type: ReflectionType,
  periodStart: Date,
  periodEnd: Date,
): Promise<Reflection | null> {
  // Schedule guard: monthly only on 1st, weekly only on Monday
  const now = new Date();
  if (type === 'monthly' && now.getDate() !== 1) return null;
  if (type === 'weekly' && now.getDay() !== 1) return null;

  const startTime = Date.now();
  const supabase = createServiceClient();

  // Deduplicate: skip if a reflection already exists for this period + type
  const periodStartStr = periodStart.toISOString().split('T')[0];
  const periodEndStr = periodEnd.toISOString().split('T')[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('reflections')
    .select('id')
    .eq('user_id', userId)
    .eq('reflection_type', type)
    .eq('period_start', periodStartStr)
    .eq('period_end', periodEndStr)
    .limit(1);

  if (existing && existing.length > 0) {
    // Already generated — return the existing one
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: full } = await (supabase as any)
      .from('reflections')
      .select('*')
      .eq('id', existing[0].id)
      .single();
    return full as Reflection;
  }

  const periodDataStr = await gatherPeriodData(
    supabase,
    userId,
    periodStart.toISOString(),
    periodEnd.toISOString(),
  );

  // Parse period data to extract pre-computed stats for DB storage
  let periodDataParsed: Record<string, unknown> = {};
  try { periodDataParsed = JSON.parse(periodDataStr); } catch { /* ignore */ }

  const prompt = type === 'weekly' ? WEEKLY_REFLECTION_PROMPT : MONTHLY_REFLECTION_PROMPT;

  const context = buildSafeAIContext(
    prompt,
    [{ label: `${type}_activity_data`, content: periodDataStr, source: 'reflection-agent' }],
  );

  const response = await anthropic.messages.create({
    model: AI_MODELS.STANDARD,
    max_tokens: 2000,
    messages: [{ role: 'user', content: context }],
  });

  const text = extractText(response.content)
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  let data: ReflectionData;
  try {
    data = JSON.parse(text);
  } catch {
    data = {
      summary: text.slice(0, 500),
      accomplishments: [],
      slipped_items: [],
      relationship_highlights: [],
      patterns: [],
      recommendations: '',
    };
  }

  const generationMs = Date.now() - startTime;

  // Write to database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: reflection, error } = await (supabase as any)
    .from('reflections')
    .insert({
      user_id: userId,
      reflection_type: type,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      summary: data.summary,
      accomplishments: data.accomplishments,
      slipped_items: data.slipped_items,
      relationship_highlights: data.relationship_highlights,
      patterns: data.patterns,
      recommendations: data.recommendations,
      task_stats: periodDataParsed.task_stats ?? null,
      screen_time_by_category: periodDataParsed.screen_time_by_category ?? null,
      strategic_recommendation: data.strategic_recommendation ?? null,
      generation_model: AI_MODELS.STANDARD,
      generation_ms: generationMs,
    })
    .select()
    .single();

  if (error) throw error;
  return reflection as Reflection;
}
