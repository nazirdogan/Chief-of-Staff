import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { createServiceClient } from '@/lib/db/client';
import { getActiveSession } from '@/lib/db/queries/activity-sessions';
import type { ActivitySession } from '@/lib/context/types';

/**
 * GET /api/desktop-observer/snapshot/current
 *
 * Returns the live current screen state — active app, window title, visible text,
 * OCR lines, browser URL — from the most recent / currently-active session.
 *
 * Used by the "What's on my screen?" chat skill to answer screen_context_query
 * intents without relying on stored session summaries.
 */
export const GET = withAuth(
  withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
    try {
      const userId = req.user.id;
      const supabase = createServiceClient();

      // 1. Try to get the currently active (not yet ended) session
      const activeSession = await getActiveSession(supabase, userId);

      // 2. If no active session, fall back to the most recent ended session (last 5 min)
      let currentSession: ActivitySession | null = activeSession;
      if (!currentSession) {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from('activity_sessions')
          .select('*')
          .eq('user_id', userId)
          .gte('ended_at', fiveMinAgo)
          .order('ended_at', { ascending: false })
          .limit(1)
          .single();
        currentSession = data ?? null;
      }

      if (!currentSession) {
        return NextResponse.json({
          available: false,
          message: 'No recent screen activity. Is the desktop observer running?',
        });
      }

      const pd = (currentSession.parsed_data ?? {}) as Record<string, unknown>;

      // Build a rich snapshot from session data + parsed_data
      const snapshot = {
        available: true,
        captured_at: currentSession.ended_at ?? currentSession.started_at,
        is_live: !currentSession.ended_at,
        app: {
          name: currentSession.app_name,
          category: currentSession.app_category,
          window_title: currentSession.window_title,
          url: currentSession.url ?? (pd.url as string | undefined) ?? null,
        },
        content: {
          // Browser-specific
          page_title: pd.pageTitle ?? null,
          domain: pd.domain ?? null,
          content_type: pd.contentType ?? null,
          key_content: pd.keyContent ?? null,
          page_headings: pd.pageHeadings ?? null,
          embedded_links: pd.embeddedLinks ?? null,
          // Code-specific
          file_name: pd.fileName ?? null,
          project_name: pd.projectName ?? null,
          language: pd.language ?? null,
          files_worked_on: pd.filesWorkedOn ?? null,
          code_snippet: pd.codeSnippet ?? null,
          functions: pd.functions ?? null,
          // Email-specific
          email_subject: pd.subject ?? null,
          email_from: pd.from ?? null,
          email_body_preview: pd.bodyPreview ?? null,
          // Chat-specific
          conversation_partner: pd.conversationPartner ?? null,
          platform: pd.platform ?? null,
          recent_messages: Array.isArray(pd.messages)
            ? (pd.messages as unknown[]).slice(-10)
            : null,
          // Terminal-specific
          current_directory: pd.currentDirectory ?? null,
          recent_commands: pd.recentCommands ?? null,
          // OCR text (accumulated across session)
          ocr_lines: Array.isArray(pd.ocrLines) ? pd.ocrLines : null,
        },
        context: {
          people: currentSession.people,
          projects: currentSession.projects,
          topics: currentSession.topics ?? [],
          summary: currentSession.summary,
          importance: currentSession.importance,
          session_started: currentSession.started_at,
          snapshot_count: currentSession.snapshot_count,
        },
      };

      return NextResponse.json(snapshot);
    } catch (error) {
      console.error('[desktop-observer/snapshot/current] Error:', error);
      return NextResponse.json(
        { error: 'Failed to get current snapshot', code: 'SNAPSHOT_ERROR' },
        { status: 500 }
      );
    }
  })
);
