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
import { redactPII } from '@/lib/ai/safety/sanitise';
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

export function formatSessionForPrompt(session: ActivitySession): string {
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

  // Expand parsed_data into rich structured context per category
  const pd = session.parsed_data as Record<string, unknown>;

  switch (session.app_category) {
    case 'chat': {
      // Keep chat partner names — they are key intelligence, do NOT redact
      if (pd.conversationPartner) detail += `\n  Chat with: ${String(pd.conversationPartner)}`;
      if (pd.platform) detail += ` (${String(pd.platform)})`;
      if (Array.isArray(pd.messages) && pd.messages.length > 0) {
        const msgs = (pd.messages as unknown[]).slice(-10); // Last 10 for full conversation context
        const msgLines = msgs.map((m) => {
          const msg = m as Record<string, unknown>;
          const text = String(msg.text ?? msg.content ?? '').slice(0, 200);
          const sender = String(msg.sender ?? msg.from ?? '');
          return sender ? `${sender}: ${text}` : text;
        });
        detail += `\n  Messages (${msgs.length}):\n    ${msgLines.join('\n    ')}`;
      }
      break;
    }
    case 'email': {
      if (pd.subject) detail += `\n  Email subject: ${redactPII(String(pd.subject))}`;
      if (pd.from) detail += `\n  From: ${redactPII(String(pd.from))}`;
      if (pd.bodyPreview) {
        detail += `\n  Preview: ${redactPII(String(pd.bodyPreview).slice(0, 200))}`;
      }
      break;
    }
    case 'code': {
      // fileName now contains the full path e.g. "login/page.tsx" — tells AI which feature area
      if (pd.fileName) detail += `\n  File: ${String(pd.fileName)}`;
      if (pd.projectName) detail += `\n  Project: ${String(pd.projectName)}`;
      if (pd.language) detail += `\n  Language: ${String(pd.language)}`;
      if (Array.isArray(pd.functions) && pd.functions.length > 0) {
        const fns = (pd.functions as unknown[]).slice(0, 5).map(String);
        detail += `\n  Functions/Classes: ${fns.join(', ')}`;
      }
      // Include a short code preview so AI can infer WHAT was being written
      if (pd.codeSnippet && typeof pd.codeSnippet === 'string' && pd.codeSnippet.length > 20) {
        detail += `\n  Code preview: ${pd.codeSnippet.slice(0, 250)}`;
      }
      break;
    }
    case 'terminal': {
      if (pd.currentDirectory) detail += `\n  Directory: ${String(pd.currentDirectory)}`;
      if (pd.activeProcess) detail += `\n  Process: ${String(pd.activeProcess)}`;
      if (Array.isArray(pd.recentCommands) && pd.recentCommands.length > 0) {
        const cmds = (pd.recentCommands as unknown[]).slice(-5).map(String);
        detail += `\n  Recent commands: ${cmds.join(' | ')}`;
      }
      break;
    }
    case 'browser': {
      if (pd.pageTitle) detail += `\n  Page: ${redactPII(String(pd.pageTitle))}`;
      if (pd.domain) detail += `\n  Domain: ${String(pd.domain)}`;
      if (pd.keyContent) {
        detail += `\n  Content: ${redactPII(String(pd.keyContent).slice(0, 300))}`;
      }
      break;
    }
    case 'calendar': {
      if (Array.isArray(pd.events) && pd.events.length > 0) {
        const evts = (pd.events as unknown[]).map((e) => {
          const ev = e as Record<string, unknown>;
          return `${String(ev.title ?? '')} at ${String(ev.time ?? ev.start ?? '')}`;
        });
        detail += `\n  Events: ${evts.join('; ')}`;
      }
      break;
    }
    default: {
      // Fallback for document, design, unknown — keep existing simple fields
      if (pd.subject) detail += `\n  Subject: ${redactPII(String(pd.subject))}`;
      if (pd.fileName) detail += `\n  File: ${String(pd.fileName)}`;
      if (pd.pageTitle) detail += `\n  Page: ${redactPII(String(pd.pageTitle))}`;
      break;
    }
  }

  // Universal OCR content — shown when AX API couldn't read the app
  // (WhatsApp native, Zoom, Keynote, Pages, Excel, Figma, etc.)
  if (Array.isArray(pd.ocrLines) && (pd.ocrLines as string[]).length > 0) {
    const ocrLines = pd.ocrLines as string[];
    // Only supplement with OCR when category-specific structured data is sparse
    const hasStructuredContent =
      (session.app_category === 'chat' && Array.isArray(pd.messages) && (pd.messages as unknown[]).length > 0) ||
      (session.app_category === 'email' && pd.subject) ||
      (session.app_category === 'browser' && pd.keyContent) ||
      (session.app_category === 'code' && pd.fileName);
    if (!hasStructuredContent) {
      const sample = ocrLines.slice(0, 20).join('\n    ');
      detail += `\n  Screen content (OCR):\n    ${redactPII(sample.slice(0, 600))}`;
    }
  }

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

  return `You are a personal activity analyst. Given the user's activity sessions today, produce a rich, LittleBird-style intelligence report.

ACTIVITY SESSIONS:
${blockTexts.join('\n\n')}

STATS:
- Total sessions: ${stats.sessionCount}
- Active time: ${Math.round(stats.totalActiveSeconds / 60)} minutes
- People interacted with: ${stats.people.slice(0, 10).join(', ') || 'none'}
- Projects touched: ${stats.projects.join(', ') || 'none'}
${previousNarrative ? `\nPREVIOUS NARRATIVE (build on this, add new detail):\n${previousNarrative}` : ''}

Rules:
1. Be SPECIFIC — use real names, exact feature names, actual conversation topics, amounts, URLs, file names, command names. Never use vague phrases like "worked on project" or "had conversations".
2. Produce categorized bullet points grouped by activity type. Only include categories that have actual activity.
3. Each bullet should name the specific thing done, who was involved, and any notable detail.
4. The executive summary (narrative) should be 2-3 sentences capturing the day's major themes and any critical items.
5. Key events should capture notable moments: important conversations, large commits, decisions made, alerts received (max 8 events).
6. Write all bullet points in second person: "You reviewed...", "You spoke with...", "You deployed..."
7. For code sessions: interpret the file path to understand the feature area. "login/page.tsx" in project "donna" = "editing Donna's login page". "settings/autonomy/page.tsx" = "working on autonomy settings". The directory path IS the feature context — use it.
8. For chat sessions: when message content IS available, you MUST extract and name the specific topics, questions, news, or decisions discussed — e.g. "You spoke with Harshal about City's upcoming fixtures and shared the imdonna.app link" or "Mum gave feedback on the mobile view of the site". The messages are the most valuable signal in a chat session — surface them. If only the contact name is available with no messages, say "You had a [platform] conversation with [name]" — do NOT say they "showed up in your activity" and do NOT speculate about content.
9. Never list a sub-directory (like "login", "settings", "api") as a standalone project focus area. The project is the top-level repo name (e.g., "donna"). Sub-directories tell you WHAT FEATURE was being worked on.

Categories to use (only include if activity exists):
- "Development & Technical Work": coding sessions, terminal commands, deployments, PRs, debugging
- "Communications & Meetings": chat conversations, emails sent/read, calls, calendar events
- "Research & Browsing": web research, documentation reading, articles, tools explored
- "Personal & Admin": personal tasks, admin work, settings, unrelated browsing

Return valid JSON only — no markdown fences, no commentary:
{
  "narrative": "<2-3 sentence executive summary of the day>",
  "structured_summary": {
    "Development & Technical Work": ["You refactored the auth middleware in src/lib/middleware/withAuth.ts, extracting token validation into a separate helper", "You ran npm run typecheck and fixed 3 type errors in commitment.ts"],
    "Communications & Meetings": ["You spoke with Sarah Chen about the Q2 roadmap — she asked about the timeline for the payments feature", "You read 4 emails from investors including a follow-up from Accel Partners"]
  },
  "key_events": [
    {"event": "<specific description>", "time": "<HH:MM am/pm>", "importance": "critical|important|background"}
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

  // ── Staleness checks — skip AI call if nothing meaningful has changed ──

  if (existingNarrative) {
    const TWENTY_MINUTES_MS = 20 * 60 * 1000;
    const narrativeAge = Date.now() - new Date(existingNarrative.last_updated_at).getTime();

    // 1. Narrative is still fresh — no need to regenerate yet
    if (narrativeAge < TWENTY_MINUTES_MS) return;

    // 2. Neither session count nor latest session timestamp has changed
    const lastSessionAt = sessions.reduce(
      (max, s) => Math.max(max, new Date(s.started_at).getTime()),
      0
    );
    const lastNarrativeAt = new Date(existingNarrative.last_updated_at).getTime();
    const sessionCountUnchanged = sessions.length === existingNarrative.session_count;
    const noNewSessions = lastSessionAt <= lastNarrativeAt;

    if (sessionCountUnchanged && noNewSessions) return;
  }

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
  let structuredSummary: Record<string, string[]> | undefined;

  try {
    const response = await anthropic.messages.create({
      model: AI_MODELS.FAST,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find(c => c.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      try {
        const cleaned = textBlock.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned);
        narrative = parsed.narrative || '';
        keyEvents = Array.isArray(parsed.key_events) ? parsed.key_events : [];
        if (parsed.structured_summary && typeof parsed.structured_summary === 'object') {
          structuredSummary = parsed.structured_summary as Record<string, string[]>;
        }
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
    structuredSummary,
  });

  console.log(`[narrative-builder] Updated day narrative for ${todayStr}: ${sessions.length} sessions, ${Math.round(stats.totalActiveSeconds / 60)}min active`);
}
