import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { createServiceClient } from '@/lib/db/client';

/**
 * POST /api/desktop/heartbeat
 *
 * Called every 60 seconds by the desktop app to report that it's alive
 * and the observer status. Upserts into the desktop_sessions table.
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const {
      observer_running = false,
      observation_count = 0,
      app_version,
    } = body as {
      observer_running?: boolean;
      observation_count?: number;
      app_version?: string;
    };

    const supabase = createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('desktop_sessions')
      .upsert(
        {
          user_id: req.user.id,
          last_seen_at: new Date().toISOString(),
          observer_running,
          observation_count,
          app_version: app_version ?? null,
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('[desktop/heartbeat] Upsert error:', error);
      return NextResponse.json(
        { error: 'Failed to record heartbeat', code: 'HEARTBEAT_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[desktop/heartbeat] Error:', error);
    return NextResponse.json(
      { error: 'Failed to record heartbeat', code: 'HEARTBEAT_ERROR' },
      { status: 500 }
    );
  }
});
