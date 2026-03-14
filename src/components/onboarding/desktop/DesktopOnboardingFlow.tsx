'use client';

import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/db/browser-client';
import { startObserver } from '@/lib/desktop-observer/client';
import { WelcomeStep } from './WelcomeStep';
import { AccessibilityStep } from './AccessibilityStep';
import { ScreenRecordingStep } from './ScreenRecordingStep';
import { ConnectDataStep } from './ConnectDataStep';
import { BriefingSetupStep } from './BriefingSetupStep';
import { OnboardingCompleteStep } from './OnboardingCompleteStep';

const STEPS = [
  'welcome',
  'accessibility',
  'screen-recording',
  'connect',
  'briefing',
  'complete',
] as const;

type Step = (typeof STEPS)[number];

const STEP_META: Partial<Record<Step, { label: string; number: number }>> = {
  accessibility: { label: 'Permissions', number: 1 },
  'screen-recording': { label: 'Screen', number: 2 },
  connect: { label: 'Connect', number: 3 },
  briefing: { label: 'Configure', number: 4 },
};

export function DesktopOnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const briefingSettingsRef = useRef<{
    briefingTime: string;
    timezone: string;
    autonomyLevel: 'conservative' | 'balanced' | 'autonomous';
  }>({
    briefingTime: '07:30',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    autonomyLevel: 'balanced',
  });

  const goTo = useCallback((s: Step) => {
    setTransitioning(true);
    setTimeout(() => {
      setStep(s);
      setTransitioning(false);
    }, 250);
  }, []);

  async function handleComplete() {
    setSaving(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Session expired. Please sign in again.');
        setSaving(false);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const settings = briefingSettingsRef.current;

      await db.from('onboarding_data').insert({
        user_id: user.id,
        vip_contacts: [],
        active_projects: [],
        weekly_priority: null,
        briefing_time: settings.briefingTime,
        timezone: settings.timezone,
        autonomy_level: settings.autonomyLevel,
        completed_at: new Date().toISOString(),
      });

      const tierMap = { conservative: 3, balanced: 2, autonomous: 1 };
      await db.from('user_settings').upsert({
        user_id: user.id,
        briefing_time: settings.briefingTime,
        timezone: settings.timezone,
        default_autonomy_tier: tierMap[settings.autonomyLevel],
      }, { onConflict: 'user_id' });

      const { error: updateError } = await db
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (updateError) throw updateError;

      router.push('/getting-ready');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save onboarding data.');
      setSaving(false);
    }
  }

  const progressSteps: readonly Step[] = STEPS.filter((s) => s !== 'welcome' && s !== 'complete');
  const currentProgressIndex = progressSteps.indexOf(step);
  const showProgress = step !== 'welcome' && step !== 'complete';
  const isWelcome = step === 'welcome';

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-8 py-10"
      style={{ background: '#0E1225' }}
    >
      {/* Ambient background glow */}
      <div
        className="animate-glow-pulse pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,132,92,0.05) 0%, transparent 70%)',
        }}
      />

      {/* Subtle grain overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: '128px 128px',
        }}
      />

      <div className={`relative z-10 w-full transition-all duration-500 ${isWelcome ? 'max-w-[820px]' : 'max-w-[640px]'}`}>
        {/* Step progress — refined horizontal stepper */}
        {showProgress && (
          <div className="mb-8 flex items-center justify-center gap-2 animate-fade-in">
            {progressSteps.map((s, i) => {
              const meta = STEP_META[s];
              const isCurrent = s === step;
              const isDone = i < currentProgressIndex;

              return (
                <div key={s} className="flex items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-500"
                      style={{
                        background: isDone
                          ? 'rgba(82, 183, 136, 0.15)'
                          : isCurrent
                            ? '#E8845C'
                            : 'rgba(251, 247, 244, 0.05)',
                        border: isDone
                          ? '1px solid rgba(82, 183, 136, 0.3)'
                          : isCurrent
                            ? '1px solid rgba(232, 132, 92, 0.5)'
                            : '1px solid rgba(251, 247, 244, 0.08)',
                      }}
                    >
                      {isDone ? (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="animate-check-pop">
                          <path d="M2 6L5 9L10 3" stroke="#52B788" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <span
                          className="text-[11px] font-medium"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            color: isCurrent ? '#FBF7F4' : 'rgba(155, 175, 196, 0.4)',
                          }}
                        >
                          {meta?.number}
                        </span>
                      )}
                    </div>
                    <span
                      className="text-[10px] font-medium tracking-wide transition-colors duration-300"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        color: isCurrent
                          ? 'rgba(251, 247, 244, 0.7)'
                          : isDone
                            ? 'rgba(82, 183, 136, 0.5)'
                            : 'rgba(155, 175, 196, 0.2)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {meta?.label}
                    </span>
                  </div>
                  {i < progressSteps.length - 1 && (
                    <div
                      className="mb-5 mx-2 h-px w-10 transition-colors duration-500"
                      style={{
                        background: isDone
                          ? 'rgba(82, 183, 136, 0.25)'
                          : 'rgba(251, 247, 244, 0.06)',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Main card */}
        <div
          className="overflow-hidden rounded-2xl"
          style={{
            background: 'linear-gradient(180deg, rgba(45, 49, 84, 0.6) 0%, rgba(27, 31, 58, 0.8) 100%)',
            border: '1px solid rgba(251, 247, 244, 0.06)',
            boxShadow: '0 0 80px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(251, 247, 244, 0.03)',
          }}
        >
          {/* Dawn accent line at top — the meridian */}
          {showProgress && (
            <div className="relative h-px w-full overflow-hidden">
              <div
                className="absolute h-full transition-all duration-700 ease-out"
                style={{
                  width: `${((currentProgressIndex + 1) / progressSteps.length) * 100}%`,
                  background: 'linear-gradient(90deg, #E8845C, rgba(232, 132, 92, 0.3))',
                }}
              />
            </div>
          )}

          <div
            className={`transition-all duration-250 ${
              transitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
            } ${isWelcome ? 'p-0' : 'px-10 py-10'}`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            {step === 'welcome' && (
              <WelcomeStep onNext={() => goTo('accessibility')} />
            )}
            {step === 'accessibility' && (
              <AccessibilityStep
                onNext={() => goTo('screen-recording')}
                onBack={() => goTo('welcome')}
              />
            )}
            {step === 'screen-recording' && (
              <ScreenRecordingStep
                onNext={() => {
                  // Start observer silently in background — Donna begins learning immediately
                  startObserver().catch(() => {});
                  goTo('connect');
                }}
                onBack={() => goTo('accessibility')}
              />
            )}
            {step === 'connect' && (
              <ConnectDataStep
                onNext={() => goTo('briefing')}
                onBack={() => goTo('screen-recording')}
              />
            )}
            {step === 'briefing' && (
              <BriefingSetupStep
                onNext={(settings) => {
                  briefingSettingsRef.current = settings;
                  goTo('complete');
                }}
                onBack={() => goTo('connect')}
              />
            )}
            {step === 'complete' && (
              <OnboardingCompleteStep
                briefingTime={briefingSettingsRef.current.briefingTime}
                saving={saving}
                error={error}
                onFinish={handleComplete}
              />
            )}
          </div>
        </div>

        {/* Bottom security note */}
        <p
          className="mt-5 text-center text-[10px] tracking-wide animate-fade-in"
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'rgba(155, 175, 196, 0.25)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Your data never leaves your control
        </p>
      </div>
    </div>
  );
}
