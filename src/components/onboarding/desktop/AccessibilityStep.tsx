'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  checkAccessibility,
  requestAccessibility,
} from '@/lib/desktop-observer/client';

interface AccessibilityStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function AccessibilityStep({ onNext, onBack }: AccessibilityStepProps) {
  const [granted, setGranted] = useState(false);
  const [prompted, setPrompted] = useState(false);
  const [checking, setChecking] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  useEffect(() => {
    checkAccessibility().then((result) => {
      setGranted(result);
      setChecking(false);
      if (result) setTimeout(onNext, 800);
    });
  }, [onNext]);

  useEffect(() => {
    if (!prompted || granted) return;
    const interval = setInterval(async () => {
      const result = await checkAccessibility();
      if (result) {
        setGranted(true);
        clearInterval(interval);
        setTimeout(onNext, 1200);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [prompted, granted, onNext]);

  const handleRequest = useCallback(async () => {
    setPrompted(true);
    await requestAccessibility();
  }, []);

  if (checking) {
    return (
      <div className="flex flex-col items-center py-16">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#9BAFC4' }} />
        <p className="mt-3 text-[13px]" style={{ color: 'rgba(155,175,196,0.5)' }}>
          Checking permissions...
        </p>
      </div>
    );
  }

  if (granted) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <div className="animate-check-pop flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: 'rgba(82, 183, 136, 0.1)', border: '1px solid rgba(82, 183, 136, 0.2)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#52B788" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="mt-5" style={{ fontSize: '22px', fontStyle: 'italic', color: '#FBF7F4' }}>
          Permission granted
        </h2>
        <p className="mt-2 text-[13px]" style={{ color: 'rgba(82, 183, 136, 0.7)' }}>
          Donna can now read your desktop apps. Moving on...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      {/* Shield icon with ambient glow */}
      <div
        className="relative transition-all duration-700"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(8px)',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          className="animate-glow-pulse absolute inset-0 rounded-2xl"
          style={{ background: 'rgba(78, 125, 170, 0.15)', filter: 'blur(16px)' }}
        />
        <div
          className="relative flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background: 'rgba(78, 125, 170, 0.08)',
            border: '1px solid rgba(78, 125, 170, 0.15)',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4E7DAA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
      </div>

      <h2
        className="mt-6 transition-all duration-700"
        style={{
          fontSize: '22px',
          fontStyle: 'italic',
          color: '#FBF7F4',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(8px)',
          transitionDelay: '100ms',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        Enable screen reading
      </h2>

      <p
        className="mt-3 max-w-[320px] text-[13px] leading-[1.65] transition-all duration-700"
        style={{
          color: '#9BAFC4',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(8px)',
          transitionDelay: '200ms',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        Donna reads on-screen text from your apps to include them in your
        daily briefing. This needs macOS Accessibility permission.
      </p>

      {/* Trust panels */}
      <div
        className="mt-7 w-full space-y-2.5 transition-all duration-700"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(12px)',
          transitionDelay: '350ms',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          className="rounded-lg p-3.5 text-left"
          style={{
            background: 'rgba(14, 18, 37, 0.5)',
            borderLeft: '2px solid rgba(82, 183, 136, 0.4)',
          }}
        >
          <p
            className="mb-2 text-[9px] font-medium tracking-[0.12em]"
            style={{ fontFamily: 'var(--font-mono)', color: 'rgba(82, 183, 136, 0.6)', textTransform: 'uppercase' }}
          >
            What Donna reads
          </p>
          <ul className="space-y-1">
            {['Visible text in your active app window', 'App name and window title', 'Selected text and clipboard'].map((t) => (
              <li key={t} className="flex items-center gap-2 text-[12px]" style={{ color: 'rgba(251, 247, 244, 0.6)' }}>
                <div className="h-px w-2 shrink-0" style={{ background: 'rgba(82, 183, 136, 0.3)' }} />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div
          className="rounded-lg p-3.5 text-left"
          style={{
            background: 'rgba(14, 18, 37, 0.5)',
            borderLeft: '2px solid rgba(155, 175, 196, 0.2)',
          }}
        >
          <p
            className="mb-2 text-[9px] font-medium tracking-[0.12em]"
            style={{ fontFamily: 'var(--font-mono)', color: 'rgba(155, 175, 196, 0.4)', textTransform: 'uppercase' }}
          >
            Never captured
          </p>
          <ul className="space-y-1">
            {['Screenshots or screen recordings', 'Passwords or secure input fields', 'Background apps you aren\u2019t looking at'].map((t) => (
              <li key={t} className="flex items-center gap-2 text-[12px]" style={{ color: 'rgba(251, 247, 244, 0.4)' }}>
                <div className="h-px w-2 shrink-0" style={{ background: 'rgba(155, 175, 196, 0.15)' }} />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CTA */}
      <div
        className="mt-7 w-full transition-all duration-700"
        style={{
          opacity: mounted ? 1 : 0,
          transitionDelay: '500ms',
        }}
      >
        {!prompted ? (
          <button
            onClick={handleRequest}
            className="group w-full"
          >
            <div
              className="relative overflow-hidden rounded-xl px-6 py-3.5 text-center text-[14px] font-medium tracking-wide transition-all duration-300 group-hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #4E7DAA 0%, #3D6A94 100%)',
                color: '#FBF7F4',
                boxShadow: '0 0 24px rgba(78, 125, 170, 0.15)',
              }}
            >
              Grant Permission
              <div
                className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)' }}
              />
            </div>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2.5">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#4E7DAA' }} />
              <span className="text-[13px]" style={{ color: 'rgba(155, 175, 196, 0.7)' }}>
                Waiting for permission...
              </span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(155, 175, 196, 0.35)' }}>
              Click{' '}
              <span style={{ color: 'rgba(251, 247, 244, 0.6)' }}>&quot;Open System Settings&quot;</span>
              , then toggle{' '}
              <span style={{ color: 'rgba(251, 247, 244, 0.6)' }}>Donna</span> on.
            </p>
            <button
              onClick={handleRequest}
              className="text-[11px] font-medium transition-colors duration-200 hover:underline"
              style={{ color: '#4E7DAA' }}
            >
              Show the dialog again
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex w-full items-center justify-between">
        <button
          onClick={onBack}
          className="text-[12px] font-medium transition-colors duration-200 hover:underline"
          style={{ color: 'rgba(155, 175, 196, 0.4)' }}
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="text-[12px] font-medium transition-colors duration-200 hover:underline"
          style={{ color: 'rgba(155, 175, 196, 0.4)' }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
