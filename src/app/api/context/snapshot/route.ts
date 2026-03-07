import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { getMemorySnapshot, getRecentMemorySnapshots } from '@/lib/db/queries/context';

export const GET = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();
    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    const days = url.searchParams.get('days');

    if (days) {
      const snapshots = await getRecentMemorySnapshots(
        supabase,
        req.user.id,
        parseInt(days)
      );
      return NextResponse.json({ snapshots });
    }

    const targetDate = date ?? new Date().toISOString().split('T')[0];
    const snapshot = await getMemorySnapshot(supabase, req.user.id, targetDate);

    if (!snapshot) {
      return NextResponse.json(
        { error: `No snapshot available for ${targetDate}`, code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(snapshot);
  } catch (error) {
    return handleApiError(error);
  }
}));
