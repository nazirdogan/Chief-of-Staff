'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface BackfillStatus {
  jobId: string;
  status: 'none' | 'pending' | 'running' | 'completed' | 'failed';
  currentPhase: string | null;
  phaseStatus: string | null;
  progressPct: number;
  phaseDetails: Record<string, unknown> | null;
}

const PHASES = [
  'email_backfill',
  'contact_graph',
  'commitment_extraction',
  'calendar_backfill',
  'desktop_processing',
  'first_briefing',
] as const;

const PHASE_LABELS: Record<string, { label: string; description: string }> = {
  email_backfill: {
    label: 'Scanning emails',
    description: 'Reading 30 days of your inbox and sent mail',
  },
  contact_graph: {
    label: 'Mapping relationships',
    description: 'Building your contact graph and interaction scores',
  },
  commitment_extraction: {
    label: 'Finding commitments',
    description: 'Extracting promises you\'ve made from sent emails',
  },
  calendar_backfill: {
    label: 'Loading calendar',
    description: 'Pulling upcoming meetings and recent events',
  },
  desktop_processing: {
    label: 'Processing observations',
    description: 'Analyzing context from your messaging apps',
  },
  first_briefing: {
    label: 'Writing your briefing',
    description: 'Crafting your first personalised morning briefing',
  },
};

// How long to wait before showing "skip" option (2 minutes)
const STALL_TIMEOUT_MS = 120_000;
// How long before auto-completing a stalled job (5 minutes)
const AUTO_COMPLETE_TIMEOUT_MS = 300_000;

export function GettingReadyScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<BackfillStatus | null>(null);
  const [mounted, setMounted] = useState(false);
  const [stalled, setStalled] = useState(false);
  const [triggerFailed, setTriggerFailed] = useState(false);
  const triggeredRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastProgressRef = useRef<{ pct: number; time: number }>({ pct: 0, time: 0 });
  const startTimeRef = useRef(0);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const enterDashboard = useCallback(() => {
    router.push('/chat');
    router.refresh();
  }, [router]);

  // Trigger the backfill on mount
  useEffect(() => {
    if (triggeredRef.current) return;
    triggeredRef.current = true;
    startTimeRef.current = Date.now();
    lastProgressRef.current = { pct: 0, time: Date.now() };

    fetch('/api/backfill/trigger', { method: 'POST' })
      .then(async (res) => {
        if (!res.ok) {
          setTriggerFailed(true);
        }
      })
      .catch(() => {
        setTriggerFailed(true);
      });
  }, []);

  // Poll for status
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/backfill/status');
        if (!res.ok) return;
        const data: BackfillStatus = await res.json();
        setStatus(data);

        // Track if progress is actually moving
        if (data.progressPct > lastProgressRef.current.pct) {
          lastProgressRef.current = { pct: data.progressPct, time: Date.now() };
          setStalled(false);
        }

        if (data.status === 'completed') {
          if (pollRef.current) clearInterval(pollRef.current);
          setTimeout(enterDashboard, 1500);
          return;
        }

        // Detect stall: no progress for STALL_TIMEOUT_MS
        const timeSinceLastProgress = Date.now() - lastProgressRef.current.time;
        if (timeSinceLastProgress > STALL_TIMEOUT_MS && data.status !== 'none') {
          setStalled(true);
        }

        // Auto-complete after AUTO_COMPLETE_TIMEOUT_MS — don't leave user hanging forever
        const totalElapsed = Date.now() - startTimeRef.current;
        if (totalElapsed > AUTO_COMPLETE_TIMEOUT_MS) {
          if (pollRef.current) clearInterval(pollRef.current);
          // Mark as complete server-side so they don't get stuck here again
          await fetch('/api/backfill/complete', { method: 'POST' }).catch(() => {});
          enterDashboard();
          return;
        }
      } catch {
        // Retry on next interval
      }
    }

    checkStatus();
    pollRef.current = setInterval(checkStatus, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [router, enterDashboard]);

  const phase = status?.currentPhase ?? 'email_backfill';
  const phaseInfo = PHASE_LABELS[phase] ?? PHASE_LABELS.email_backfill;
  const isComplete = status?.status === 'completed';
  const isFailed = status?.status === 'failed';
  const isRunning = status?.status === 'running';

  // Determine which phases are done/current/pending
  const currentPhaseIdx = PHASES.indexOf(phase as typeof PHASES[number]);

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ background: '#0E1225' }}
    >
      {/* Ambient glow */}
      <div
        className="animate-glow-pulse pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,132,92,0.08) 0%, transparent 60%)',
        }}
      />

      {/* Grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: '128px 128px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-[520px] w-full">
        {/* Donna logo mark */}
        <div
          className="transition-all duration-1000"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="relative">
            {/* Glow ring */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(232,132,92,0.2) 0%, transparent 70%)',
                transform: 'scale(4)',
                animation: isRunning ? 'glow-pulse 3s ease-in-out infinite' : undefined,
              }}
            />
            <div
              className="relative flex h-20 w-20 items-center justify-center rounded-2xl"
              style={{
                background: 'rgba(232, 132, 92, 0.06)',
                border: '1px solid rgba(232, 132, 92, 0.12)',
              }}
            >
              <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M26 18 L26 82 L44 82 C76 82 80 66 80 50 C80 34 76 18 44 18 Z"
                  fill="none"
                  stroke="#FBF7F4"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                  style={{ opacity: 0.7 }}
                />
                <line
                  x1="26" y1="50" x2="72" y2="50"
                  stroke="#E8845C"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{
                    strokeDasharray: 50,
                    animation: 'meridian-draw 1.5s cubic-bezier(0.16,1,0.3,1) 0.5s both',
                  }}
                />
                <circle
                  cx="26" cy="50" r="3.5"
                  fill="#E8845C"
                  style={{ animation: 'check-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) 1.2s both' }}
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Main heading */}
        <h1
          className="mt-8 transition-all duration-1000"
          style={{
            fontFamily: 'var(--font-display), Georgia, serif',
            fontSize: '28px',
            fontStyle: 'italic',
            fontWeight: 400,
            color: '#FBF7F4',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(12px)',
            transitionDelay: '300ms',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {isComplete
            ? 'Ready for you'
            : triggerFailed
              ? 'Setup is taking a moment'
              : 'Donna is getting ready for work'}
        </h1>

        {/* Phase description */}
        <p
          className="mt-3 text-[14px] leading-[1.7] transition-all duration-500"
          style={{
            color: '#9BAFC4',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(8px)',
            transitionDelay: '500ms',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {isComplete
            ? 'Your first briefing is ready. Let\u2019s go.'
            : isFailed || triggerFailed
              ? 'We\u2019ll finish setting up in the background. You can start using Donna now.'
              : phaseInfo.description}
        </p>

        {/* Phase steps — the main status display */}
        {!isComplete && !isFailed && !triggerFailed && (
          <div
            className="mt-10 w-full transition-all duration-700"
            style={{
              opacity: mounted ? 1 : 0,
              transitionDelay: '700ms',
            }}
          >
            <div className="space-y-1">
              {PHASES.map((key, idx) => {
                const info = PHASE_LABELS[key];
                const isDone = idx < currentPhaseIdx;
                const isCurrent = key === phase && isRunning;
                const isPending = idx > currentPhaseIdx;

                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all duration-500"
                    style={{
                      background: isCurrent
                        ? 'rgba(232, 132, 92, 0.06)'
                        : 'transparent',
                    }}
                  >
                    {/* Status icon */}
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {isDone ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="7" fill="rgba(82, 183, 136, 0.15)" />
                          <path d="M4 7L6 9.5L10 4.5" stroke="#52B788" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : isCurrent ? (
                        <div className="relative flex h-5 w-5 items-center justify-center">
                          <div
                            className="absolute h-5 w-5 rounded-full"
                            style={{
                              border: '2px solid rgba(232, 132, 92, 0.3)',
                              borderTopColor: '#E8845C',
                              animation: 'spin 1s linear infinite',
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: 'rgba(155, 175, 196, 0.2)' }}
                        />
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className="text-[13px] font-medium transition-colors duration-300"
                      style={{
                        color: isCurrent
                          ? 'rgba(251, 247, 244, 0.9)'
                          : isDone
                            ? 'rgba(82, 183, 136, 0.6)'
                            : 'rgba(155, 175, 196, 0.25)',
                      }}
                    >
                      {info.label}
                    </span>

                    {/* Phase detail (e.g. "142 emails") */}
                    {isDone && status?.phaseDetails && (
                      <span
                        className="ml-auto text-[11px]"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          color: 'rgba(82, 183, 136, 0.35)',
                        }}
                      >
                        {getPhaseDetail(key, status.phaseDetails)}
                      </span>
                    )}

                    {/* Spinner label for current */}
                    {isCurrent && (
                      <span
                        className="ml-auto text-[11px]"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          color: 'rgba(232, 132, 92, 0.5)',
                        }}
                      >
                        {isPending ? '' : 'in progress'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stalled state — offer skip */}
        {stalled && !isComplete && !isFailed && (
          <div
            className="mt-6 animate-fade-in"
          >
            <p
              className="mb-3 text-[12px]"
              style={{ color: 'rgba(155, 175, 196, 0.5)' }}
            >
              This is taking longer than expected. You can continue while we finish in the background.
            </p>
            <button
              onClick={enterDashboard}
              className="rounded-lg px-5 py-2.5 text-[13px] font-medium transition-all duration-300 hover:brightness-110"
              style={{
                background: 'rgba(251, 247, 244, 0.08)',
                color: '#FBF7F4',
                border: '1px solid rgba(251, 247, 244, 0.1)',
              }}
            >
              Continue to Donna
            </button>
          </div>
        )}

        {/* Failed / trigger failed state */}
        {(isFailed || triggerFailed) && (
          <div className="mt-8 flex items-center gap-3">
            <button
              onClick={enterDashboard}
              className="rounded-xl px-6 py-3 text-[14px] font-medium transition-all duration-300 hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, #E8845C, #D4704A)',
                color: '#FBF7F4',
                boxShadow: '0 0 24px rgba(232, 132, 92, 0.15)',
              }}
            >
              Enter Donna
            </button>
            {isFailed && (
              <button
                onClick={() => {
                  triggeredRef.current = false;
                  setStatus(null);
                  setStalled(false);
                  setTriggerFailed(false);
                  lastProgressRef.current = { pct: 0, time: Date.now() };
                  startTimeRef.current = Date.now();
                  fetch('/api/backfill/trigger', { method: 'POST' }).catch(() => {});
                }}
                className="rounded-xl px-6 py-3 text-[14px] font-medium transition-all duration-300"
                style={{
                  background: 'rgba(251, 247, 244, 0.06)',
                  color: 'rgba(251, 247, 244, 0.7)',
                  border: '1px solid rgba(251, 247, 244, 0.08)',
                }}
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Complete state */}
        {isComplete && (
          <button
            onClick={enterDashboard}
            className="group mt-8 transition-all duration-700"
            style={{ opacity: mounted ? 1 : 0, transitionDelay: '200ms' }}
          >
            <div
              className="relative overflow-hidden rounded-xl px-8 py-3.5 text-[14px] font-medium tracking-wide transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #E8845C 0%, #D4704A 100%)',
                color: '#FBF7F4',
                boxShadow: '0 0 30px rgba(232,132,92,0.2)',
              }}
            >
              Enter Donna
              <div
                className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)' }}
              />
            </div>
          </button>
        )}

        {/* Bottom note */}
        <p
          className="mt-12 text-[10px] tracking-wide"
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'rgba(155, 175, 196, 0.2)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Processing locally &mdash; your data never leaves your control
        </p>
      </div>

      {/* Spinner keyframe */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/** Extract a human-readable detail from phase_details for completed phases */
function getPhaseDetail(phase: string, details: Record<string, unknown>): string {
  switch (phase) {
    case 'email_backfill': {
      const n = details.emails_ingested;
      return typeof n === 'number' && n > 0 ? `${n} emails` : '';
    }
    case 'contact_graph': {
      const n = details.contacts_upserted;
      return typeof n === 'number' && n > 0 ? `${n} contacts` : '';
    }
    case 'commitment_extraction': {
      const n = details.commitments_extracted;
      return typeof n === 'number' && n > 0 ? `${n} found` : '';
    }
    case 'calendar_backfill': {
      const n = details.events_loaded;
      return typeof n === 'number' && n > 0 ? `${n} events` : '';
    }
    case 'desktop_processing': {
      const n = details.chunks_found;
      return typeof n === 'number' && n > 0 ? `${n} snapshots` : '';
    }
    default:
      return '';
  }
}
