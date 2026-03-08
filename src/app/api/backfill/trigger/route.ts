import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/client';
import { withAuth } from '@/lib/middleware/withAuth';
import type { AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { tasks } from '@trigger.dev/sdk/v3';

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const userId = req.user.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any;

  // Check if a backfill job already exists for this user
  const { data: existing } = await db
    .from('backfill_jobs')
    .select('id, status')
    .eq('user_id', userId)
    .in('status', ['pending', 'running'])
    .single();

  if (existing) {
    return NextResponse.json({
      jobId: existing.id,
      status: existing.status,
      message: 'Backfill already in progress',
    });
  }

  // Create the backfill job record
  const { data: job, error } = await db
    .from('backfill_jobs')
    .insert({
      user_id: userId,
      status: 'pending',
      current_phase: 'email_backfill',
      phase_status: 'pending',
      progress_pct: 0,
    })
    .select('id')
    .single();

  if (error || !job) {
    return NextResponse.json(
      { error: 'Failed to create backfill job' },
      { status: 500 },
    );
  }

  // Trigger the background task
  await tasks.trigger('cold-start-backfill', {
    userId,
    jobId: job.id,
  });

  return NextResponse.json({ jobId: job.id, status: 'pending' });
});
