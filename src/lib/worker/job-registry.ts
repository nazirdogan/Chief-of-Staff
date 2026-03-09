/**
 * Job Registry — defines all background jobs with metadata.
 *
 * Each job wraps an existing agent/ingestion function from src/lib/.
 * The registry defines all background jobs with their scheduling metadata.
 */

import type { IntegrationProvider } from '@/lib/db/types';

export interface JobResult {
  processed: number;
  found?: number;
  error?: string;
}

export interface JobDefinition {
  id: string;
  category: 'heartbeat' | 'briefing' | 'operations' | 'reflections' | 'memory' | 'onboarding';
  provider: IntegrationProvider | null;
  priority: 1 | 2 | 3 | 4 | 5;
  /** Schedule for steady-state (after catch-up). null = event-triggered only */
  intervalMs: number | null;
  /** Whether this job queries user_integrations for the provider */
  requiresIntegration: boolean;
  /** Safe to collapse multiple missed runs into one */
  collapsible: boolean;
  /** Don't run during catch-up if gap < this */
  minGapMs: number;
  /** Max time to allow the job to run before killing it */
  timeoutMs: number;
  /** Estimated duration for progress calculation */
  estimatedDurationMs: number;
  /** Human-readable label for UI */
  label: string;
}

// ── Schedule constants ──
const MIN_15 = 15 * 60_000;
const MIN_30 = 30 * 60_000;
const HOUR_4 = 4 * 60 * 60_000;
const HOUR_6 = 6 * 60 * 60_000;
const HOUR_12 = 12 * 60 * 60_000;
const HOUR_24 = 24 * 60 * 60_000;
const TIMEOUT_SHORT = 60_000;
const TIMEOUT_MED = 120_000;
const TIMEOUT_LONG = 300_000;

/**
 * All background jobs, ordered roughly by priority.
 * The run functions are lazily imported in job-runner.ts to avoid loading
 * everything at startup.
 */
export const JOB_REGISTRY: JobDefinition[] = [
  // ── Priority 1: Critical data freshness ──
  {
    id: 'gmail-scan',
    category: 'heartbeat',
    provider: 'gmail',
    priority: 1,
    intervalMs: MIN_15,
    requiresIntegration: true,
    collapsible: true,
    minGapMs: MIN_15,
    timeoutMs: TIMEOUT_MED,
    estimatedDurationMs: 15_000,
    label: 'Scanning emails',
  },
  {
    id: 'calendar-scan',
    category: 'heartbeat',
    provider: 'google_calendar',
    priority: 1,
    intervalMs: MIN_30,
    requiresIntegration: true,
    collapsible: true,
    minGapMs: MIN_15,
    timeoutMs: TIMEOUT_SHORT,
    estimatedDurationMs: 8_000,
    label: 'Syncing calendar',
  },

  // ── Priority 2: Active communication ──
  {
    id: 'slack-scan',
    category: 'heartbeat',
    provider: 'slack',
    priority: 2,
    intervalMs: MIN_15,
    requiresIntegration: true,
    collapsible: true,
    minGapMs: MIN_15,
    timeoutMs: TIMEOUT_SHORT,
    estimatedDurationMs: 10_000,
    label: 'Scanning Slack',
  },
  {
    id: 'commitment-check',
    category: 'heartbeat',
    provider: null,
    priority: 2,
    intervalMs: HOUR_6,
    requiresIntegration: false,
    collapsible: true,
    minGapMs: HOUR_4,
    timeoutMs: TIMEOUT_LONG,
    estimatedDurationMs: 30_000,
    label: 'Checking commitments',
  },
  {
    id: 'relationship-check',
    category: 'heartbeat',
    provider: null,
    priority: 2,
    intervalMs: HOUR_12,
    requiresIntegration: false,
    collapsible: true,
    minGapMs: HOUR_6,
    timeoutMs: TIMEOUT_MED,
    estimatedDurationMs: 15_000,
    label: 'Scoring relationships',
  },

  // ── Priority 3: Synthesis (depends on P1/P2 data) ──
  {
    id: 'daily-briefing-generate',
    category: 'briefing',
    provider: null,
    priority: 3,
    intervalMs: HOUR_24,
    requiresIntegration: false,
    collapsible: true,
    minGapMs: HOUR_12,
    timeoutMs: TIMEOUT_LONG,
    estimatedDurationMs: 45_000,
    label: 'Generating briefing',
  },
  {
    id: 'scheduled-am-sweep',
    category: 'operations',
    provider: null,
    priority: 3,
    intervalMs: HOUR_24,
    requiresIntegration: false,
    collapsible: true,
    minGapMs: HOUR_12,
    timeoutMs: TIMEOUT_MED,
    estimatedDurationMs: 20_000,
    label: 'Running AM sweep',
  },
  {
    id: 'overnight-email-triage',
    category: 'operations',
    provider: 'gmail',
    priority: 3,
    intervalMs: HOUR_24,
    requiresIntegration: true,
    collapsible: true,
    minGapMs: HOUR_12,
    timeoutMs: TIMEOUT_MED,
    estimatedDurationMs: 20_000,
    label: 'Triaging emails',
  },
  {
    id: 'overnight-calendar-transit',
    category: 'operations',
    provider: 'google_calendar',
    priority: 3,
    intervalMs: HOUR_24,
    requiresIntegration: true,
    collapsible: true,
    minGapMs: HOUR_12,
    timeoutMs: TIMEOUT_SHORT,
    estimatedDurationMs: 10_000,
    label: 'Calculating transit',
  },

  // ── Priority 4: Other integrations ──
  {
    id: 'document-index',
    category: 'heartbeat',
    provider: 'notion',
    priority: 4,
    intervalMs: HOUR_4,
    requiresIntegration: true,
    collapsible: true,
    minGapMs: HOUR_4,
    timeoutMs: TIMEOUT_LONG,
    estimatedDurationMs: 30_000,
    label: 'Indexing documents',
  },
  {
    id: 'meeting-transcript-scan',
    category: 'heartbeat',
    provider: null,
    priority: 4,
    intervalMs: HOUR_4,
    requiresIntegration: false,
    collapsible: true,
    minGapMs: HOUR_4,
    timeoutMs: TIMEOUT_MED,
    estimatedDurationMs: 15_000,
    label: 'Processing transcripts',
  },

  // ── Priority 2: Observer-first narrative (runs every 15 min) ──
  {
    id: 'update-day-narrative',
    category: 'memory',
    provider: null,
    priority: 2,
    intervalMs: MIN_15,
    requiresIntegration: false,
    collapsible: true,
    minGapMs: MIN_15,
    timeoutMs: TIMEOUT_SHORT,
    estimatedDurationMs: 10_000,
    label: 'Updating day narrative',
  },

  // ── Priority 5: Deferred synthesis ──
  {
    id: 'generate-daily-snapshot',
    category: 'memory',
    provider: null,
    priority: 5,
    intervalMs: HOUR_24,
    requiresIntegration: false,
    collapsible: false, // need one per missed day
    minGapMs: HOUR_12,
    timeoutMs: TIMEOUT_MED,
    estimatedDurationMs: 20_000,
    label: 'Creating daily snapshot',
  },
  {
    id: 'analyze-working-patterns',
    category: 'memory',
    provider: null,
    priority: 5,
    intervalMs: HOUR_24,
    requiresIntegration: false,
    collapsible: true,
    minGapMs: HOUR_24,
    timeoutMs: TIMEOUT_MED,
    estimatedDurationMs: 20_000,
    label: 'Analyzing patterns',
  },
  {
    id: 'weekly-reflection',
    category: 'reflections',
    provider: null,
    priority: 5,
    intervalMs: 7 * HOUR_24,
    requiresIntegration: false,
    collapsible: true,
    minGapMs: 5 * HOUR_24,
    timeoutMs: TIMEOUT_LONG,
    estimatedDurationMs: 30_000,
    label: 'Writing weekly reflection',
  },
  {
    id: 'monthly-reflection',
    category: 'reflections',
    provider: null,
    priority: 5,
    intervalMs: 30 * HOUR_24,
    requiresIntegration: false,
    collapsible: true,
    minGapMs: 20 * HOUR_24,
    timeoutMs: TIMEOUT_LONG,
    estimatedDurationMs: 45_000,
    label: 'Writing monthly reflection',
  },
];

/** Lookup job definition by ID */
export function getJobDef(id: string): JobDefinition | undefined {
  return JOB_REGISTRY.find((j) => j.id === id);
}

/** Get all jobs for a given priority level */
export function getJobsByPriority(priority: number): JobDefinition[] {
  return JOB_REGISTRY.filter((j) => j.priority === priority);
}
