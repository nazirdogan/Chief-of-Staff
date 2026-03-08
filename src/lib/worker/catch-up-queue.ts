/**
 * Catch-Up Queue — executes stale jobs in priority phases with concurrency control.
 *
 * Phase 1: P1 + P2 (data ingestion) — concurrency 3
 * Phase 2: P3 (synthesis: briefing, operations) — concurrency 2, waits for Phase 1
 * Phase 3: P4 (other integrations) — concurrency 2
 * Phase 4: P5 (reflections, memory) — concurrency 1
 */

import { createServiceClient } from '@/lib/db/client';
import { runWithRetry, canExecute } from './circuit-breaker';
import type { StalenessReport, StaleJob } from './staleness-calculator';
import type { JobResult } from './job-registry';

export type CatchUpStatus = 'idle' | 'analyzing' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface JobRunResult {
  jobId: string;
  status: 'completed' | 'failed' | 'skipped' | 'timeout';
  durationMs: number;
  result?: JobResult;
  completedAt: string;
}

export interface CatchUpState {
  status: CatchUpStatus;
  sessionId: string | null;
  gapCategory: 'short' | 'medium' | 'long';
  gapDurationMs: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  currentPhase: number;
  activeJobIds: string[];
  results: JobRunResult[];
  estimatedRemainingMs: number;
}

type StateListener = (state: CatchUpState) => void;

const PHASE_CONCURRENCY: Record<number, number> = {
  1: 3, // P1 + P2
  2: 2, // P3
  3: 2, // P4
  4: 1, // P5
};

const PRIORITY_TO_PHASE: Record<number, number> = {
  1: 1,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
};

export class CatchUpQueue {
  private state: CatchUpState;
  private listeners: Set<StateListener> = new Set();
  private cancelled = false;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.state = {
      status: 'idle',
      sessionId: null,
      gapCategory: 'short',
      gapDurationMs: 0,
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      currentPhase: 0,
      activeJobIds: [],
      results: [],
      estimatedRemainingMs: 0,
    };
  }

  /** Subscribe to state changes */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  /** Get current state snapshot */
  getState(): CatchUpState {
    return { ...this.state };
  }

  /** Cancel the catch-up process */
  cancel(): void {
    this.cancelled = true;
    this.update({ status: 'cancelled' });
  }

  /** Run the catch-up queue */
  async run(report: StalenessReport): Promise<CatchUpState> {
    if (report.staleJobs.length === 0) {
      this.update({ status: 'completed', totalJobs: 0, completedJobs: 0 });
      return this.state;
    }

    // Create a catch-up session in the database
    const sessionId = await this.createSession(report);

    this.update({
      status: 'running',
      sessionId,
      gapCategory: report.gapCategory,
      gapDurationMs: report.gapDurationMs,
      totalJobs: report.staleJobs.length,
      estimatedRemainingMs: report.totalEstimatedMs,
    });

    // Group jobs by phase
    const phases = new Map<number, StaleJob[]>();
    for (const staleJob of report.staleJobs) {
      const phase = PRIORITY_TO_PHASE[staleJob.job.priority] ?? 4;
      const existing = phases.get(phase) ?? [];
      existing.push(staleJob);
      phases.set(phase, existing);
    }

    // Execute phases sequentially, jobs within each phase concurrently
    const phaseNumbers = Array.from(phases.keys()).sort();
    for (const phaseNum of phaseNumbers) {
      if (this.cancelled) break;

      this.update({ currentPhase: phaseNum });
      const phaseJobs = phases.get(phaseNum)!;
      const concurrency = PHASE_CONCURRENCY[phaseNum] ?? 2;

      await this.runPhase(phaseJobs, concurrency, sessionId);
    }

    // Finalize
    const finalStatus = this.cancelled ? 'cancelled' : 'completed';
    this.update({ status: finalStatus, activeJobIds: [] });

    // Update session in DB
    await this.finalizeSession(sessionId, finalStatus);

    return this.state;
  }

  private async runPhase(
    jobs: StaleJob[],
    concurrency: number,
    sessionId: string | null,
  ): Promise<void> {
    // Create a queue of work items
    const queue = [...jobs];

    const runNext = async (): Promise<void> => {
      while (queue.length > 0 && !this.cancelled) {
        const staleJob = queue.shift()!;

        // Run the job runsNeeded times (usually 1, more for non-collapsible jobs)
        for (let i = 0; i < staleJob.runsNeeded && !this.cancelled; i++) {
          await this.executeSingleJob(staleJob, sessionId);
        }
      }
    };

    // Start up to `concurrency` workers
    const workers: Promise<void>[] = [];
    for (let i = 0; i < Math.min(concurrency, jobs.length); i++) {
      workers.push(runNext());
    }

    await Promise.all(workers);
  }

  private async executeSingleJob(
    staleJob: StaleJob,
    sessionId: string | null,
  ): Promise<void> {
    const { job } = staleJob;
    const startedAt = Date.now();

    // Check circuit breaker before starting
    if (!canExecute(job.id)) {
      const runResult: JobRunResult = {
        jobId: job.id,
        status: 'skipped',
        durationMs: 0,
        result: { processed: 0, error: 'Circuit open — skipped' },
        completedAt: new Date().toISOString(),
      };
      this.update({
        failedJobs: this.state.failedJobs + 1,
        results: [...this.state.results, runResult],
      });
      return;
    }

    this.update({
      activeJobIds: [...this.state.activeJobIds, job.id],
    });

    let runResult: JobRunResult;

    try {
      // Race between job execution (with retry) and timeout
      const result = await Promise.race([
        runWithRetry(job.id, this.userId, { catchUpSessionId: sessionId ?? undefined }),
        timeout(job.timeoutMs).then(() => {
          throw new Error(`Job ${job.id} timed out after ${job.timeoutMs}ms`);
        }),
      ]);

      runResult = {
        jobId: job.id,
        status: result.error ? 'failed' : 'completed',
        durationMs: Date.now() - startedAt,
        result,
        completedAt: new Date().toISOString(),
      };
    } catch (err) {
      const isTimeout = err instanceof Error && err.message.includes('timed out');
      runResult = {
        jobId: job.id,
        status: isTimeout ? 'timeout' : 'failed',
        durationMs: Date.now() - startedAt,
        result: { processed: 0, error: err instanceof Error ? err.message : 'Unknown error' },
        completedAt: new Date().toISOString(),
      };
    }

    // Update state
    const completedJobs = this.state.completedJobs + (runResult.status === 'completed' ? 1 : 0);
    const failedJobs = this.state.failedJobs + (runResult.status !== 'completed' ? 1 : 0);
    const remaining = Math.max(
      0,
      this.state.estimatedRemainingMs - (runResult.durationMs || staleJob.job.estimatedDurationMs),
    );

    this.update({
      completedJobs,
      failedJobs,
      activeJobIds: this.state.activeJobIds.filter((id) => id !== job.id),
      results: [...this.state.results, runResult],
      estimatedRemainingMs: remaining,
    });
  }

  private update(partial: Partial<CatchUpState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch {
        // Don't let listener errors break the queue
      }
    }
  }

  private async createSession(report: StalenessReport): Promise<string | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createServiceClient() as any;
      const { data } = await db
        .from('catch_up_sessions')
        .insert({
          user_id: this.userId,
          gap_duration_ms: report.gapDurationMs,
          gap_category: report.gapCategory,
          total_jobs: report.staleJobs.length,
          status: 'running',
          job_details: [],
        })
        .select('id')
        .single();
      return data?.id ?? null;
    } catch {
      return null;
    }
  }

  private async finalizeSession(sessionId: string | null, status: string): Promise<void> {
    if (!sessionId) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createServiceClient() as any;
      await db
        .from('catch_up_sessions')
        .update({
          status,
          completed_jobs: this.state.completedJobs,
          failed_jobs: this.state.failedJobs,
          skipped_jobs: this.state.totalJobs - this.state.completedJobs - this.state.failedJobs,
          completed_at: new Date().toISOString(),
          job_details: this.state.results,
        })
        .eq('id', sessionId);
    } catch {
      // Non-critical
    }
  }
}

function timeout(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
