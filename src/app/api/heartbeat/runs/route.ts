import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import type { HeartbeatRun } from '@/lib/db/types';

export const GET = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 100);
  const jobName = url.searchParams.get('job_name');

  const supabase = createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('heartbeat_runs')
    .select('*')
    .eq('user_id', req.user.id)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (jobName) {
    query = query.eq('job_name', jobName);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch heartbeat runs', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: (data ?? []) as HeartbeatRun[] });
  } catch (error) {
    return handleApiError(error);
  }
}));
