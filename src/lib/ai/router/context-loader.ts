import { createServiceClient } from '@/lib/db/client';
import { queryContext } from '@/lib/context/query-engine';
import { getWorkingPatterns, getMemorySnapshot } from '@/lib/db/queries/context';
import { getSessionsInRange } from '@/lib/db/queries/activity-sessions';
import { getDayNarrative } from '@/lib/db/queries/day-narratives';
import { getTodaysBriefing } from '@/lib/db/queries/briefings';
import type { ContextStrategy } from './agent-router';

export interface PreloadedContext {
  /** Extra context lines to inject into the system prompt */
  contextLines: string[];
  /** Strategy that was used */
  strategy: ContextStrategy;
}

/** Returns today's date as YYYY-MM-DD in the local timezone */
function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/**
 * Pre-loads context based on the routing strategy.
 * This runs BEFORE the AI call so the model starts with relevant data
 * instead of needing a tool call round-trip to find it.
 */
export async function loadContextForStrategy(
  strategy: ContextStrategy,
  userId: string,
  userMessage: string,
): Promise<PreloadedContext> {
  const supabase = createServiceClient();
  const lines: string[] = [];

  try {
    switch (strategy) {
      case 'briefing': {
        const briefing = await getTodaysBriefing(supabase, userId);
        if (briefing) {
          lines.push('--- Pre-loaded: Today\'s Briefing ---');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const items = (briefing as any).briefing_items ?? [];
          for (const item of items.slice(0, 10)) {
            lines.push(`[#${item.rank}] ${item.title}: ${item.summary ?? ''}`);
          }
        }
        break;
      }

      case 'tasks': {
        const result = await queryContext({
          userId,
          query: userMessage,
          limit: 10,
          filters: { chunkTypes: ['email_thread', 'slack_conversation', 'calendar_event', 'task_update'] },
        });
        if (result.chunks.length > 0) {
          lines.push('--- Pre-loaded: Relevant Context ---');
          for (const c of result.chunks.slice(0, 8)) {
            lines.push(`[${c.provider}] ${c.title ?? ''}: ${c.content_summary.slice(0, 200)}`);
          }
        }
        break;
      }

      case 'relationships': {
        const result = await queryContext({
          userId,
          query: userMessage,
          limit: 10,
        });
        if (result.chunks.length > 0) {
          lines.push('--- Pre-loaded: Relationship Context ---');
          for (const c of result.chunks.slice(0, 8)) {
            lines.push(`[${c.provider}] ${c.title ?? ''}: ${c.content_summary.slice(0, 200)}`);
          }
        }
        break;
      }

      case 'screen_context': {
        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

        // Pre-load the current/most recent session as a live snapshot
        const { getActiveSession } = await import('@/lib/db/queries/activity-sessions');
        const activeSession = await getActiveSession(supabase, userId);
        if (activeSession) {
          const pd = (activeSession.parsed_data ?? {}) as Record<string, unknown>;
          lines.push('--- Pre-loaded: Current Screen ---');
          lines.push(`App: ${activeSession.app_name} (${activeSession.app_category})`);
          if (activeSession.window_title) lines.push(`Window: ${activeSession.window_title}`);
          if (activeSession.url || pd.url) lines.push(`URL: ${activeSession.url ?? pd.url}`);
          if (pd.pageTitle) lines.push(`Page: ${pd.pageTitle as string}`);
          if (pd.fileName) lines.push(`File: ${pd.fileName as string}`);
          if (pd.projectName) lines.push(`Project: ${pd.projectName as string}`);
          if (pd.conversationPartner) lines.push(`Chatting with: ${pd.conversationPartner as string}`);
          if (pd.subject) lines.push(`Email subject: ${pd.subject as string}`);
          if (Array.isArray(pd.ocrLines) && (pd.ocrLines as string[]).length > 0) {
            lines.push(`OCR text: ${(pd.ocrLines as string[]).slice(0, 5).join(' | ')}`);
          }
          if (activeSession.summary) lines.push(`Summary: ${activeSession.summary}`);
        }

        const sessions = await getSessionsInRange(
          supabase,
          userId,
          twoHoursAgo.toISOString(),
          now.toISOString(),
        );
        if (sessions && sessions.length > 0) {
          lines.push('--- Pre-loaded: Recent Screen Activity (last 2h) ---');
          for (const s of sessions.slice(0, 15)) {
            const duration = s.ended_at
              ? Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000)
              : 'ongoing';
            lines.push(`${s.app_name} (${s.app_category}) — ${duration}${typeof duration === 'number' ? 'min' : ''}`);
          }
        }
        const narrative = await getDayNarrative(supabase, userId, todayISO());
        if (narrative?.narrative) {
          lines.push(`\nToday's narrative: ${narrative.narrative.slice(0, 500)}`);
        }
        break;
      }

      case 'meeting_prep': {
        const result = await queryContext({
          userId,
          query: userMessage,
          limit: 15,
        });
        if (result.chunks.length > 0) {
          lines.push('--- Pre-loaded: Meeting Context ---');
          for (const c of result.chunks.slice(0, 12)) {
            lines.push(`[${c.provider}] ${c.title ?? ''}: ${c.content_summary.slice(0, 250)}`);
          }
        }
        break;
      }

      case 'calendar': {
        const result = await queryContext({
          userId,
          query: userMessage,
          limit: 10,
          filters: { chunkTypes: ['calendar_event'] },
        });
        if (result.chunks.length > 0) {
          lines.push('--- Pre-loaded: Calendar Context ---');
          for (const c of result.chunks) {
            lines.push(`[${c.provider}] ${c.title ?? ''}: ${c.content_summary.slice(0, 200)}`);
          }
        }
        break;
      }

      case 'inbox': {
        const result = await queryContext({
          userId,
          query: userMessage,
          limit: 10,
          filters: { chunkTypes: ['email_thread', 'slack_conversation'] },
        });
        if (result.chunks.length > 0) {
          lines.push('--- Pre-loaded: Inbox Context ---');
          for (const c of result.chunks.slice(0, 8)) {
            lines.push(`[${c.provider}] ${c.title ?? ''}: ${c.content_summary.slice(0, 200)}`);
          }
        }
        break;
      }

      case 'deep_research': {
        const result = await queryContext({
          userId,
          query: userMessage,
          limit: 20,
        });
        if (result.chunks.length > 0) {
          lines.push('--- Pre-loaded: Research Context ---');
          for (const c of result.chunks.slice(0, 15)) {
            lines.push(`[${c.provider}] ${c.title ?? ''}: ${c.content_summary.slice(0, 300)}`);
          }
        }
        break;
      }

      case 'reflection': {
        const patterns = await getWorkingPatterns(supabase, userId);
        if (patterns) {
          lines.push('--- Pre-loaded: Working Patterns ---');
          if (patterns.working_style_summary) {
            lines.push(`Style: ${patterns.working_style_summary}`);
          }
          if (patterns.recent_changes) {
            lines.push(`Recent changes: ${patterns.recent_changes}`);
          }
        }
        const snapshot = await getMemorySnapshot(supabase, userId, todayISO());
        if (snapshot) {
          lines.push('--- Pre-loaded: Recent Day Summary ---');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const snap = snapshot as any;
          if (snap.day_narrative) lines.push(snap.day_narrative.slice(0, 500));
        }
        break;
      }

      case 'general':
      default: {
        // Skip vector search for very short conversational messages (greetings etc.)
        // — there's nothing meaningful to retrieve and it adds unnecessary latency.
        if (userMessage.trim().length < 15) break;

        const result = await queryContext({
          userId,
          query: userMessage,
          limit: 5,
        });
        if (result.chunks.length > 0) {
          lines.push('--- Recent Context (auto-fetched) ---');
          for (const c of result.chunks) {
            lines.push(`[${c.provider}] ${c.title ?? ''}: ${c.content_summary}`);
          }
        }
        break;
      }
    }
  } catch {
    // Non-fatal: continue without pre-loaded context
  }

  return { contextLines: lines, strategy };
}
