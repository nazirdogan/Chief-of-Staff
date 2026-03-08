import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/client';
import { withAuth } from '@/lib/middleware/withAuth';
import type { AuthenticatedRequest } from '@/lib/middleware/withAuth';

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const userId = req.user.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any;

  const { data, error } = await db
    .from('backfill_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return NextResponse.json({ status: 'none' });
  }

  return NextResponse.json({
    jobId: data.id,
    status: data.status,
    currentPhase: data.current_phase,
    phaseStatus: data.phase_status,
    progressPct: data.progress_pct,
    phaseDetails: data.phase_details,
    createdAt: data.created_at,
    completedAt: data.completed_at,
  });
});
