import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import type { AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { bootWorker } from '@/lib/worker/boot';

/**
 * POST /api/worker/boot
 *
 * Boots the local worker system (catch-up + scheduler) for the authenticated user.
 * Runs server-side to avoid bundling server-only modules in the client.
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const userId = req.user.id;
  const { appClosedAt } = (await req.json().catch(() => ({}))) as {
    appClosedAt?: number;
  };

  try {
    const finalState = await bootWorker(userId, undefined, appClosedAt);
    return NextResponse.json({ ok: true, state: finalState });
  } catch (err) {
    console.error('[Worker Boot] Failed:', err);
    return NextResponse.json(
      { error: 'Worker boot failed' },
      { status: 500 },
    );
  }
});
