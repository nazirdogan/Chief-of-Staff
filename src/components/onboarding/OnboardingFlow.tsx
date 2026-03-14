'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/db/browser-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { IntegrationConnectStep } from './IntegrationConnectStep';
import { ProjectSetupStep } from './ProjectSetupStep';
import { TaskCalibrationStep } from './CommitmentCalibrationStep';

const STEP_LABELS = ['Connect Apps', 'Projects', 'Calibration'];

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calibrationDecisionsRef = useRef<Record<string, boolean>>({});
  const [projects, setProjects] = useState<string[]>([]);
  const [weeklyPriority, setWeeklyPriority] = useState('');

  async function handleComplete(decisions: Record<string, boolean>) {
    setSaving(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Session expired. Please sign in again.');
        setSaving(false);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;

      const { error: insertError } = await db
        .from('onboarding_data')
        .insert({
          user_id: user.id,
          vip_contacts: [],
          active_projects: projects,
          weekly_priority: weeklyPriority || null,
          completed_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Write task calibration decisions — trains the model
      for (const [taskId, confirmed] of Object.entries(decisions)) {
        await db
          .from('tasks')
          .update({
            user_confirmed: confirmed,
            status: confirmed ? 'open' : 'dismissed',
          })
          .eq('user_id', user.id)
          .eq('id', taskId);
      }

      // Mark onboarding as completed
      const { error: updateError } = await db
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (updateError) throw updateError;

      router.push('/chat');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save onboarding data.'
      );
      setSaving(false);
    }
  }

  const progressPercent = ((step + 1) / STEP_LABELS.length) * 100;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-2xl animate-slide-up">
        <CardHeader className="space-y-4">
          <CardTitle
            className="text-2xl tracking-tight"
            style={{
              fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
              fontWeight: 700,
              fontStyle: 'italic',
            }}
          >
            Welcome to Donna<span style={{ color: '#E8845C' }}>.</span>
          </CardTitle>

          {/* Step indicator dots */}
          <div className="flex items-center gap-2">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300`}
                    style={{
                      background: i < step
                        ? 'rgba(82,183,136,0.12)'
                        : i === step
                          ? '#E8845C'
                          : '#F1EDEA',
                      color: i < step
                        ? '#2D6A4F'
                        : i === step
                          ? '#FAF9F6'
                          : '#8D99AE',
                    }}
                  >
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={`text-[10px] font-medium ${i === step ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div
                    className="mb-4 h-px w-6"
                    style={{ background: i < step ? 'rgba(82,183,136,0.4)' : '#F1EDEA' }}
                  />
                )}
              </div>
            ))}
          </div>

          <Progress value={progressPercent} className="h-1" />
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {step === 0 && (
            <IntegrationConnectStep
              onNext={() => setStep(1)}
            />
          )}

          {step === 1 && (
            <ProjectSetupStep
              initialData={{ projects, weeklyPriority }}
              onNext={(data) => {
                setProjects(data.projects);
                setWeeklyPriority(data.weeklyPriority);
                setStep(2);
              }}
              onBack={() => setStep(0)}
            />
          )}

          {step === 2 && (
            <TaskCalibrationStep
              onNext={(decisions) => {
                calibrationDecisionsRef.current = decisions;
                handleComplete(decisions);
              }}
              onBack={() => setStep(1)}
            />
          )}

          {saving && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Saving your preferences...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
