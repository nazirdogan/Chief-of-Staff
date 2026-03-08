/**
 * Circuit Breaker — tracks per-job failure counts and prevents
 * hammering failing integrations. Also provides retry-with-backoff.
 *
 * States:
 *  - closed:    normal operation, job runs as scheduled
 *  - open:      job has failed >= FAILURE_THRESHOLD times, paused for COOLDOWN_MS
 *  - half-open: cooldown elapsed, one probe attempt allowed
 */

import { runJob } from './job-runner';
import type { JobResult } from './job-registry';

const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 10 * 60_000; // 10 minutes

/** Retry delays: attempt 0 = immediate, attempt 1 = 30s, attempt 2 = 2min */
const RETRY_DELAYS = [0, 30_000, 120_000];

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitEntry {
  jobId: string;
  consecutiveFailures: number;
  state: CircuitState;
  openedAt: number | null;
  lastFailureAt: number | null;
  lastError: string | null;
}

export interface StaleWarning {
  jobId: string;
  label: string;
  priority: number;
  lastSuccessAt: string | null;
  expectedIntervalMs: number;
  overdueMs: number;
  circuitOpen: boolean;
}

// Module-scoped singleton
const circuits = new Map<string, CircuitEntry>();

function getEntry(jobId: string): CircuitEntry {
  let entry = circuits.get(jobId);
  if (!entry) {
    entry = {
      jobId,
      consecutiveFailures: 0,
      state: 'closed',
      openedAt: null,
      lastFailureAt: null,
      lastError: null,
    };
    circuits.set(jobId, entry);
  }
  return entry;
}

/** Record a successful job execution — resets the circuit. */
export function recordSuccess(jobId: string): void {
  const entry = getEntry(jobId);
  entry.consecutiveFailures = 0;
  entry.state = 'closed';
  entry.openedAt = null;
  entry.lastError = null;
}

/** Record a failed job execution — may open the circuit. */
export function recordFailure(jobId: string, error?: string): void {
  const entry = getEntry(jobId);
  entry.consecutiveFailures++;
  entry.lastFailureAt = Date.now();
  entry.lastError = error ?? null;

  if (entry.consecutiveFailures >= FAILURE_THRESHOLD) {
    entry.state = 'open';
    entry.openedAt = Date.now();
    console.warn(
      `[CircuitBreaker] Circuit OPEN for ${jobId} after ${entry.consecutiveFailures} consecutive failures`,
    );
  }
}

/** Check if a job is allowed to execute. */
export function canExecute(jobId: string): boolean {
  const entry = getEntry(jobId);

  if (entry.state === 'closed') return true;

  if (entry.state === 'open') {
    // Check if cooldown has elapsed → transition to half-open
    if (entry.openedAt && Date.now() - entry.openedAt >= COOLDOWN_MS) {
      entry.state = 'half-open';
      return true;
    }
    return false;
  }

  // half-open: allow one probe attempt
  return true;
}

/** Get all jobs with open circuits. */
export function getOpenCircuits(): CircuitEntry[] {
  return Array.from(circuits.values()).filter((e) => e.state === 'open' || e.state === 'half-open');
}

/** Get circuit state for a specific job. */
export function getCircuitState(jobId: string): CircuitEntry {
  return { ...getEntry(jobId) };
}

/** Reset a specific job's circuit to closed. */
export function resetJob(jobId: string): void {
  circuits.delete(jobId);
}

/** Reset all circuits. */
export function resetAll(): void {
  circuits.clear();
}

/**
 * Run a job with retry + exponential backoff + circuit breaker integration.
 *
 * @returns JobResult — always resolves, never throws (errors captured in result)
 */
export async function runWithRetry(
  jobId: string,
  userId: string,
  options?: { catchUpSessionId?: string },
): Promise<JobResult> {
  // Check circuit breaker
  if (!canExecute(jobId)) {
    return {
      processed: 0,
      error: `Circuit open for ${jobId} — skipped (will retry after cooldown)`,
    };
  }

  for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
    // Wait for backoff delay (0 on first attempt)
    if (attempt > 0) {
      await sleep(RETRY_DELAYS[attempt]);
    }

    try {
      const result = await runJob(jobId, userId, options);

      if (!result.error) {
        // Success
        recordSuccess(jobId);
        return result;
      }

      // Soft failure (returned error without throwing)
      if (attempt === RETRY_DELAYS.length - 1) {
        recordFailure(jobId, result.error);
        return result;
      }

      console.log(
        `[Retry] ${jobId} attempt ${attempt + 1}/${RETRY_DELAYS.length} failed: ${result.error}. ` +
        `Retrying in ${RETRY_DELAYS[attempt + 1] / 1000}s...`,
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';

      if (attempt === RETRY_DELAYS.length - 1) {
        recordFailure(jobId, errorMsg);
        return { processed: 0, error: errorMsg };
      }

      console.log(
        `[Retry] ${jobId} attempt ${attempt + 1}/${RETRY_DELAYS.length} threw: ${errorMsg}. ` +
        `Retrying in ${RETRY_DELAYS[attempt + 1] / 1000}s...`,
      );
    }
  }

  // Unreachable — satisfies TypeScript
  return { processed: 0, error: 'Retry exhausted' };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
