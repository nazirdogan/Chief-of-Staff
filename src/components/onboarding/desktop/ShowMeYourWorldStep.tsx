'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  startObserver,
  getObserverStatus,
  onContextChange,
} from '@/lib/desktop-observer/client';
import type { DesktopContext } from '@/lib/desktop-observer/types';

interface ShowMeYourWorldStepProps {
  onNext: () => void;
  onBack: () => void;
}

interface AppGuide {
  name: string;
  bundleHints: string[];
  instruction: string;
}

const APP_GUIDES: AppGuide[] = [
  { name: 'WhatsApp', bundleHints: ['whatsapp', 'net.whatsapp'], instruction: 'Open WhatsApp and slowly scroll through your recent chats' },
  { name: 'Messages', bundleHints: ['com.apple.MobileSMS', 'messages'], instruction: 'Open Messages and scroll through recent conversations' },
  { name: 'Slack', bundleHints: ['com.tinyspeck.slackmacgap', 'slack'], instruction: 'Open Slack and browse recent channels and DMs' },
  { name: 'Telegram', bundleHints: ['telegram', 'ph.telegra'], instruction: 'Open Telegram and scroll through your recent chats' },
  { name: 'Discord', bundleHints: ['com.hnc.Discord', 'discord'], instruction: 'Open Discord and check your recent DMs' },
];

export function ShowMeYourWorldStep({ onNext, onBack }: ShowMeYourWorldStepProps) {
  const [observerStarted, setObserverStarted] = useState(false);
  const [currentAppIndex, setCurrentAppIndex] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<string>>(new Set());
  const [captureCount, setCaptureCount] = useState(0);
  const [detectedApp, setDetectedApp] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const captureCountRef = useRef(0);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      const status = await getObserverStatus();
      if (status?.running) { if (active) setObserverStarted(true); return; }
      const started = await startObserver();
      if (active) setObserverStarted(started);
    }
    init();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const guide = APP_GUIDES[currentAppIndex];
    if (!guide || !observerStarted) return;

    const unsubscribe = onContextChange((ctx: DesktopContext) => {
      captureCountRef.current += 1;
      setCaptureCount(captureCountRef.current);
      const app = ctx.active_app.toLowerCase();
      const bundle = ctx.bundle_id.toLowerCase();
      const match = guide.bundleHints.some((h) => app.includes(h) || bundle.includes(h));
      setDetectedApp(match ? guide.name : null);
      setIsCapturing(match);
    });
    return unsubscribe;
  }, [currentAppIndex, observerStarted]);

  const handleDone = useCallback(() => {
    const name = APP_GUIDES[currentAppIndex]?.name;
    if (name) setCompletedApps((prev) => new Set(prev).add(name));
    if (currentAppIndex < APP_GUIDES.length - 1) {
      setCurrentAppIndex((i) => i + 1);
      setDetectedApp(null);
      setIsCapturing(false);
    } else onNext();
  }, [currentAppIndex, onNext]);

  const handleSkip = useCallback(() => {
    if (currentAppIndex < APP_GUIDES.length - 1) {
      setCurrentAppIndex((i) => i + 1);
      setDetectedApp(null);
      setIsCapturing(false);
    } else onNext();
  }, [currentAppIndex, onNext]);

  if (!observerStarted) {
    return (
      <div className="flex flex-col items-center py-16">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#9BAFC4' }} />
        <p className="mt-3 text-[13px]" style={{ color: 'rgba(155,175,196,0.5)' }}>Starting observer...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <h2
        className="transition-all duration-700"
        style={{
          fontSize: '22px', fontStyle: 'italic', color: '#FBF7F4',
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        Show Donna your world
      </h2>
      <p
        className="mt-3 max-w-[340px] text-[13px] leading-[1.65] transition-all duration-700"
        style={{
          color: '#9BAFC4',
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)',
          transitionDelay: '100ms', transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        Open each app and scroll through recent conversations.
        30 seconds per app is all it takes.
      </p>

      {/* Live capture indicator */}
      {isCapturing && detectedApp && (
        <div
          className="mt-5 flex items-center gap-2.5 rounded-full px-4 py-2 animate-fade-in"
          style={{ background: 'rgba(232, 132, 92, 0.08)', border: '1px solid rgba(232, 132, 92, 0.15)' }}
        >
          <div className="relative">
            <div className="h-2 w-2 rounded-full" style={{ background: '#E8845C' }} />
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: '#E8845C', animation: 'ring-expand 1.5s ease-out infinite' }}
            />
          </div>
          <span className="text-[12px]" style={{ color: 'rgba(232, 132, 92, 0.8)' }}>
            Reading {detectedApp}
          </span>
          <span
            className="text-[11px] font-medium"
            style={{ fontFamily: 'var(--font-mono)', color: '#E8845C', animation: 'count-tick 0.3s ease' }}
          >
            {captureCount}
          </span>
        </div>
      )}

      {/* App list */}
      <div
        className="mt-6 w-full space-y-1.5 transition-all duration-700"
        style={{
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)',
          transitionDelay: '250ms', transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {APP_GUIDES.map((guide, i) => {
          const isActive = i === currentAppIndex;
          const isDone = completedApps.has(guide.name);
          const isFuture = i > currentAppIndex;
          const isActiveCapturing = isActive && isCapturing;

          return (
            <div
              key={guide.name}
              className="flex items-center gap-3 rounded-xl p-3.5 transition-all duration-400"
              style={{
                background: isActiveCapturing
                  ? 'rgba(232, 132, 92, 0.06)'
                  : isActive
                    ? 'rgba(14, 18, 37, 0.5)'
                    : isDone
                      ? 'rgba(82, 183, 136, 0.04)'
                      : 'transparent',
                border: isActiveCapturing
                  ? '1px solid rgba(232, 132, 92, 0.15)'
                  : isActive
                    ? '1px solid rgba(251, 247, 244, 0.06)'
                    : isDone
                      ? '1px solid rgba(82, 183, 136, 0.1)'
                      : '1px solid transparent',
                opacity: isFuture ? 0.3 : 1,
              }}
            >
              {/* Status */}
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-300"
                style={{
                  background: isDone
                    ? 'rgba(82, 183, 136, 0.1)'
                    : isActive
                      ? 'rgba(232, 132, 92, 0.08)'
                      : 'rgba(251, 247, 244, 0.03)',
                }}
              >
                {isDone ? (
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="none" className="animate-check-pop">
                    <path d="M2 6L5 9L10 3" stroke="#52B788" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : isActive ? (
                  isCapturing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: '#E8845C' }} />
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M4 2L9 6L4 10" stroke="#E8845C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )
                ) : (
                  <span className="text-[10px] font-medium" style={{ fontFamily: 'var(--font-mono)', color: 'rgba(155,175,196,0.3)' }}>
                    {i + 1}
                  </span>
                )}
              </div>

              <div className="flex-1 text-left min-w-0">
                <p className="text-[13px] font-medium" style={{ color: isFuture ? 'rgba(155,175,196,0.4)' : '#FBF7F4' }}>
                  {guide.name}
                </p>
                {isActive && (
                  <p className="mt-0.5 text-[11px] leading-snug" style={{ color: 'rgba(155, 175, 196, 0.5)' }}>
                    {guide.instruction}
                  </p>
                )}
              </div>

              {isActive && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={handleSkip}
                    className="rounded-md p-1.5 text-[11px] transition-colors duration-200"
                    style={{ color: 'rgba(155,175,196,0.4)' }}
                    title="Skip"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleDone}
                    className="rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all duration-200"
                    style={{
                      background: 'rgba(251, 247, 244, 0.06)',
                      border: '1px solid rgba(251, 247, 244, 0.08)',
                      color: 'rgba(251, 247, 244, 0.7)',
                    }}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Snapshot count */}
      {!isCapturing && captureCount > 0 && (
        <p className="mt-4 text-[10px]" style={{ fontFamily: 'var(--font-mono)', color: 'rgba(155,175,196,0.3)', letterSpacing: '0.05em' }}>
          {captureCount} snapshots captured
        </p>
      )}

      <div className="mt-7 flex w-full items-center justify-between">
        <button onClick={onBack} className="text-[12px] font-medium transition-colors hover:underline" style={{ color: 'rgba(155,175,196,0.4)' }}>
          Back
        </button>
        <button onClick={onNext} className="text-[12px] font-medium transition-colors hover:underline" style={{ color: 'rgba(155,175,196,0.4)' }}>
          Skip remaining
        </button>
      </div>
    </div>
  );
}
