/**
 * Briefing Context Enrichment — fetches contextual data that the raw
 * candidate list doesn't include: memory snapshots, working patterns,
 * active threads, and per-person/per-project context.
 *
 * All queries are existing DB functions — no AI calls happen here.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ContextThread, WorkingPatterns, MemorySnapshot, ContextChunk, DayNarrative, ActivitySession } from '@/lib/context/types';
import {
  getWorkingPatterns,
  getMemorySnapshot,
  getActiveContextThreads,
  getContextChunksByPeople,
  getContextChunksByProject,
  getDesktopObserverChunks,
} from '@/lib/db/queries/context';
import { getSessionsInRange } from '@/lib/db/queries/activity-sessions';
import { getDayNarrative } from '@/lib/db/queries/day-narratives';
import { getTodayInTimezone } from '@/lib/utils/timezone';

export interface EnrichedContext {
  /** Yesterday's memory snapshot — open loops, key decisions, notable interactions */
  yesterdaySnapshot: MemorySnapshot | null;
  /** User's working patterns — peak hours, collaborators, projects */
  workingPatterns: WorkingPatterns | null;
  /** Active conversation threads (last 15) */
  activeThreads: ContextThread[];
  /** Recent context per person (keyed by email) — max 5 chunks each */
  personContext: Record<string, ContextChunk[]>;
  /** Recent context per project (keyed by project name) — max 5 chunks each */
  projectContext: Record<string, ContextChunk[]>;
  /** Recent desktop observer activity (last 24h, max 20 chunks) */
  recentDesktopActivity: ContextChunk[];
  /** Today's rolling day narrative from the observer */
  todayNarrative: DayNarrative | null;
  /** Yesterday's completed day narrative from the observer */
  yesterdayNarrative: DayNarrative | null;
  /** Recent activity sessions from the observer (last 24h) */
  recentSessions: ActivitySession[];
  /** OCR-captured text from recent sessions (last 4h) — document titles, tickets, file names */
  recentOcrContext: OcrContextChunk[];
}

/** Lightweight OCR context extracted from activity sessions */
export interface OcrContextChunk {
  app_name: string;
  app_category: string;
  started_at: string;
  ocr_lines: string[];
  /** Document titles, ticket IDs, and file names extracted from OCR */
  extracted_items: string[];
}

/**
 * Extracts unique people emails from briefing candidates, capped to the top N.
 * Prioritises VIP emails, then falls back to most-frequently mentioned.
 */
function extractTopPeople(
  candidates: Array<{ from_email?: string }>,
  vipEmails: string[],
  max: number
): string[] {
  const frequency = new Map<string, number>();
  for (const c of candidates) {
    if (c.from_email) {
      frequency.set(c.from_email, (frequency.get(c.from_email) ?? 0) + 1);
    }
  }

  // VIPs first (that appear in candidates), then by frequency
  const vipSet = new Set(vipEmails);
  const sorted = [...frequency.entries()]
    .sort((a, b) => {
      const aVip = vipSet.has(a[0]) ? 1 : 0;
      const bVip = vipSet.has(b[0]) ? 1 : 0;
      if (aVip !== bVip) return bVip - aVip;
      return b[1] - a[1];
    })
    .map(([email]) => email);

  return sorted.slice(0, max);
}

/**
 * Fetch all enrichment context in parallel. Times out individual queries
 * after 5 seconds so a slow query doesn't block briefing generation.
 */
export async function fetchEnrichedContext(
  supabase: SupabaseClient,
  userId: string,
  candidates: Array<{ from_email?: string }>,
  vipEmails: string[],
  activeProjects: string[],
  timezone?: string,
): Promise<EnrichedContext> {
  const withTimeout = <T>(promise: Promise<T>, fallback: T, ms = 5000): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
    ]);

  // Yesterday's date in user's timezone
  const today = timezone ? getTodayInTimezone(timezone) : new Date().toISOString().split('T')[0];
  const yesterday = new Date(today + 'T00:00:00Z');
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Top people to fetch context for (max 8)
  const topPeople = extractTopPeople(candidates, vipEmails, 8);

  // Top projects (from onboarding, max 5)
  const topProjects = activeProjects.slice(0, 5);

  // Parallel fetch — each with individual timeout
  const [yesterdaySnapshot, workingPatterns, activeThreads, ...personResults] = await Promise.all([
    withTimeout(getMemorySnapshot(supabase, userId, yesterdayStr), null),
    withTimeout(getWorkingPatterns(supabase, userId), null),
    withTimeout(getActiveContextThreads(supabase, userId, 15), []),
    ...topPeople.map(email =>
      withTimeout(
        getContextChunksByPeople(supabase, userId, email, 5).then(chunks => ({ email, chunks })),
        { email, chunks: [] as ContextChunk[] },
      )
    ),
  ]);

  // Fetch desktop observer chunks (last 24h)
  const desktopChunks = await withTimeout(
    getDesktopObserverChunks(supabase, userId, {
      after: yesterday.toISOString(),
      minImportance: 'background',
      limit: 20,
    }),
    [] as ContextChunk[],
  );

  // Fetch today's + yesterday's day narratives and recent activity sessions (observer-first intelligence)
  // Also fetch last 4h of sessions for OCR context extraction
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  const [todayNarrative, yesterdayNarrative, recentSessions, ocrSessions] = await Promise.all([
    withTimeout(getDayNarrative(supabase, userId, today), null),
    withTimeout(getDayNarrative(supabase, userId, yesterdayStr), null),
    withTimeout(
      getSessionsInRange(supabase, userId, yesterday.toISOString(), undefined, { limit: 50 }),
      [] as ActivitySession[],
    ),
    withTimeout(
      getSessionsInRange(supabase, userId, fourHoursAgo, undefined, { limit: 100 }),
      [] as ActivitySession[],
    ),
  ]);

  // Fetch project context separately (after person results to avoid massive parallel load)
  const projectResults = await Promise.all(
    topProjects.map(project =>
      withTimeout(
        getContextChunksByProject(supabase, userId, project, 5).then(chunks => ({ project, chunks })),
        { project, chunks: [] as ContextChunk[] },
      )
    )
  );

  // Build person context map
  const personContext: Record<string, ContextChunk[]> = {};
  for (const result of personResults as Array<{ email: string; chunks: ContextChunk[] }>) {
    if (result.chunks.length > 0) {
      personContext[result.email] = result.chunks;
    }
  }

  // Build project context map
  const projectContext: Record<string, ContextChunk[]> = {};
  for (const result of projectResults) {
    if (result.chunks.length > 0) {
      projectContext[result.project] = result.chunks;
    }
  }

  // Extract OCR context from recent sessions (last 4h)
  const recentOcrContext = extractOcrContext(ocrSessions);

  return {
    yesterdaySnapshot,
    workingPatterns,
    activeThreads,
    personContext,
    projectContext,
    recentDesktopActivity: desktopChunks,
    todayNarrative,
    yesterdayNarrative,
    recentSessions,
    recentOcrContext,
  };
}

/**
 * Extract OCR lines from recent sessions and identify document titles,
 * ticket IDs, code file names, and other structured items.
 */
function extractOcrContext(sessions: ActivitySession[]): OcrContextChunk[] {
  const chunks: OcrContextChunk[] = [];

  for (const session of sessions) {
    const pd = (session.parsed_data ?? {}) as Record<string, unknown>;
    const ocrLines = pd.ocrLines as string[] | undefined;
    if (!ocrLines || ocrLines.length === 0) continue;

    // Extract structured items from OCR text
    const extractedItems = extractItemsFromOcr(ocrLines);

    chunks.push({
      app_name: session.app_name,
      app_category: session.app_category,
      started_at: session.started_at,
      ocr_lines: ocrLines.slice(0, 20), // Keep top 20 lines for context
      extracted_items: extractedItems,
    });
  }

  return chunks;
}

/** Patterns to identify structured items in OCR text */
const OCR_PATTERNS = {
  // Ticket/issue IDs: PROJ-123, #456, GH-789
  ticket: /\b([A-Z]{2,10}-\d{1,6}|#\d{2,6}|GH-\d+|ISSUE-\d+)\b/g,
  // File names: something.ext
  fileName: /\b[\w-]+\.(ts|tsx|js|jsx|py|go|rs|rb|java|swift|kt|css|scss|html|json|yaml|yml|md|sql|sh|env|toml|xml|csv)\b/gi,
  // Document titles: typically title-cased phrases (3+ words)
  docTitle: /^[A-Z][A-Za-z0-9\s:—–-]{15,80}$/,
  // URLs
  url: /https?:\/\/[^\s<>"{}|\\^`\[\]]{10,}/g,
};

function extractItemsFromOcr(lines: string[]): string[] {
  const items = new Set<string>();

  for (const line of lines) {
    // Tickets
    const tickets = line.match(OCR_PATTERNS.ticket);
    if (tickets) tickets.forEach(t => items.add(`ticket:${t}`));

    // File names
    const files = line.match(OCR_PATTERNS.fileName);
    if (files) files.forEach(f => items.add(`file:${f}`));

    // Document titles (standalone lines that look like headings)
    if (OCR_PATTERNS.docTitle.test(line.trim())) {
      items.add(`title:${line.trim()}`);
    }
  }

  return [...items].slice(0, 30);
}

/**
 * Serialize enriched context into a compact text representation for the AI prompt.
 * Keeps it concise to stay within token limits.
 */
export function serializeEnrichedContext(ctx: EnrichedContext): string {
  const sections: string[] = [];

  // Yesterday's snapshot
  if (ctx.yesterdaySnapshot) {
    const snap = ctx.yesterdaySnapshot;
    const parts: string[] = [];

    if (snap.open_loops.length > 0) {
      parts.push('OPEN LOOPS FROM YESTERDAY:\n' +
        snap.open_loops.map(l => `- ${l.description}`).join('\n'));
    }
    if (snap.key_decisions.length > 0) {
      parts.push('KEY DECISIONS YESTERDAY:\n' +
        snap.key_decisions.map(d => `- ${d.decision} (context: ${d.context})`).join('\n'));
    }
    if (snap.notable_interactions.length > 0) {
      parts.push('NOTABLE INTERACTIONS YESTERDAY:\n' +
        snap.notable_interactions.map(i => `- ${i.person}: ${i.summary}`).join('\n'));
    }
    if (snap.day_narrative) {
      parts.push(`YESTERDAY SUMMARY: ${snap.day_narrative}`);
    }

    if (parts.length > 0) {
      sections.push(parts.join('\n\n'));
    }
  }

  // Yesterday's observer narrative (first-class context block — what the observer saw)
  if (ctx.yesterdayNarrative) {
    const yn = ctx.yesterdayNarrative;
    const parts: string[] = [];
    if (yn.narrative) parts.push(yn.narrative);

    const stats = [
      yn.email_sessions > 0 && `${yn.email_sessions} email sessions`,
      yn.chat_sessions > 0 && `${yn.chat_sessions} chat sessions`,
      yn.code_sessions > 0 && `${yn.code_sessions} coding sessions`,
      yn.meeting_sessions > 0 && `${yn.meeting_sessions} meetings`,
      yn.browsing_sessions > 0 && `${yn.browsing_sessions} browsing sessions`,
    ].filter(Boolean);
    if (stats.length > 0) parts.push(`Activity breakdown: ${stats.join(', ')}`);
    if (yn.total_active_seconds > 0) {
      const hours = Math.floor(yn.total_active_seconds / 3600);
      const mins = Math.round((yn.total_active_seconds % 3600) / 60);
      parts.push(`Total active time: ${hours}h ${mins}m`);
    }
    if (yn.people_seen.length > 0) parts.push(`People interacted with: ${yn.people_seen.slice(0, 10).join(', ')}`);
    if (yn.projects_worked_on.length > 0) parts.push(`Projects touched: ${yn.projects_worked_on.join(', ')}`);

    if (yn.key_events.length > 0) {
      parts.push('Key events:\n' + yn.key_events.map(e => `- [${e.importance}] ${e.event} (${e.time})`).join('\n'));
    }

    sections.push("YESTERDAY'S OBSERVER NARRATIVE (what the desktop observer captured):\n" + parts.join('\n'));
  }

  // Working patterns
  if (ctx.workingPatterns) {
    const wp = ctx.workingPatterns;
    const parts: string[] = [];

    if (wp.typical_start_time && wp.typical_end_time) {
      parts.push(`Work hours: ${wp.typical_start_time} - ${wp.typical_end_time}`);
    }
    if (wp.deep_work_windows.length > 0) {
      const today = new Date().getDay();
      const todayWindows = wp.deep_work_windows.filter(w => w.day === today);
      if (todayWindows.length > 0) {
        parts.push(`Today's deep work: ${todayWindows.map(w => `${w.start}-${w.end}`).join(', ')}`);
      }
    }
    if (wp.top_collaborators.length > 0) {
      parts.push('Top collaborators: ' +
        wp.top_collaborators.slice(0, 5).map(c => `${c.email} (${c.interaction_count} interactions)`).join(', '));
    }
    if (wp.active_projects_ranked.length > 0) {
      parts.push('Active projects by time: ' +
        wp.active_projects_ranked.slice(0, 5).map(p => `${p.project} (${p.trend})`).join(', '));
    }
    if (wp.working_style_summary) {
      parts.push(`Working style: ${wp.working_style_summary}`);
    }

    if (parts.length > 0) {
      sections.push('WORKING PATTERNS:\n' + parts.join('\n'));
    }
  }

  // Active threads
  if (ctx.activeThreads.length > 0) {
    sections.push('ACTIVE CONVERSATION THREADS:\n' +
      ctx.activeThreads.map(t =>
        `- "${t.title}" with ${t.participants.slice(0, 3).join(', ')}${t.participants.length > 3 ? ` +${t.participants.length - 3}` : ''} (${t.chunk_count} messages${t.summary ? `, summary: ${t.summary}` : ''})`
      ).join('\n'));
  }

  // Person context
  const personEntries = Object.entries(ctx.personContext);
  if (personEntries.length > 0) {
    sections.push('RECENT ACTIVITY PER PERSON:\n' +
      personEntries.map(([email, chunks]) =>
        `${email}:\n` + chunks.map(c =>
          `  - [${c.chunk_type}] ${c.content_summary} (${c.importance}, ${new Date(c.occurred_at).toLocaleDateString()})`
        ).join('\n')
      ).join('\n'));
  }

  // Project context
  const projectEntries = Object.entries(ctx.projectContext);
  if (projectEntries.length > 0) {
    sections.push('RECENT ACTIVITY PER PROJECT:\n' +
      projectEntries.map(([project, chunks]) =>
        `${project}:\n` + chunks.map(c =>
          `  - [${c.chunk_type}] ${c.content_summary} (${c.importance}, ${new Date(c.occurred_at).toLocaleDateString()})`
        ).join('\n')
      ).join('\n'));
  }

  // Desktop observer activity (legacy chunks)
  if (ctx.recentDesktopActivity.length > 0) {
    sections.push('RECENT DESKTOP ACTIVITY:\n' +
      ctx.recentDesktopActivity.map(c => {
        const ref = c.source_ref as Record<string, unknown> | null;
        const app = (ref?.app as string) ?? 'Desktop';
        return `- [${app}] ${c.content_summary} (${c.importance}, ${new Date(c.occurred_at).toLocaleDateString()})`;
      }).join('\n'));
  }

  // Today's rolling narrative (observer-first intelligence)
  if (ctx.todayNarrative) {
    const dn = ctx.todayNarrative;
    const parts: string[] = [];
    if (dn.narrative) parts.push(dn.narrative);

    const stats = [
      dn.email_sessions > 0 && `${dn.email_sessions} email sessions`,
      dn.chat_sessions > 0 && `${dn.chat_sessions} chat sessions`,
      dn.code_sessions > 0 && `${dn.code_sessions} coding sessions`,
      dn.meeting_sessions > 0 && `${dn.meeting_sessions} calendar sessions`,
      dn.browsing_sessions > 0 && `${dn.browsing_sessions} browsing sessions`,
    ].filter(Boolean);
    if (stats.length > 0) parts.push(`Activity: ${stats.join(', ')}`);
    if (dn.total_active_seconds > 0) parts.push(`Active time: ${Math.round(dn.total_active_seconds / 60)} minutes`);
    if (dn.people_seen.length > 0) parts.push(`People seen: ${dn.people_seen.slice(0, 10).join(', ')}`);
    if (dn.projects_worked_on.length > 0) parts.push(`Projects: ${dn.projects_worked_on.join(', ')}`);

    if (dn.key_events.length > 0) {
      parts.push('Key events:\n' + dn.key_events.map(e => `- [${e.importance}] ${e.event} (${e.time})`).join('\n'));
    }

    sections.push("TODAY'S NARRATIVE (from desktop observer):\n" + parts.join('\n'));
  }

  // Recent activity sessions (observer-first intelligence)
  if (ctx.recentSessions.length > 0) {
    // Group by category for readability
    const byCategory = new Map<string, typeof ctx.recentSessions>();
    for (const s of ctx.recentSessions) {
      const cat = s.app_category;
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(s);
    }

    const sessionLines: string[] = [];
    for (const [category, sessions] of byCategory) {
      const summaries = sessions
        .filter(s => s.summary)
        .slice(0, 5)
        .map(s => {
          const time = new Date(s.started_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          return `  - ${time}: ${s.summary}${s.people.length > 0 ? ` (with ${s.people.slice(0, 3).join(', ')})` : ''}`;
        });
      if (summaries.length > 0) {
        sessionLines.push(`${category}:\n${summaries.join('\n')}`);
      }
    }

    if (sessionLines.length > 0) {
      sections.push('RECENT ACTIVITY SESSIONS:\n' + sessionLines.join('\n'));
    }
  }

  // OCR-extracted context (document titles, tickets, file names from last 4h)
  if (ctx.recentOcrContext.length > 0) {
    const allExtracted = ctx.recentOcrContext.flatMap(c => c.extracted_items);
    const uniqueExtracted = [...new Set(allExtracted)];

    if (uniqueExtracted.length > 0) {
      const byType = {
        tickets: uniqueExtracted.filter(i => i.startsWith('ticket:')).map(i => i.slice(7)),
        files: uniqueExtracted.filter(i => i.startsWith('file:')).map(i => i.slice(5)),
        titles: uniqueExtracted.filter(i => i.startsWith('title:')).map(i => i.slice(6)),
      };

      const ocrParts: string[] = [];
      if (byType.tickets.length > 0) ocrParts.push(`Tickets/Issues: ${byType.tickets.join(', ')}`);
      if (byType.files.length > 0) ocrParts.push(`Files seen: ${byType.files.join(', ')}`);
      if (byType.titles.length > 0) ocrParts.push(`Documents: ${byType.titles.join(' | ')}`);

      // Also include a sample of raw OCR lines for additional context
      const sampleLines = ctx.recentOcrContext
        .flatMap(c => c.ocr_lines)
        .filter(l => l.length > 15 && l.length < 200)
        .slice(0, 10);
      if (sampleLines.length > 0) {
        ocrParts.push('Recent screen text:\n' + sampleLines.map(l => `  "${l}"`).join('\n'));
      }

      sections.push('OCR SCREEN CONTEXT (last 4h):\n' + ocrParts.join('\n'));
    }
  }

  return sections.join('\n\n---\n\n');
}
