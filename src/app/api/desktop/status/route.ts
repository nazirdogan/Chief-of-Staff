import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { createServiceClient } from '@/lib/db/client';

/**
 * GET /api/desktop/status
 *
 * Returns the desktop app status for the authenticated user.
 * Used by AI tools to provide factual diagnostics instead of guessing.
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session } = await (supabase as any)
      .from('desktop_sessions')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (!session) {
      return NextResponse.json({
        desktop_connected: false,
        observer_running: false,
        last_seen_at: null,
        observation_count: 0,
      });
    }

    // Consider desktop "connected" if last heartbeat was within 2 minutes
    const lastSeen = new Date(session.last_seen_at).getTime();
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;

    return NextResponse.json({
      desktop_connected: lastSeen > twoMinutesAgo,
      observer_running: session.observer_running,
      last_seen_at: session.last_seen_at,
      observation_count: session.observation_count,
      app_version: session.app_version,
    });
  } catch (error) {
    console.error('[desktop/status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get desktop status', code: 'STATUS_ERROR' },
      { status: 500 }
    );
  }
});
