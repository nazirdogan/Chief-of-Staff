import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/client';
import { withAuth } from '@/lib/middleware/withAuth';
import type { AuthenticatedRequest } from '@/lib/middleware/withAuth';

/**
 * POST /api/backfill/complete
 *
 * Force-completes a stalled backfill job so the user isn't stuck.
 * The background job may still be running — this just unblocks the UI.
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const userId = req.user.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any;

  const { error } = await db
    .from('backfill_jobs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .in('status', ['pending', 'running']);

  if (error) {
    return NextResponse.json({ error: 'Failed to complete backfill' }, { status: 500 });
  }

  return NextResponse.json({ status: 'completed' });
});
