'use client';

import { useEffect, useState } from 'react';

interface WelcomeStepProps {
  onNext: () => void;
}

const SAMPLE_ITEMS = [
  {
    type: 'REPLY NOW',
    color: '#E8845C',
    text: 'James Chen sent a contract revision \u2014 wants sign-off by noon',
  },
  {
    type: 'COMMITMENT',
    color: '#52B788',
    text: 'You promised Sarah the Q1 deck by Friday (2 days left)',
  },
  {
    type: 'RELATIONSHIP',
    color: '#4E7DAA',
    text: "You haven\u2019t spoken to Michael Torres in 16 days \u2014 he\u2019s going cold",
  },
  {
    type: 'MEETING PREP',
    color: '#F4C896',
    text: '10:30am \u2014 Board sync: 3 docs attached, 2 open items from last meeting',
  },
];

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  return (
    <div className="flex flex-col items-center text-center">
      {/* Animated Meridian mark */}
      <div
        className="relative mb-8 transition-all duration-700"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.9)',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <svg
          width="56"
          height="56"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="22" fill="#1B1F3A" />
          <path
            d="M26 18 L26 82 L44 82 C76 82 80 66 80 50 C80 34 76 18 44 18 Z"
            fill="none"
            stroke="#FBF7F4"
            strokeWidth="4"
            strokeLinejoin="round"
            style={{ opacity: 0.9 }}
          />
          <line
            x1="26" y1="50" x2="72" y2="50"
            stroke="#E8845C" strokeWidth="2.5" strokeLinecap="round"
            style={{
              strokeDasharray: 50,
              animation: 'meridian-draw 1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both',
            }}
          />
          <circle
            cx="26" cy="50" r="4.5" fill="#E8845C"
            style={{
              animation: 'check-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.8s both',
            }}
          />
        </svg>
      </div>

      {/* Headline */}
      <h1
        className="transition-all duration-700"
        style={{
          fontSize: '34px',
          lineHeight: 1.1,
          fontStyle: 'italic',
          color: '#FBF7F4',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(12px)',
          transitionDelay: '200ms',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        See everything.
        <br />
        <span style={{ color: '#E8845C' }}>Miss nothing.</span>
      </h1>

      {/* Subtitle */}
      <p
        className="mt-4 max-w-[340px] text-[14px] leading-[1.65] transition-all duration-700"
        style={{
          color: '#9BAFC4',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(12px)',
          transitionDelay: '350ms',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        Donna reads your entire digital life and delivers one
        focused briefing every morning.
      </p>

      {/* Sample briefing card */}
      <div
        className="mt-8 w-full transition-all duration-700"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(16px)',
          transitionDelay: '500ms',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          className="rounded-xl p-5 text-left"
          style={{
            background: 'rgba(14, 18, 37, 0.6)',
            border: '1px solid rgba(251, 247, 244, 0.05)',
          }}
        >
          <div className="mb-4 flex items-center gap-2">
            <div
              className="h-px flex-1"
              style={{ background: 'rgba(232, 132, 92, 0.2)' }}
            />
            <span
              className="text-[9px] font-medium tracking-[0.15em]"
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'rgba(232, 132, 92, 0.5)',
                textTransform: 'uppercase',
              }}
            >
              Tomorrow&apos;s briefing
            </span>
            <div
              className="h-px flex-1"
              style={{ background: 'rgba(232, 132, 92, 0.2)' }}
            />
          </div>

          <div className="onboarding-stagger space-y-3">
            {SAMPLE_ITEMS.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full"
                  style={{
                    backgroundColor: item.color,
                    boxShadow: `0 0 8px ${item.color}40`,
                  }}
                />
                <div className="flex-1">
                  <span
                    className="mr-2 text-[9px] font-semibold tracking-[0.1em]"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: item.color,
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.type}
                  </span>
                  <span
                    className="text-[13px] leading-[1.5]"
                    style={{ color: 'rgba(251, 247, 244, 0.7)' }}
                  >
                    {item.text}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onNext}
        className="group mt-8 w-full transition-all duration-700"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(12px)',
          transitionDelay: '700ms',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          className="relative overflow-hidden rounded-xl px-6 py-3.5 text-center text-[14px] font-medium tracking-wide transition-all duration-300 group-hover:shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #E8845C 0%, #D4704A 100%)',
            color: '#FBF7F4',
            boxShadow: '0 0 24px rgba(232, 132, 92, 0.15)',
          }}
        >
          Get Started
          <div
            className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
            }}
          />
        </div>
      </button>

      <p
        className="mt-4 text-[11px] transition-all duration-700"
        style={{
          fontFamily: 'var(--font-mono)',
          color: 'rgba(155, 175, 196, 0.3)',
          letterSpacing: '0.05em',
          opacity: mounted ? 1 : 0,
          transitionDelay: '850ms',
        }}
      >
        Takes about 5 minutes to set up
      </p>
    </div>
  );
}
