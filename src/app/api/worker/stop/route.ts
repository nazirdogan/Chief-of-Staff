import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import type { AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { stopWorker } from '@/lib/worker/boot';

/**
 * POST /api/worker/stop
 *
 * Stops the local worker system for the authenticated user.
 */
export const POST = withAuth(async (_req: AuthenticatedRequest) => {
  stopWorker();
  return NextResponse.json({ ok: true });
});
