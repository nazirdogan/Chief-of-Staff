/**
 * Worker Boot — orchestrates the full lifecycle:
 * 1. Calculate staleness
 * 2. Run catch-up queue
 * 3. Start steady-state scheduler
 *
 * Runs SERVER-SIDE only (called via API routes, never imported in client components).
 */

import { calculateStaleness } from './staleness-calculator';
import { CatchUpQueue, type CatchUpState } from './catch-up-queue';
import { LocalScheduler } from './local-scheduler';
import { JOB_REGISTRY } from './job-registry';
import {
  resetAll as resetCircuitBreaker,
  resetJob as resetCircuit,
  getOpenCircuits,
} from './circuit-breaker';
import type { StaleWarning } from './circuit-breaker';

export type { StaleWarning };

let activeQueue: CatchUpQueue | null = null;
let activeScheduler: LocalScheduler | null = null;
let lastCatchUpState: CatchUpState | null = null;

export type BootStateListener = (state: CatchUpState) => void;

/**
 * Boot the worker system. Call once after authentication.
 *
 * @param userId - The authenticated user's ID
 * @param onStateChange - Optional callback for state updates
 * @param appClosedAt - Timestamp (ms) when the app was last closed (from client localStorage)
 * @returns The final catch-up state
 */
export async function bootWorker(
  userId: string,
  onStateChange?: BootStateListener,
  appClosedAt?: number,
): Promise<CatchUpState> {
  // Stop any existing scheduler
  if (activeScheduler) {
    activeScheduler.stop();
    activeScheduler = null;
  }

  // Cancel any existing catch-up
  if (activeQueue) {
    activeQueue.cancel();
    activeQueue = null;
  }

  // 1. Calculate staleness
  const report = await calculateStaleness(userId, appClosedAt);

  console.log(
    `[Worker] Staleness: ${report.gapCategory} gap (${Math.round(report.gapDurationMs / 60_000)}min), ` +
    `${report.staleJobs.length} stale jobs, ~${Math.round(report.totalEstimatedMs / 1000)}s estimated`,
  );

  // 2. Run catch-up if needed
  activeQueue = new CatchUpQueue(userId);

  const stateListener = (state: CatchUpState) => {
    lastCatchUpState = state;
    onStateChange?.(state);
  };

  activeQueue.subscribe(stateListener);

  const finalState = await activeQueue.run(report);
  lastCatchUpState = finalState;
  activeQueue = null;

  // 3. Start steady-state scheduler
  activeScheduler = new LocalScheduler(userId, report.connectedProviders);
  activeScheduler.start();

  return finalState;
}

/** Stop the worker system (e.g., on sign out) */
export function stopWorker(): void {
  if (activeQueue) {
    activeQueue.cancel();
    activeQueue = null;
  }
  if (activeScheduler) {
    activeScheduler.stop();
    activeScheduler = null;
  }
  resetCircuitBreaker();
  lastCatchUpState = null;
}

/** Get the current catch-up state for polling */
export function getWorkerState(): CatchUpState | null {
  return lastCatchUpState;
}

/** Get the active scheduler instance (for updating providers, etc.) */
export function getScheduler(): LocalScheduler | null {
  return activeScheduler;
}

/**
 * Compute stale data warnings for P1/P2 jobs.
 * A job is "stale" if its last success is older than 2x its interval.
 */
export function getStaleWarnings(): StaleWarning[] {
  const warnings: StaleWarning[] = [];

  if (!activeScheduler) return warnings;

  const jobStatuses = activeScheduler.getJobStatuses();
  const openCircuits = getOpenCircuits();
  const openCircuitIds = new Set(openCircuits.map((c) => c.jobId));
  const now = Date.now();

  for (const job of JOB_REGISTRY) {
    // Only warn for P1/P2 jobs (email, calendar, slack, etc.)
    if (job.priority > 2) continue;
    if (!job.intervalMs) continue;

    const status = jobStatuses.get(job.id);
    if (!status) continue;

    const lastSuccess = status.lastSuccessAt;
    const threshold = job.intervalMs * 2;
    const isCircuitOpen = openCircuitIds.has(job.id);

    if (isCircuitOpen || (lastSuccess && now - lastSuccess > threshold)) {
      warnings.push({
        jobId: job.id,
        label: job.label,
        priority: job.priority,
        lastSuccessAt: lastSuccess ? new Date(lastSuccess).toISOString() : null,
        expectedIntervalMs: job.intervalMs,
        overdueMs: lastSuccess ? now - lastSuccess - job.intervalMs : 0,
        circuitOpen: isCircuitOpen,
      });
    }
  }

  return warnings;
}

/** Reset circuit breaker for specific jobs and re-boot */
export function resetCircuitForJobs(jobIds?: string[]): void {
  if (jobIds?.length) {
    for (const id of jobIds) resetCircuit(id);
  } else {
    resetCircuitBreaker();
  }
}
