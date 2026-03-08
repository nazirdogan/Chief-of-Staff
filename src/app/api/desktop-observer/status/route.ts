import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { createServiceClient } from '@/lib/db/client';

/**
 * GET /api/desktop-observer/status
 *
 * Returns the desktop observer status for the current user,
 * including how many context chunks have been captured and the
 * most recent observation.
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();

    // Count desktop observation chunks for this user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
      .from('context_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('provider', 'desktop_observer');

    // Get the most recent chunk
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: latest } = await (supabase as any)
      .from('context_chunks')
      .select('title, content_summary, occurred_at, source_ref')
      .eq('user_id', req.user.id)
      .eq('provider', 'desktop_observer')
      .order('occurred_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      total_observations: count ?? 0,
      latest_observation: latest ?? null,
    });
  } catch (error) {
    console.error('[desktop-observer/status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get observer status', code: 'STATUS_ERROR' },
      { status: 500 }
    );
  }
});
