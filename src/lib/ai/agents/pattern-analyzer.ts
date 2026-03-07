import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { createServiceClient } from '@/lib/db/client';
import {
  getContextChunksByUser,
  upsertWorkingPatterns,
} from '@/lib/db/queries/context';

const anthropic = new Anthropic();

function getHourFromTimestamp(ts: string): number {
  return new Date(ts).getHours();
}

function getDayOfWeek(ts: string): number {
  const day = new Date(ts).getDay();
  return day === 0 ? 7 : day; // 1=Mon, 7=Sun
}

interface DayBucket {
  emails: number;
  slackMessages: number;
  meetings: number;
  tasks: number;
  docs: number;
  codeActivity: number;
}

export async function analyzeWorkingPatterns(userId: string): Promise<void> {
  const supabase = createServiceClient();

  // Get last 30 days of context chunks
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const chunks = await getContextChunksByUser(supabase, userId, {
    after: thirtyDaysAgo.toISOString(),
    limit: 5000,
  });

  if (chunks.length === 0) return;

  // ── 1. Time patterns ──────────────────────────────────────
  const hours = chunks.map((c) => getHourFromTimestamp(c.occurred_at));
  const hourCounts = new Map<number, number>();
  for (const h of hours) {
    hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
  }

  // Weighted by importance
  const hourScores = new Map<number, number>();
  for (const c of chunks) {
    const h = getHourFromTimestamp(c.occurred_at);
    const weight = c.importance === 'critical' ? 3 : c.importance === 'important' ? 2 : 1;
    hourScores.set(h, (hourScores.get(h) ?? 0) + weight);
  }

  const peak_hours = Array.from(hourScores.entries())
    .map(([hour, activity_score]) => ({ hour, activity_score }))
    .sort((a, b) => b.activity_score - a.activity_score);

  // Typical start/end from consistent activity (exclude bottom 10% outliers)
  const sortedHours = [...hours].sort((a, b) => a - b);
  const trimCount = Math.max(1, Math.floor(sortedHours.length * 0.1));
  const trimmedHours = sortedHours.slice(trimCount, -trimCount);
  const typical_start_time = trimmedHours.length > 0
    ? `${String(trimmedHours[0]).padStart(2, '0')}:00:00`
    : null;
  const typical_end_time = trimmedHours.length > 0
    ? `${String(trimmedHours[trimmedHours.length - 1]).padStart(2, '0')}:00:00`
    : null;

  // Active days
  const dayCounts = new Map<number, number>();
  for (const c of chunks) {
    const d = getDayOfWeek(c.occurred_at);
    dayCounts.set(d, (dayCounts.get(d) ?? 0) + 1);
  }
  const avgPerDay = chunks.length / 7;
  const active_days = Array.from(dayCounts.entries())
    .filter(([, count]) => count > avgPerDay * 0.3)
    .map(([day]) => day)
    .sort();

  // ── 2. Communication patterns ──────────────────────────────
  const dayBuckets = new Map<string, DayBucket>();
  for (const c of chunks) {
    const dateKey = c.occurred_at.split('T')[0];
    const bucket = dayBuckets.get(dateKey) ?? {
      emails: 0, slackMessages: 0, meetings: 0, tasks: 0, docs: 0, codeActivity: 0,
    };

    switch (c.chunk_type) {
      case 'email_thread': bucket.emails++; break;
      case 'slack_conversation': bucket.slackMessages++; break;
      case 'calendar_event': bucket.meetings++; break;
      case 'task_update': bucket.tasks++; break;
      case 'document_edit': bucket.docs++; break;
      case 'code_activity': bucket.codeActivity++; break;
    }
    dayBuckets.set(dateKey, bucket);
  }

  const numDays = Math.max(1, dayBuckets.size);
  const bucketValues = [...dayBuckets.values()];
  const avg_emails_per_day = bucketValues.reduce((s, b) => s + b.emails, 0) / numDays;
  const avg_slack_messages_per_day = bucketValues.reduce((s, b) => s + b.slackMessages, 0) / numDays;
  const avg_meetings_per_day = bucketValues.reduce((s, b) => s + b.meetings, 0) / numDays;

  // Busiest/quietest day of week
  const dayOfWeekTotals = new Map<number, number>();
  for (const c of chunks) {
    const d = getDayOfWeek(c.occurred_at);
    dayOfWeekTotals.set(d, (dayOfWeekTotals.get(d) ?? 0) + 1);
  }
  const dayEntries = [...dayOfWeekTotals.entries()];
  const busiest_day_of_week = dayEntries.length
    ? dayEntries.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
    : null;
  const quietest_day_of_week = dayEntries.length
    ? dayEntries.reduce((a, b) => (b[1] < a[1] ? b : a))[0]
    : null;

  // ── 3. Focus patterns ──────────────────────────────────────
  // Meeting-heavy days: days with 3+ meetings
  const meeting_heavy_days = [...dayOfWeekTotals.entries()]
    .filter(([day]) => {
      const meetingsOnDay = chunks.filter(
        (c) => c.chunk_type === 'calendar_event' && getDayOfWeek(c.occurred_at) === day
      ).length;
      return meetingsOnDay >= 3;
    })
    .map(([day]) => day);

  // Context switch frequency: distinct provider changes per hour
  const hourlyProviders = new Map<string, Set<string>>();
  for (const c of chunks) {
    const hourKey = c.occurred_at.slice(0, 13); // YYYY-MM-DDTHH
    const providers = hourlyProviders.get(hourKey) ?? new Set();
    providers.add(c.provider);
    hourlyProviders.set(hourKey, providers);
  }
  const switchCounts = [...hourlyProviders.values()].map((s) => s.size);
  const context_switch_frequency = switchCounts.length
    ? switchCounts.reduce((a, b) => a + b, 0) / switchCounts.length
    : null;

  // Deep work windows: 2+ hour periods with doc/code but no email/slack
  const deep_work_windows: Array<{ start: string; end: string; day: number }> = [];
  // Simplified: look for hours with only doc/code activity
  for (const [hourKey, providers] of hourlyProviders.entries()) {
    const hasComms = providers.has('gmail') || providers.has('outlook') || providers.has('slack');
    const hasDeepWork = providers.has('github') || providers.has('notion') || providers.has('google_drive');
    if (!hasComms && hasDeepWork) {
      const hour = parseInt(hourKey.slice(11, 13));
      const day = getDayOfWeek(hourKey);
      deep_work_windows.push({
        start: `${String(hour).padStart(2, '0')}:00`,
        end: `${String(hour + 1).padStart(2, '0')}:00`,
        day,
      });
    }
  }

  // ── 4. Project activity ────────────────────────────────────
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentChunks = chunks.filter(
    (c) => new Date(c.occurred_at) >= sevenDaysAgo
  );

  const projectCounts = new Map<string, number>();
  for (const c of recentChunks) {
    for (const p of c.projects) {
      const weight = c.importance === 'critical' ? 3 : c.importance === 'important' ? 2 : 1;
      projectCounts.set(p, (projectCounts.get(p) ?? 0) + weight);
    }
  }
  const active_projects_ranked = [...projectCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([project, score]) => ({
      project,
      hours_this_week: Math.round(score * 0.5), // rough estimate
      trend: 'flat' as string,
    }));

  // ── 5. Top collaborators ───────────────────────────────────
  const peopleCounts = new Map<string, { count: number; channels: Set<string> }>();
  for (const c of chunks) {
    for (const p of c.people) {
      const entry = peopleCounts.get(p) ?? { count: 0, channels: new Set() };
      entry.count++;
      entry.channels.add(c.provider);
      peopleCounts.set(p, entry);
    }
  }
  const top_collaborators = [...peopleCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([email, { count, channels }]) => ({
      email,
      interaction_count: count,
      channels: [...channels],
    }));

  // ── 6. Response times (simplified) ─────────────────────────
  // Would need paired inbound/outbound thread analysis for accuracy
  // For now, leave as null — will be enhanced when thread pairing is built
  const response_time_p50_minutes = null;
  const response_time_p90_minutes = null;

  // ── 7. AI summary ─────────────────────────────────────────
  const patternData = {
    typical_start_time,
    typical_end_time,
    avg_emails_per_day: Math.round(avg_emails_per_day * 10) / 10,
    avg_slack_messages_per_day: Math.round(avg_slack_messages_per_day * 10) / 10,
    avg_meetings_per_day: Math.round(avg_meetings_per_day * 10) / 10,
    busiest_day_of_week,
    quietest_day_of_week,
    active_projects_ranked: active_projects_ranked.slice(0, 5),
    top_collaborators: top_collaborators.slice(0, 5),
    meeting_heavy_days,
    context_switch_frequency: context_switch_frequency
      ? Math.round(context_switch_frequency * 10) / 10
      : null,
    total_chunks_30d: chunks.length,
  };

  const response = await anthropic.messages.create({
    model: AI_MODELS.STANDARD,
    max_tokens: 400,
    system: `Based on this user's working patterns data, write two things:
1. working_style_summary: A 2-3 sentence natural-language description of their working style. Be specific and insightful, not generic.
2. recent_changes: Note any significant patterns. If there isn't enough data for comparison, say so briefly.

Return JSON only: { "working_style_summary": "...", "recent_changes": "..." }`,
    messages: [
      { role: 'user', content: JSON.stringify(patternData) },
    ],
  });

  const textBlock = response.content.find((c) => c.type === 'text');
  let working_style_summary: string | null = null;
  let recent_changes: string | null = null;

  if (textBlock && textBlock.type === 'text') {
    try {
      const cleaned = textBlock.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);
      working_style_summary = parsed.working_style_summary ?? null;
      recent_changes = parsed.recent_changes ?? null;
    } catch {
      working_style_summary = textBlock.text;
    }
  }

  // ── 8. Upsert ──────────────────────────────────────────────
  await upsertWorkingPatterns(supabase, userId, {
    typical_start_time,
    typical_end_time,
    peak_hours,
    active_days,
    avg_emails_per_day,
    avg_slack_messages_per_day,
    avg_meetings_per_day,
    response_time_p50_minutes,
    response_time_p90_minutes,
    busiest_day_of_week,
    quietest_day_of_week,
    deep_work_windows,
    meeting_heavy_days,
    context_switch_frequency,
    active_projects_ranked,
    top_collaborators,
    working_style_summary,
    recent_changes,
    analysis_window_days: 30,
    last_analyzed_at: new Date().toISOString(),
  });
}
