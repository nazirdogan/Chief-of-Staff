import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import type { AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { getWorkerState, getStaleWarnings } from '@/lib/worker/boot';

/**
 * GET /api/worker/status
 *
 * Returns the current catch-up state and stale data warnings.
 */
export const GET = withAuth(async (_req: AuthenticatedRequest) => {
  const state = getWorkerState();
  const staleWarnings = getStaleWarnings();
  return NextResponse.json({ state, staleWarnings });
});
