import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { createServiceClient } from '@/lib/db/client';
import { processSnapshots } from '@/lib/desktop-observer/session-manager';
import { sanitiseWindowTitle } from '@/lib/ai/safety/sanitise';
import type { DesktopContextSnapshot } from '@/lib/desktop-observer/parsers/types';

/**
 * POST /api/desktop-observer/ingest
 *
 * Receives batched desktop context snapshots from the Tauri desktop observer.
 * Routes through the session manager (app-aware parsing, session tracking,
 * transition logging) instead of the old flat context pipeline.
 */
export const POST = withAuth(
  withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
    try {
      const { contexts } = await req.json();

      if (!Array.isArray(contexts) || contexts.length === 0) {
        return NextResponse.json(
          { error: 'No contexts provided', code: 'INVALID_INPUT' },
          { status: 400 }
        );
      }

      // Limit batch size to prevent abuse
      const supabase = createServiceClient();
      const userId = req.user.id;

      // Fetch blocked apps from user profile to filter out blocked contexts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profileData } = await (supabase as any)
        .from('profiles')
        .select('blocked_apps')
        .eq('id', userId)
        .single();
      const blockedApps: string[] = profileData?.blocked_apps ?? [];

      // Filter out snapshots from blocked apps before processing
      const filtered = contexts.slice(0, 50).filter(
        (ctx: DesktopContextSnapshot) =>
          !blockedApps.some(
            (blocked) =>
              ctx.active_app.toLowerCase().includes(blocked.toLowerCase())
          )
      ) as DesktopContextSnapshot[];

      // Strip clipboard content and sanitise window titles at API boundary
      const sanitisedContexts = filtered.map((ctx: DesktopContextSnapshot) => ({
        ...ctx,
        clipboard_text: '',
        window_title: sanitiseWindowTitle(ctx.window_title ?? ''),
      }));

      // Process through the session manager (app-aware parsing + session tracking)
      const result = await processSnapshots(supabase, userId, sanitisedContexts);

      return NextResponse.json({
        sessionsProcessed: result.sessionsProcessed,
        transitionsLogged: result.transitionsLogged,
      });
    } catch (error) {
      console.error('[desktop-observer/ingest] Error:', error);
      return NextResponse.json(
        { error: 'Failed to ingest desktop context', code: 'INGEST_ERROR' },
        { status: 500 }
      );
    }
  })
);
