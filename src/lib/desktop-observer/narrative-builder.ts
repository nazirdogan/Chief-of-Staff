/**
 * Day Narrative Builder — maintains a continuously-updated "day story"
 * from activity sessions.
 *
 * Every ~15 minutes, reads today's activity sessions, groups them by
 * time block, and asks the AI to write a concise narrative. Also extracts
 * key events, people, and projects for quick querying.
 */

import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { createServiceClient } from '@/lib/db/client';
import { getSessionsInRange, getTodaySessionStats } from '@/lib/db/queries/activity-sessions';
import { upsertDayNarrative, getDayNarrative } from '@/lib/db/queries/day-narratives';
import { generateEmbedding } from '@/lib/ai/embeddings';
import type { ActivitySession } from '@/lib/context/types';

const anthropic = new Anthropic();

interface TimeBlock {
  label: string;
  sessions: ActivitySession[];
  startHour: number;
  endHour: number;
}

function groupSessionsByTimeBlock(sessions: ActivitySession[]): TimeBlock[] {
  const blocks: TimeBlock[] = [
    { label: 'Early Morning (6-9am)', sessions: [], startHour: 6, endHour: 9 },
    { label: 'Morning (9am-12pm)', sessions: [], startHour: 9, endHour: 12 },
    { label: 'Afternoon (12-3pm)', sessions: [], startHour: 12, endHour: 15 },
    { label: 'Late Afternoon (3-6pm)', sessions: [], startHour: 15, endHour: 18 },
    { label: 'Evening (6-9pm)', sessions: [], startHour: 18, endHour: 21 },
    { label: 'Night (9pm-12am)', sessions: [], startHour: 21, endHour: 24 },
  ];

  for (const session of sessions) {
    const hour = new Date(session.started_at).getHours();
    const block = blocks.find(b => hour >= b.startHour && hour < b.endHour);
    if (block) block.sessions.push(session);
  }

  return blocks.filter(b => b.sessions.length > 0);
}

function formatSessionForPrompt(session: ActivitySession): string {
  const duration = session.ended_at
    ? Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000)
    : Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000);

  const time = new Date(session.started_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  let detail = `${time} — ${session.app_name} (${session.app_category}, ${duration}min)`;

  if (session.summary) {
    detail += `\n  Summary: ${session.summary}`;
  }
  if (session.people.length > 0) {
    detail += `\n  People: ${session.people.slice(0, 5).join(', ')}`;
  }
  if (session.projects.length > 0) {
    detail += `\n  Projects: ${session.projects.join(', ')}`;
  }

  // Add key structured data
  const pd = session.parsed_data;
  if (pd.subject) detail += `\n  Email subject: ${pd.subject}`;
  if (pd.conversationPartner) detail += `\n  Chat with: ${pd.conversationPartner}`;
  if (pd.fileName) detail += `\n  File: ${pd.fileName}`;
  if (pd.pageTitle) detail += `\n  Page: ${pd.pageTitle}`;

  return detail;
}

function buildNarrativePrompt(
  blocks: TimeBlock[],
  previousNarrative: string | null,
  stats: {
    sessionCount: number;
    totalActiveSeconds: number;
    people: string[];
    projects: string[];
  }
): string {
  const blockTexts = blocks.map(block => {
    const sessionTexts = block.sessions.map(formatSessionForPrompt);
    return `## ${block.label}\n${sessionTexts.join('\n\n')}`;
  });

  return `You are a personal activity analyst. Given the user's activity sessions today, write a concise narrative of their day so far.

ACTIVITY SESSIONS:
${blockTexts.join('\n\n')}

STATS:
- Total sessions: ${stats.sessionCount}
- Active time: ${Math.round(stats.totalActiveSeconds / 60)} minutes
- People interacted with: ${stats.people.slice(0, 10).join(', ') || 'none'}
- Projects touched: ${stats.projects.join(', ') || 'none'}
${previousNarrative ? `\nPREVIOUS NARRATIVE (update, don't repeat):\n${previousNarrative}` : ''}

Rules:
1. Write 3-6 sentences covering what the user did, who they talked to, and what they focused on.
2. Be specific — mention actual names, projects, and topics when available.
3. Note transitions and patterns (e.g., "switched from coding to email around 11am").
4. Highlight anything that seems important (VIP conversations, deadline mentions, long focus periods).
5. Write in third person: "The user..." or "They..."
6. Keep it under 200 words.

Also extract key events as a JSON array (max 5):

Return JSON only:
{
  "narrative": "<the narrative text>",
  "key_events": [
    {"event": "<what happened>", "time": "<when>", "importance": "critical|important|background"}
  ]
}`;
}

/**
 * Build or update today's day narrative from activity sessions.
 */
export async function buildDayNarrative(userId: string): Promise<void> {
  const supabase = createServiceClient();

  // Today's date boundaries
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayStr = now.toISOString().split('T')[0];

  // Fetch today's sessions and stats
  const [sessions, stats, existingNarrative] = await Promise.all([
    getSessionsInRange(supabase, userId, todayStart),
    getTodaySessionStats(supabase, userId, todayStart),
    getDayNarrative(supabase, userId, todayStr),
  ]);

  if (sessions.length === 0) return;

  // Group into time blocks
  const blocks = groupSessionsByTimeBlock(sessions);

  // Build prompt
  const prompt = buildNarrativePrompt(
    blocks,
    existingNarrative?.narrative ?? null,
    stats
  );

  // Call AI
  let narrative = '';
  let keyEvents: Array<{ event: string; time: string; importance: string }> = [];

  try {
    const response = await anthropic.messages.create({
      model: AI_MODELS.FAST,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find(c => c.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      try {
        const cleaned = textBlock.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned);
        narrative = parsed.narrative || '';
        keyEvents = Array.isArray(parsed.key_events) ? parsed.key_events : [];
      } catch {
        // If JSON parsing fails, use the raw text as narrative
        narrative = textBlock.text;
      }
    }
  } catch (err) {
    console.error('[narrative-builder] AI call failed:', err instanceof Error ? err.message : 'unknown');
    // Fallback: simple summary from stats
    narrative = `Today so far: ${stats.sessionCount} activity sessions across ${Math.round(stats.totalActiveSeconds / 60)} minutes of active time.`;
    if (stats.people.length > 0) narrative += ` Interacted with: ${stats.people.slice(0, 5).join(', ')}.`;
    if (stats.projects.length > 0) narrative += ` Worked on: ${stats.projects.join(', ')}.`;
  }

  // Generate embedding for semantic search
  let embedding: number[] | undefined;
  try {
    embedding = await generateEmbedding(narrative);
  } catch {
    // Non-critical — skip embedding
  }

  // Merge key events with existing
  const allKeyEvents = [
    ...(existingNarrative?.key_events ?? []),
    ...keyEvents,
  ].slice(-10);

  // Merge people and projects
  const allPeople = [...new Set([
    ...(existingNarrative?.people_seen ?? []),
    ...stats.people,
  ])];
  const allProjects = [...new Set([
    ...(existingNarrative?.projects_worked_on ?? []),
    ...stats.projects,
  ])];

  // Upsert
  await upsertDayNarrative(supabase, {
    userId,
    narrativeDate: todayStr,
    narrative,
    sessionCount: stats.sessionCount,
    emailSessions: stats.emailSessions,
    chatSessions: stats.chatSessions,
    codeSessions: stats.codeSessions,
    meetingSessions: stats.meetingSessions,
    browsingSessions: stats.browsingSessions,
    totalActiveSeconds: stats.totalActiveSeconds,
    keyEvents: allKeyEvents,
    peopleSeen: allPeople,
    projectsWorkedOn: allProjects,
    embedding,
  });

  console.log(`[narrative-builder] Updated day narrative for ${todayStr}: ${sessions.length} sessions, ${Math.round(stats.totalActiveSeconds / 60)}min active`);
}
