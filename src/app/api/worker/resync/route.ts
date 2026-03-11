import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import type { AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { bootWorker, resetCircuitForJobs } from '@/lib/worker/boot';

/**
 * POST /api/worker/resync
 *
 * Manually re-syncs: resets circuit breakers and re-runs the boot sequence
 * (staleness check → catch-up → restart scheduler).
 * Rate limited: 3 req/min to prevent abuse.
 *
 * Body: { jobIds?: string[] } — optional: only reset specific job circuits
 */
export const POST = withAuth(withRateLimit(3, '1 m', async (req: AuthenticatedRequest) => {
  const userId = req.user.id;
  const { jobIds } = (await req.json().catch(() => ({}))) as {
    jobIds?: string[];
  };

  try {
    // Reset circuit breakers
    resetCircuitForJobs(jobIds);

    // Re-boot worker from scratch
    const finalState = await bootWorker(userId);

    return NextResponse.json({ ok: true, state: finalState });
  } catch (err) {
    console.error('[Worker Resync] Failed:', err);
    return NextResponse.json(
      { error: 'Resync failed' },
      { status: 500 },
    );
  }
}));
