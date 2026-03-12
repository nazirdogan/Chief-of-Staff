/**
 * Session Summariser — generates specific, file-named Haiku summaries for
 * closed activity sessions. Feeds the narrative builder with pre-interpreted
 * context so it can name actual files, commands, and topics instead of
 * producing vague "worked on project" descriptions.
 *
 * Three entry points:
 * - summariseSession()         — low-level, called with a full ActivitySession
 * - summariseClosedSession()   — fire-and-forget wrapper called at session close
 * - sweepUnsummarisedSessions() — background sweep for back-filling existing sessions
 */

import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { createServiceClient } from '@/lib/db/client';
import { updateActivitySession } from '@/lib/db/queries/activity-sessions';
import type { ActivitySession } from '@/lib/context/types';
import type { ActiveSessionState } from './session-manager';

const anthropic = new Anthropic();

// Minimum session duration (minutes) before we bother summarising
const MIN_DURATION_MIN = 3;

/**
 * Generate a specific 1-3 sentence summary for a single activity session.
 * Names actual files, functions, commands, topics, and people.
 * Returns null if the session is too short or content is too sparse.
 */
export async function summariseSession(
  session: ActivitySession
): Promise<string | null> {
  const durationMin = session.ended_at
    ? Math.round(
        (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000
      )
    : 0;

  if (durationMin < MIN_DURATION_MIN) return null;

  const pd = session.parsed_data as Record<string, unknown>;

  // Build context lines — only include non-empty fields
  const lines: string[] = [
    `App: ${session.app_name} (${session.app_category})`,
    `Duration: ${durationMin} minutes`,
    `Time: ${new Date(session.started_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`,
  ];

  // Files worked on (accumulated list) or fallback to single fileName
  const filesWorkedOn = Array.isArray(pd.filesWorkedOn)
    ? (pd.filesWorkedOn as string[])
    : pd.fileName
    ? [String(pd.fileName)]
    : [];
  if (filesWorkedOn.length > 0) {
    lines.push(`Files: ${filesWorkedOn.join(', ')}`);
  }

  if (Array.isArray(pd.functions) && (pd.functions as string[]).length > 0) {
    lines.push(`Functions/Classes: ${(pd.functions as string[]).slice(0, 8).join(', ')}`);
  }

  if (typeof pd.codeSnippet === 'string' && pd.codeSnippet.length > 20) {
    lines.push(`Code preview: ${pd.codeSnippet.slice(0, 500)}`);
  }

  if (Array.isArray(pd.recentCommands) && (pd.recentCommands as string[]).length > 0) {
    lines.push(`Terminal commands: ${(pd.recentCommands as string[]).slice(-10).join(' | ')}`);
  }

  if (pd.conversationPartner) {
    lines.push(`Conversation partner: ${String(pd.conversationPartner)}`);
  }

  if (Array.isArray(pd.messages) && (pd.messages as unknown[]).length > 0) {
    const msgs = (pd.messages as unknown[]).slice(-15).map((m) => {
      const msg = m as Record<string, unknown>;
      const sender = String(msg.sender ?? msg.from ?? '');
      const text = String(msg.text ?? msg.content ?? '').slice(0, 300);
      return sender ? `${sender}: ${text}` : text;
    });
    lines.push(`Messages:\n${msgs.join('\n')}`);
  }

  if (pd.subject) lines.push(`Subject: ${String(pd.subject)}`);
  if (pd.pageTitle) lines.push(`Page: ${String(pd.pageTitle)}`);

  if (session.people.length > 0) {
    lines.push(`People: ${session.people.slice(0, 8).join(', ')}`);
  }

  if (Array.isArray(session.action_items) && session.action_items.length > 0) {
    const items = session.action_items.slice(0, 5).map((a) => a.text);
    lines.push(`Action items: ${items.join('; ')}`);
  }

  // OCR — always include, not just as fallback
  if (Array.isArray(pd.ocrLines) && (pd.ocrLines as string[]).length > 0) {
    const sample = (pd.ocrLines as string[]).slice(0, 40).join('\n');
    lines.push(`Screen content (OCR):\n${sample.slice(0, 1200)}`);
  }

  const context = lines.join('\n');

  // Skip if there's genuinely nothing to summarise
  const hasContent =
    filesWorkedOn.length > 0 ||
    pd.conversationPartner ||
    pd.subject ||
    pd.pageTitle ||
    (Array.isArray(pd.ocrLines) && (pd.ocrLines as string[]).length > 3);

  if (!hasContent) return null;

  try {
    const response = await anthropic.messages.create({
      model: AI_MODELS.FAST,
      max_tokens: 250,
      messages: [
        {
          role: 'user',
          content: `You are summarising a user's activity session. Write 1-3 specific sentences in second person describing exactly what the user did. Name actual files, functions, commands, topics, and people. Never say "worked on project" — say what specifically was done. Max 150 words. Plain text only, no bullet points.

SESSION DATA:
${context}`,
        },
      ],
    });

    const textBlock = response.content.find((c) => c.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      return textBlock.text.trim() || null;
    }
    return null;
  } catch (err) {
    console.error('[session-summariser] AI call failed:', err instanceof Error ? err.message : 'unknown');
    return null;
  }
}

/**
 * Fire-and-forget wrapper called at session close.
 * Reconstructs an ActivitySession from in-memory state, calls summariseSession,
 * and writes the result back to the database.
 *
 * For communication sessions (email, chat, slack), also runs a lightweight
 * commitment extraction pass to flag promises made in real-time.
 */
export async function summariseClosedSession(
  sessionId: string,
  state: ActiveSessionState,
  userId?: string,
): Promise<void> {
  // Reconstruct a minimal ActivitySession from in-memory state
  const session: ActivitySession = {
    id: sessionId,
    user_id: userId ?? '',
    app_name: state.appName,
    app_category: state.appCategory as ActivitySession['app_category'],
    window_title: state.windowTitle,
    url: state.url,
    started_at: new Date(state.lastSnapshotAt - state.snapshotCount * 30_000).toISOString(), // rough estimate
    ended_at: new Date(state.lastSnapshotAt).toISOString(),
    snapshot_count: state.snapshotCount,
    summary: null,
    parsed_data: state.mergedParsedData,
    people: [...state.accumulatedPeople],
    projects: [...state.accumulatedProjects],
    topics: [...state.accumulatedTopics],
    action_items: state.accumulatedActionItems,
    importance: 'background',
    importance_score: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const summary = await summariseSession(session);
  if (!summary) return;

  const supabase = createServiceClient();
  await updateActivitySession(supabase, sessionId, { summary });

  // Task extraction for communication sessions
  if (userId && isCommunicationCategory(state.appCategory)) {
    try {
      await extractCommitmentsFromSession(userId, sessionId, state);
    } catch (err) {
      console.error('[session-summariser] Task extraction failed:', err instanceof Error ? err.message : 'unknown');
    }
  }
}

/** Check if an app category involves outbound communication */
function isCommunicationCategory(category: string): boolean {
  const communicationCategories = ['email', 'chat', 'slack', 'messaging', 'communication'];
  return communicationCategories.includes(category.toLowerCase());
}

/** Extract tasks from communication session content */
async function extractCommitmentsFromSession(
  userId: string,
  sessionId: string,
  state: ActiveSessionState,
): Promise<void> {
  const pd = state.mergedParsedData as Record<string, unknown>;

  // Build outbound message text from accumulated messages
  const messages = Array.isArray(pd.messages) ? (pd.messages as unknown[]) : [];
  const outboundText = messages
    .map((m) => {
      const msg = m as Record<string, unknown>;
      return String(msg.text ?? msg.content ?? '');
    })
    .filter(t => t.length > 10)
    .join('\n');

  if (outboundText.length < 20) return;

  const conversationPartner = pd.conversationPartner
    ? String(pd.conversationPartner)
    : (state.accumulatedPeople.size > 0 ? [...state.accumulatedPeople][0] : null);

  const { extractTasksFromDesktopSession } = await import(
    '@/lib/ai/agents/task'
  );

  await extractTasksFromDesktopSession(
    userId,
    sessionId,
    state.appName,
    conversationPartner,
    outboundText,
  );
}

/**
 * Background sweep — summarises recent unsummarised sessions for a user.
 * Designed to be run every 15 minutes to back-fill sessions that were
 * closed before the summariser was deployed or missed due to errors.
 * Returns the number of sessions summarised.
 */
export async function sweepUnsummarisedSessions(userId: string): Promise<number> {
  const supabase = createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sessions } = await (supabase as any)
    .from('activity_sessions')
    .select('*')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .is('summary', null)
    .gt('snapshot_count', 3)
    .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('started_at', { ascending: false })
    .limit(20);

  if (!sessions || sessions.length === 0) return 0;

  let count = 0;
  for (const session of sessions as ActivitySession[]) {
    const summary = await summariseSession(session);
    if (summary) {
      await updateActivitySession(supabase, session.id, { summary });
      count++;
    }
  }

  return count;
}
