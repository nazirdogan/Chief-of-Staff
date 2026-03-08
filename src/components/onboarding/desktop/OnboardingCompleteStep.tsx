'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface OnboardingCompleteStepProps {
  briefingTime: string;
  saving: boolean;
  error: string | null;
  onFinish: () => void;
}

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  return `${hour > 12 ? hour - 12 : hour === 0 ? 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

const NEXT_STEPS = [
  { color: '#E8845C', text: 'Processing your email history and desktop captures' },
  { color: '#52B788', text: 'Extracting commitments and scoring relationships' },
  { color: '#4E7DAA', text: 'Building your first ranked morning briefing' },
  { color: '#F4C896', text: 'Learning your patterns \u2014 the more she sees, the smarter she gets' },
];

export function OnboardingCompleteStep({ briefingTime, saving, error, onFinish }: OnboardingCompleteStepProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  return (
    <div className="flex flex-col items-center text-center">
      {/* Animated meridian mark */}
      <div
        className="relative transition-all duration-700"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.85)',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Dawn ring glow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(232,132,92,0.15) 0%, transparent 70%)',
            transform: 'scale(3)',
            animation: 'glow-pulse 3s ease-in-out infinite',
          }}
        />
        <div
          className="relative flex h-20 w-20 items-center justify-center rounded-2xl"
          style={{
            background: 'rgba(232, 132, 92, 0.06)',
            border: '1px solid rgba(232, 132, 92, 0.15)',
          }}
        >
          <svg width="36" height="36" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M26 18 L26 82 L44 82 C76 82 80 66 80 50 C80 34 76 18 44 18 Z"
              fill="none" stroke="#FBF7F4" strokeWidth="4" strokeLinejoin="round" style={{ opacity: 0.8 }}
            />
            <line
              x1="26" y1="50" x2="72" y2="50"
              stroke="#E8845C" strokeWidth="2.5" strokeLinecap="round"
              style={{ strokeDasharray: 50, animation: 'meridian-draw 1s cubic-bezier(0.16,1,0.3,1) 0.3s both' }}
            />
            <circle cx="26" cy="50" r="4" fill="#E8845C"
              style={{ animation: 'check-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.8s both' }}
            />
          </svg>
        </div>
      </div>

      <h2
        className="mt-7 transition-all duration-700"
        style={{
          fontSize: '26px', fontStyle: 'italic', color: '#FBF7F4',
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)',
          transitionDelay: '200ms', transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        You&apos;re all set
      </h2>

      <p
        className="mt-3 max-w-[340px] text-[14px] leading-[1.65] transition-all duration-700"
        style={{
          color: '#9BAFC4',
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)',
          transitionDelay: '350ms', transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        Your first briefing arrives at{' '}
        <span
          className="font-medium"
          style={{ fontFamily: 'var(--font-mono)', color: '#E8845C' }}
        >
          {formatTime(briefingTime)}
        </span>{' '}
        tomorrow morning.
      </p>

      {/* What happens next */}
      <div
        className="mt-7 w-full transition-all duration-700"
        style={{
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)',
          transitionDelay: '500ms', transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="rounded-xl p-5" style={{ background: 'rgba(14, 18, 37, 0.5)', border: '1px solid rgba(251,247,244,0.04)' }}>
          <div className="mb-4 flex items-center gap-2">
            <div className="h-px flex-1" style={{ background: 'rgba(251,247,244,0.04)' }} />
            <span
              className="text-[9px] font-medium tracking-[0.15em]"
              style={{ fontFamily: 'var(--font-mono)', color: 'rgba(155,175,196,0.25)', textTransform: 'uppercase' as const }}
            >
              What happens now
            </span>
            <div className="h-px flex-1" style={{ background: 'rgba(251,247,244,0.04)' }} />
          </div>

          <div className="onboarding-stagger space-y-3">
            {NEXT_STEPS.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full"
                  style={{ backgroundColor: item.color, boxShadow: `0 0 6px ${item.color}30` }}
                />
                <span className="text-[12px] leading-[1.6]" style={{ color: 'rgba(251,247,244,0.55)' }}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 w-full rounded-lg p-3 text-[12px]" style={{ background: 'rgba(214,75,42,0.08)', border: '1px solid rgba(214,75,42,0.2)', color: '#D64B2A' }}>
          {error}
        </div>
      )}

      {/* CTA */}
      <button
        onClick={onFinish}
        disabled={saving}
        className="group mt-7 w-full transition-all duration-700"
        style={{
          opacity: mounted ? 1 : 0,
          transitionDelay: '700ms',
        }}
      >
        <div
          className="relative overflow-hidden rounded-xl px-6 py-3.5 text-center text-[14px] font-medium tracking-wide transition-all duration-300"
          style={{
            background: saving ? 'rgba(251,247,244,0.05)' : 'linear-gradient(135deg, #E8845C 0%, #D4704A 100%)',
            color: '#FBF7F4',
            boxShadow: saving ? 'none' : '0 0 30px rgba(232,132,92,0.2)',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </span>
          ) : (
            'Enter Donna'
          )}
          {!saving && (
            <div
              className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)' }}
            />
          )}
        </div>
      </button>
    </div>
  );
}
