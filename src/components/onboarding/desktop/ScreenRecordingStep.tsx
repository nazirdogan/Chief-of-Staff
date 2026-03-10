'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  checkScreenRecording,
  requestScreenRecording,
} from '@/lib/desktop-observer/client';

interface ScreenRecordingStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function ScreenRecordingStep({ onNext, onBack }: ScreenRecordingStepProps) {
  const [granted, setGranted] = useState(false);
  const [prompted, setPrompted] = useState(false);
  const [checking, setChecking] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  useEffect(() => {
    checkScreenRecording().then((result) => {
      setGranted(result);
      setChecking(false);
      if (result) setTimeout(onNext, 800);
    });
  }, [onNext]);

  // Poll every second after user has been prompted
  useEffect(() => {
    if (!prompted || granted) return;
    const interval = setInterval(async () => {
      const result = await checkScreenRecording();
      if (result) {
        setGranted(true);
        clearInterval(interval);
        setTimeout(onNext, 1200);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [prompted, granted, onNext]);

  const handleGrant = useCallback(async () => {
    setPrompted(true);
    await requestScreenRecording();
  }, []);

  const handleSkip = useCallback(() => {
    onNext();
  }, [onNext]);

  return (
    <div
      className={`flex flex-col gap-8 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
    >
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'rgba(232, 132, 92, 0.1)', border: '1px solid rgba(232, 132, 92, 0.2)' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="3" width="14" height="10" rx="2" stroke="#E8845C" strokeWidth="1.4"/>
              <path d="M6 16h6M9 13v3" stroke="#E8845C" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="12.5" cy="6.5" r="2" fill="#E8845C" fillOpacity="0.3" stroke="#E8845C" strokeWidth="1.2"/>
              <path d="M4.5 10.5L7 8l2 2 2-2.5 2.5 3" stroke="#E8845C" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: '#FBF7F4', fontFamily: 'var(--font-sans)' }}>
              Screen Context
            </h2>
            <p className="text-xs" style={{ color: 'rgba(155, 175, 196, 0.6)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Optional — Apple Silicon only
            </p>
          </div>
        </div>
        <p style={{ color: 'rgba(251, 247, 244, 0.55)', lineHeight: '1.6', fontSize: '14px' }}>
          Some apps like WhatsApp, Zoom, Keynote, and Figma don&apos;t share text with the accessibility API.
          Screen context lets Donna read those apps using Apple Vision OCR — so your conversations and
          meetings are captured too.
        </p>
      </div>

      {/* What it reads */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'rgba(251, 247, 244, 0.03)', border: '1px solid rgba(251, 247, 244, 0.06)' }}
      >
        <p className="mb-3 text-xs font-medium" style={{ color: 'rgba(155, 175, 196, 0.5)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Unlocks context from
        </p>
        <div className="grid grid-cols-2 gap-2">
          {['WhatsApp', 'Zoom', 'Keynote', 'Pages', 'Microsoft Excel', 'Figma'].map((app) => (
            <div key={app} className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: 'rgba(232, 132, 92, 0.6)' }} />
              <span style={{ color: 'rgba(251, 247, 244, 0.6)', fontSize: '13px' }}>{app}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy note */}
      <div
        className="flex items-start gap-3 rounded-xl p-4"
        style={{ background: 'rgba(82, 183, 136, 0.05)', border: '1px solid rgba(82, 183, 136, 0.12)' }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
          <path d="M8 2L3 4.5V8c0 3 2 5 5 6 3-1 5-3 5-6V4.5L8 2Z" stroke="#52B788" strokeWidth="1.3"/>
          <path d="M5.5 8l2 2 3-3" stroke="#52B788" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p style={{ color: 'rgba(155, 175, 196, 0.7)', fontSize: '12.5px', lineHeight: '1.5' }}>
          OCR runs entirely on your device using Apple Vision. Screenshots are never stored or sent anywhere.
          Donna only processes the extracted text, not the image itself.
        </p>
      </div>

      {/* Status / CTA */}
      <div className="flex flex-col gap-3">
        {checking ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'rgba(155, 175, 196, 0.4)' }} />
            <span style={{ color: 'rgba(155, 175, 196, 0.5)', fontSize: '13px' }}>Checking permissions…</span>
          </div>
        ) : granted ? (
          <div
            className="flex items-center justify-center gap-2 rounded-xl py-3"
            style={{ background: 'rgba(82, 183, 136, 0.08)', border: '1px solid rgba(82, 183, 136, 0.2)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7l3 3 6-6" stroke="#52B788" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ color: '#52B788', fontSize: '13px' }}>Screen Recording granted</span>
          </div>
        ) : (
          <button
            onClick={handleGrant}
            className="w-full rounded-xl py-3 text-sm font-medium transition-all duration-200 active:scale-[0.98]"
            style={{
              background: prompted ? 'rgba(232, 132, 92, 0.08)' : '#E8845C',
              color: prompted ? '#E8845C' : '#0E1225',
              border: prompted ? '1px solid rgba(232, 132, 92, 0.25)' : 'none',
            }}
          >
            {prompted ? 'Waiting for permission…' : 'Enable Screen Context'}
          </button>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex-1 rounded-xl py-2.5 text-sm transition-all duration-150"
            style={{ color: 'rgba(155, 175, 196, 0.5)', border: '1px solid rgba(251, 247, 244, 0.06)' }}
          >
            Back
          </button>
          <button
            onClick={handleSkip}
            className="flex-1 rounded-xl py-2.5 text-sm transition-all duration-150"
            style={{ color: 'rgba(155, 175, 196, 0.5)', border: '1px solid rgba(251, 247, 244, 0.06)' }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
