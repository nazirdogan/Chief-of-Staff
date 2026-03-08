'use client';

import { useState } from 'react';
import { useCatchUpStore } from '@/stores/catch-up-store';
import { getJobDef } from '@/lib/worker/job-registry';

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 24) return `${Math.round(hours / 24)} days`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatRemaining(ms: number): string {
  const secs = Math.ceil(ms / 1000);
  if (secs > 60) return `~${Math.ceil(secs / 60)}m remaining`;
  return `~${secs}s remaining`;
}

function formatTimeSince(isoString: string): string {
  const ms = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function ResyncButton({ jobIds, label }: { jobIds?: string[]; label: string }) {
  const [syncing, setSyncing] = useState(false);

  const handleResync = async () => {
    setSyncing(true);
    try {
      await fetch('/api/worker/resync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobIds ? { jobIds } : {}),
      });
    } catch {
      // Will be retried on next poll
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      onClick={handleResync}
      disabled={syncing}
      className="shrink-0 rounded-md px-3 py-1 text-[11px] font-medium transition-all duration-150"
      style={{
        background: syncing ? 'rgba(232, 132, 92, 0.08)' : 'rgba(232, 132, 92, 0.12)',
        border: '1px solid rgba(232, 132, 92, 0.2)',
        color: syncing ? 'rgba(251, 247, 244, 0.4)' : 'rgba(251, 247, 244, 0.7)',
        cursor: syncing ? 'not-allowed' : 'pointer',
      }}
    >
      {syncing ? 'Syncing...' : label}
    </button>
  );
}

export function CatchUpBanner() {
  const catchUpState = useCatchUpStore((s) => s.state);
  const staleWarnings = useCatchUpStore((s) => s.staleWarnings);

  // ── Stale data warning (shown when catch-up is not active) ──
  const showStaleWarning =
    staleWarnings.length > 0 &&
    (!catchUpState || catchUpState.status === 'completed' || catchUpState.status === 'idle');

  if (showStaleWarning) {
    const circuitOpenWarnings = staleWarnings.filter((w) => w.circuitOpen);
    const overdueWarnings = staleWarnings.filter((w) => !w.circuitOpen);

    return (
      <div
        className="mx-4 mb-4 rounded-lg px-4 py-3"
        style={{
          background: circuitOpenWarnings.length > 0
            ? 'rgba(214, 75, 42, 0.06)'
            : 'rgba(232, 180, 60, 0.06)',
          border: `1px solid ${
            circuitOpenWarnings.length > 0
              ? 'rgba(214, 75, 42, 0.12)'
              : 'rgba(232, 180, 60, 0.12)'
          }`,
        }}
      >
        {circuitOpenWarnings.length > 0 && (
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="text-[13px] font-medium"
                style={{ color: 'rgba(251, 247, 244, 0.75)' }}
              >
                Some data sources stopped responding
              </p>
              <p
                className="mt-1 text-[11px]"
                style={{ fontFamily: 'var(--font-mono)', color: 'rgba(155, 175, 196, 0.5)' }}
              >
                {circuitOpenWarnings.map((w) => w.label).join(', ')}
              </p>
            </div>
            <ResyncButton
              jobIds={circuitOpenWarnings.map((w) => w.jobId)}
              label="Retry"
            />
          </div>
        )}
        {overdueWarnings.length > 0 && (
          <div className={`flex items-start justify-between gap-3 ${circuitOpenWarnings.length > 0 ? 'mt-2 pt-2' : ''}`}
            style={circuitOpenWarnings.length > 0 ? { borderTop: '1px solid rgba(155, 175, 196, 0.08)' } : undefined}
          >
            <div>
              <p
                className="text-[12px]"
                style={{ color: 'rgba(251, 247, 244, 0.6)' }}
              >
                {overdueWarnings.length === 1
                  ? `${overdueWarnings[0].label} hasn't synced recently`
                  : `${overdueWarnings.length} sources haven't synced recently`}
              </p>
              <p
                className="mt-0.5 text-[11px]"
                style={{ fontFamily: 'var(--font-mono)', color: 'rgba(155, 175, 196, 0.4)' }}
              >
                {overdueWarnings.map((w) =>
                  `${w.label}${w.lastSuccessAt ? ` (${formatTimeSince(w.lastSuccessAt)})` : ''}`
                ).join(', ')}
              </p>
            </div>
            <ResyncButton label="Re-sync" />
          </div>
        )}
      </div>
    );
  }

  // ── Catch-up state banners ──
  if (!catchUpState) return null;

  const { status, gapCategory, gapDurationMs, totalJobs, completedJobs, activeJobIds, estimatedRemainingMs } = catchUpState;

  // Don't show for short gaps or when idle/completed
  if (status === 'idle' || status === 'completed' || status === 'cancelled') return null;
  if (gapCategory === 'short' && status === 'running') return null;

  // Get labels for currently running jobs
  const activeLabels = activeJobIds
    .map((id) => getJobDef(id)?.label ?? id)
    .slice(0, 2);

  const progressPct = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

  if (status === 'failed') {
    return (
      <div
        className="mx-4 mb-4 rounded-lg px-4 py-3"
        style={{
          background: 'rgba(214, 75, 42, 0.08)',
          border: '1px solid rgba(214, 75, 42, 0.15)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px]" style={{ color: 'rgba(251, 247, 244, 0.7)' }}>
            Some background tasks failed to complete. Your data may be partially updated.
          </p>
          <ResyncButton label="Retry" />
        </div>
      </div>
    );
  }

  // Long gap — more prominent card
  if (gapCategory === 'long') {
    return (
      <div
        className="mx-4 mb-4 rounded-xl px-5 py-4"
        style={{
          background: 'rgba(232, 132, 92, 0.06)',
          border: '1px solid rgba(232, 132, 92, 0.1)',
        }}
      >
        <p
          className="text-[13px] font-medium"
          style={{ color: 'rgba(251, 247, 244, 0.85)' }}
        >
          Welcome back. Catching up on {formatDuration(gapDurationMs)} of activity.
        </p>
        <div className="mt-3 flex items-center gap-3">
          {/* Progress bar */}
          <div
            className="h-[3px] flex-1 overflow-hidden rounded-full"
            style={{ background: 'rgba(251, 247, 244, 0.04)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progressPct}%`,
                background: 'linear-gradient(90deg, #E8845C, rgba(232, 132, 92, 0.4))',
              }}
            />
          </div>
          <span
            className="shrink-0 text-[11px]"
            style={{ fontFamily: 'var(--font-mono)', color: 'rgba(155, 175, 196, 0.5)' }}
          >
            {completedJobs}/{totalJobs}
          </span>
        </div>
        {activeLabels.length > 0 && (
          <p
            className="mt-2 text-[11px]"
            style={{ fontFamily: 'var(--font-mono)', color: 'rgba(155, 175, 196, 0.4)' }}
          >
            {activeLabels.join(' · ')}
            {estimatedRemainingMs > 0 ? ` · ${formatRemaining(estimatedRemainingMs)}` : ''}
          </p>
        )}
      </div>
    );
  }

  // Medium gap — slim banner
  return (
    <div
      className="mx-4 mb-3 flex items-center gap-3 rounded-lg px-4 py-2.5"
      style={{
        background: 'rgba(232, 132, 92, 0.04)',
        border: '1px solid rgba(232, 132, 92, 0.08)',
      }}
    >
      {/* Spinner */}
      <div
        className="h-3.5 w-3.5 shrink-0 rounded-full"
        style={{
          border: '1.5px solid rgba(232, 132, 92, 0.2)',
          borderTopColor: '#E8845C',
          animation: 'spin 1s linear infinite',
        }}
      />
      <p
        className="flex-1 text-[12px]"
        style={{ color: 'rgba(251, 247, 244, 0.6)' }}
      >
        Catching up on {formatDuration(gapDurationMs)}...
        {activeLabels.length > 0 && (
          <span style={{ color: 'rgba(155, 175, 196, 0.4)' }}>
            {' · '}{activeLabels[0]}
          </span>
        )}
      </p>
      <span
        className="shrink-0 text-[11px]"
        style={{ fontFamily: 'var(--font-mono)', color: 'rgba(155, 175, 196, 0.35)' }}
      >
        {completedJobs}/{totalJobs}
      </span>
    </div>
  );
}
