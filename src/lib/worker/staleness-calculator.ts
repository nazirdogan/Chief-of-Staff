/**
 * Staleness Calculator — determines which jobs need to run on app launch.
 *
 * Queries heartbeat_runs for last completion times, compares against
 * each job's schedule, and produces a prioritized list of stale jobs.
 */

import { createServiceClient } from '@/lib/db/client';
import { JOB_REGISTRY, type JobDefinition } from './job-registry';

export type GapCategory = 'short' | 'medium' | 'long';

export interface StaleJob {
  job: JobDefinition;
  lastRunAt: Date | null;
  gapMs: number;
  /** Number of missed scheduled runs (collapsed to 1 for collapsible jobs) */
  runsNeeded: number;
}

export interface StalenessReport {
  gapDurationMs: number;
  gapCategory: GapCategory;
  staleJobs: StaleJob[];
  totalEstimatedMs: number;
  connectedProviders: Set<string>;
}

const TWO_HOURS = 2 * 60 * 60_000;
const TWENTY_FOUR_HOURS = 24 * 60 * 60_000;

function categorizeGap(gapMs: number): GapCategory {
  if (gapMs < TWO_HOURS) return 'short';
  if (gapMs < TWENTY_FOUR_HOURS) return 'medium';
  return 'long';
}

/**
 * Calculate which jobs are stale and need to run.
 *
 * @param userId - The authenticated user
 * @param appClosedAt - Optional timestamp from localStorage for faster calculation
 */
export async function calculateStaleness(
  userId: string,
  appClosedAt?: number,
): Promise<StalenessReport> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any;

  // 1. Get last run times for all jobs
  const { data: lastRuns } = await db
    .from('heartbeat_runs')
    .select('job_name, completed_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });

  // Build a map of job_name -> last completed time
  const lastRunMap = new Map<string, Date>();
  for (const row of (lastRuns ?? []) as Array<{ job_name: string; completed_at: string }>) {
    if (!lastRunMap.has(row.job_name)) {
      lastRunMap.set(row.job_name, new Date(row.completed_at));
    }
  }

  // For jobs that don't log to heartbeat_runs (operations, reflections, memory),
  // check catch_up_sessions job_details as a fallback
  const { data: lastSession } = await db
    .from('catch_up_sessions')
    .select('job_details, completed_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  if (lastSession?.job_details) {
    for (const detail of lastSession.job_details as Array<{ jobId: string; status: string; completedAt?: string }>) {
      if (detail.status === 'completed' && detail.completedAt && !lastRunMap.has(detail.jobId)) {
        lastRunMap.set(detail.jobId, new Date(detail.completedAt));
      }
    }
  }

  // 2. Get connected integrations for this user
  const { data: integrations } = await db
    .from('user_integrations')
    .select('provider')
    .eq('user_id', userId)
    .eq('status', 'connected');

  const connectedProviders = new Set<string>(
    (integrations ?? []).map((i: { provider: string }) => i.provider),
  );

  // 3. Check if user has operations enabled
  const { data: opsConfig } = await db
    .from('user_operations_config')
    .select('overnight_enabled')
    .eq('user_id', userId)
    .single();

  const overnightEnabled = opsConfig?.overnight_enabled ?? false;

  // 4. Calculate overall gap — use the most recent job run, or appClosedAt
  const now = Date.now();
  let maxGap = 0;

  if (appClosedAt) {
    maxGap = now - appClosedAt;
  }

  for (const [, lastRun] of lastRunMap) {
    const gap = now - lastRun.getTime();
    if (gap > maxGap) maxGap = gap;
  }

  // If no runs at all and no appClosedAt, this is a first launch — defer to cold-start
  if (maxGap === 0 && lastRunMap.size === 0) {
    return {
      gapDurationMs: 0,
      gapCategory: 'short',
      staleJobs: [],
      totalEstimatedMs: 0,
      connectedProviders,
    };
  }

  const gapCategory = categorizeGap(maxGap);

  // 5. Determine which jobs are stale
  const staleJobs: StaleJob[] = [];

  for (const job of JOB_REGISTRY) {
    // Skip jobs that require an integration the user doesn't have
    if (job.requiresIntegration && job.provider && !connectedProviders.has(job.provider)) {
      continue;
    }

    // Skip operations jobs if overnight not enabled
    if (job.category === 'operations' && !overnightEnabled) {
      continue;
    }

    // Skip onboarding jobs — handled separately
    if (job.category === 'onboarding') {
      continue;
    }

    // For short gaps, only run P1-P2
    if (gapCategory === 'short' && job.priority > 2) {
      continue;
    }

    // For medium gaps, queue P4-P5 but still include them
    // (the catch-up queue handles phasing)

    const lastRun = lastRunMap.get(job.id) ?? null;
    const gapMs = lastRun ? now - lastRun.getTime() : maxGap;

    // Skip if the gap is less than the job's minimum gap
    if (gapMs < job.minGapMs) {
      continue;
    }

    // Calculate runs needed
    let runsNeeded = 1;
    if (!job.collapsible && job.intervalMs) {
      runsNeeded = Math.min(Math.floor(gapMs / job.intervalMs), 7); // cap at 7
    }

    staleJobs.push({
      job,
      lastRunAt: lastRun,
      gapMs,
      runsNeeded,
    });
  }

  // Sort by priority, then by gap size (most stale first)
  staleJobs.sort((a, b) => {
    if (a.job.priority !== b.job.priority) return a.job.priority - b.job.priority;
    return b.gapMs - a.gapMs;
  });

  const totalEstimatedMs = staleJobs.reduce(
    (sum, s) => sum + s.job.estimatedDurationMs * s.runsNeeded,
    0,
  );

  return {
    gapDurationMs: maxGap,
    gapCategory,
    staleJobs,
    totalEstimatedMs,
    connectedProviders,
  };
}
