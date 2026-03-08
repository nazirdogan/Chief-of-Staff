/**
 * Local Scheduler — replaces Trigger.dev cron scheduling.
 *
 * Runs jobs on their defined intervals while the app is open.
 * Respects connected integrations, circuit breaker state, and retries.
 */

import { JOB_REGISTRY, type JobDefinition } from './job-registry';
import { runWithRetry, canExecute } from './circuit-breaker';

interface ScheduledJob {
  job: JobDefinition;
  intervalId: ReturnType<typeof setInterval> | null;
  lastRunAt: number;
  lastSuccessAt: number | null;
  running: boolean;
}

export class LocalScheduler {
  private scheduled = new Map<string, ScheduledJob>();
  private userId: string;
  private connectedProviders: Set<string>;
  private started = false;

  constructor(userId: string, connectedProviders: Set<string>) {
    this.userId = userId;
    this.connectedProviders = connectedProviders;
  }

  /** Start scheduling all applicable jobs */
  start(): void {
    if (this.started) return;
    this.started = true;

    for (const job of JOB_REGISTRY) {
      // Skip jobs without an interval (event-triggered only)
      if (!job.intervalMs) continue;

      // Skip jobs requiring an integration the user doesn't have
      if (job.requiresIntegration && job.provider && !this.connectedProviders.has(job.provider)) {
        continue;
      }

      // Skip onboarding jobs
      if (job.category === 'onboarding') continue;

      const scheduled: ScheduledJob = {
        job,
        intervalId: null,
        lastRunAt: Date.now(), // Just caught up, so consider "now" as last run
        lastSuccessAt: Date.now(),
        running: false,
      };

      scheduled.intervalId = setInterval(async () => {
        if (scheduled.running) return; // Prevent overlap

        // Check circuit breaker
        if (!canExecute(job.id)) return;

        scheduled.running = true;
        try {
          const result = await runWithRetry(job.id, this.userId);
          scheduled.lastRunAt = Date.now();
          if (!result.error) {
            scheduled.lastSuccessAt = Date.now();
          }
        } catch {
          // Job failures are logged in job-runner via heartbeat_runs
        } finally {
          scheduled.running = false;
        }
      }, job.intervalMs);

      this.scheduled.set(job.id, scheduled);
    }

    console.log(`[LocalScheduler] Started ${this.scheduled.size} scheduled jobs for user ${this.userId}`);
  }

  /** Stop all scheduled jobs */
  stop(): void {
    for (const [, scheduled] of this.scheduled) {
      if (scheduled.intervalId) {
        clearInterval(scheduled.intervalId);
        scheduled.intervalId = null;
      }
    }
    this.scheduled.clear();
    this.started = false;
    console.log('[LocalScheduler] Stopped all scheduled jobs');
  }

  /** Update connected providers (e.g., after a new integration is connected) */
  updateProviders(providers: Set<string>): void {
    this.connectedProviders = providers;
    // Restart to pick up new integrations
    this.stop();
    this.start();
  }

  /** Check if scheduler is running */
  isRunning(): boolean {
    return this.started;
  }

  /** Get count of active scheduled jobs */
  getActiveJobCount(): number {
    return this.scheduled.size;
  }

  /** Get per-job status for stale warnings */
  getJobStatuses(): Map<string, { lastSuccessAt: number | null; running: boolean }> {
    const statuses = new Map<string, { lastSuccessAt: number | null; running: boolean }>();
    for (const [id, scheduled] of this.scheduled) {
      statuses.set(id, {
        lastSuccessAt: scheduled.lastSuccessAt,
        running: scheduled.running,
      });
    }
    return statuses;
  }
}
