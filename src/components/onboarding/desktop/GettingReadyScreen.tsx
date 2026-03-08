'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface BackfillStatus {
  jobId: string;
  status: 'none' | 'pending' | 'running' | 'completed' | 'failed';
  currentPhase: string | null;
  phaseStatus: string | null;
  progressPct: number;
  phaseDetails: Record<string, unknown> | null;
}

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

export function GettingReadyScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<BackfillStatus | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggeredRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  // Trigger the backfill on mount
  useEffect(() => {
    if (triggeredRef.current) return;
    triggeredRef.current = true;

    fetch('/api/backfill/trigger', { method: 'POST' }).catch(() => {
      // Will be caught by status polling
    });
  }, []);

  // Poll for status
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/backfill/status');
        if (!res.ok) return;
        const data = await res.json();
        setStatus(data);

        if (data.status === 'completed') {
          // Clear interval and redirect
          if (pollRef.current) clearInterval(pollRef.current);
          setTimeout(() => {
            router.push('/dashboard');
            router.refresh();
          }, 1500);
        }
      } catch {
        // Retry on next interval
      }
    }

    checkStatus();
    pollRef.current = setInterval(checkStatus, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [router]);

  const phase = status?.currentPhase ?? 'email_backfill';
  const phaseInfo = PHASE_LABELS[phase] ?? PHASE_LABELS.email_backfill;
  const progress = status?.progressPct ?? 0;
  const isComplete = status?.status === 'completed';
  const isFailed = status?.status === 'failed';

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ background: '#0E1225' }}
    >
      {/* Ambient glow — larger, softer */}
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

      <div className="relative z-10 flex flex-col items-center text-center px-6">
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
                animation: 'glow-pulse 3s ease-in-out infinite',
              }}
            />
            <div
              className="relative flex h-24 w-24 items-center justify-center rounded-2xl"
              style={{
                background: 'rgba(232, 132, 92, 0.06)',
                border: '1px solid rgba(232, 132, 92, 0.12)',
              }}
            >
              <svg width="44" height="44" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
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

        {/* Main text */}
        <h1
          className="mt-10 transition-all duration-1000"
          style={{
            fontFamily: 'var(--font-display), Georgia, serif',
            fontSize: '32px',
            fontStyle: 'italic',
            fontWeight: 400,
            color: '#FBF7F4',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(12px)',
            transitionDelay: '300ms',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {isComplete ? 'Ready for you' : 'Donna is getting ready for work'}
        </h1>

        {/* Phase description */}
        <p
          className="mt-4 max-w-[380px] text-[14px] leading-[1.7] transition-all duration-500"
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
            : isFailed
              ? 'Something went wrong, but don\u2019t worry \u2014 we\u2019ll try again.'
              : phaseInfo.description}
        </p>

        {/* Progress bar */}
        <div
          className="mt-10 w-full max-w-[320px] transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transitionDelay: '700ms',
          }}
        >
          {/* Phase label */}
          {!isComplete && !isFailed && (
            <div className="mb-3 flex items-center justify-between">
              <span
                className="text-[11px] font-medium"
                style={{ fontFamily: 'var(--font-mono)', color: '#E8845C' }}
              >
                {phaseInfo.label}
              </span>
              <span
                className="text-[10px]"
                style={{ fontFamily: 'var(--font-mono)', color: 'rgba(155,175,196,0.4)' }}
              >
                {progress}%
              </span>
            </div>
          )}

          {/* Bar */}
          <div
            className="h-[3px] w-full overflow-hidden rounded-full"
            style={{ background: 'rgba(251,247,244,0.04)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${isComplete ? 100 : progress}%`,
                background: isComplete
                  ? 'linear-gradient(90deg, #52B788, rgba(82, 183, 136, 0.6))'
                  : isFailed
                    ? 'linear-gradient(90deg, #D64B2A, rgba(214, 75, 42, 0.6))'
                    : 'linear-gradient(90deg, #E8845C, rgba(232, 132, 92, 0.4))',
              }}
            />
          </div>

          {/* Phase steps indicator */}
          {!isComplete && !isFailed && (
            <div className="mt-6 space-y-2.5">
              {Object.entries(PHASE_LABELS).map(([key, info]) => {
                const phases = Object.keys(PHASE_LABELS);
                const currentIdx = phases.indexOf(phase);
                const thisIdx = phases.indexOf(key);
                const isDone = thisIdx < currentIdx;
                const isCurrent = key === phase;

                return (
                  <div
                    key={key}
                    className="flex items-center gap-2.5 transition-all duration-300"
                    style={{ opacity: isDone ? 0.4 : isCurrent ? 1 : 0.2 }}
                  >
                    <div
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: isDone
                          ? 'rgba(82, 183, 136, 0.15)'
                          : isCurrent
                            ? 'rgba(232, 132, 92, 0.12)'
                            : 'rgba(251,247,244,0.03)',
                      }}
                    >
                      {isDone ? (
                        <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="#52B788" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : isCurrent ? (
                        <div
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: '#E8845C', animation: 'glow-pulse 2s ease-in-out infinite' }}
                        />
                      ) : (
                        <div className="h-1 w-1 rounded-full" style={{ background: 'rgba(155,175,196,0.2)' }} />
                      )}
                    </div>
                    <span
                      className="text-[11px]"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        color: isCurrent ? 'rgba(251,247,244,0.7)' : isDone ? 'rgba(82,183,136,0.5)' : 'rgba(155,175,196,0.3)',
                      }}
                    >
                      {info.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Failed state retry */}
        {isFailed && (
          <button
            onClick={() => {
              triggeredRef.current = false;
              setStatus(null);
              fetch('/api/backfill/trigger', { method: 'POST' }).catch(() => {});
            }}
            className="mt-6 rounded-lg px-5 py-2.5 text-[13px] font-medium transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #E8845C, #D4704A)',
              color: '#FBF7F4',
            }}
          >
            Try again
          </button>
        )}

        {/* Complete state CTA */}
        {isComplete && (
          <button
            onClick={() => {
              router.push('/dashboard');
              router.refresh();
            }}
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

        {/* Bottom security note */}
        <p
          className="mt-12 text-[10px] tracking-wide"
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'rgba(155, 175, 196, 0.2)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Processing locally \u2014 your data never leaves your control
        </p>
      </div>
    </div>
  );
}
