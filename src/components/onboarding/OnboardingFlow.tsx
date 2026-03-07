'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/db/browser-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { IntegrationConnectStep } from './IntegrationConnectStep';
import { VIPSetupStep } from './VIPSetupStep';
import { ProjectSetupStep } from './ProjectSetupStep';
import { CommitmentCalibrationStep } from './CommitmentCalibrationStep';
import { TelegramConnectStep } from './TelegramConnectStep';

interface VIPContact {
  email: string;
  name: string;
}

const STEP_LABELS = ['Connect Apps', 'VIP Contacts', 'Projects', 'Calibration', 'Telegram'];

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calibrationDecisionsRef = useRef<Record<string, boolean>>({});
  const [vipContacts, setVipContacts] = useState<VIPContact[]>([]);
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

      // Save onboarding data
      const { error: insertError } = await db
        .from('onboarding_data')
        .insert({
          user_id: user.id,
          vip_contacts: vipContacts.map((c) => c.email),
          active_projects: projects,
          weekly_priority: weeklyPriority || null,
          completed_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Upsert VIP contacts — create or update each contact with is_vip = true
      for (const contact of vipContacts) {
        if (!contact.email.trim()) continue;

        const { data: existing } = await db
          .from('contacts')
          .select('id, relationship_score')
          .eq('user_id', user.id)
          .eq('email', contact.email.trim().toLowerCase())
          .single();

        if (existing) {
          await db
            .from('contacts')
            .update({
              is_vip: true,
              name: contact.name.trim() || undefined,
              relationship_score: Math.max(
                (existing as { relationship_score: number | null }).relationship_score ?? 0,
                80
              ),
            })
            .eq('id', (existing as { id: string }).id);
        } else {
          await db.from('contacts').insert({
            user_id: user.id,
            email: contact.email.trim().toLowerCase(),
            name: contact.name.trim() || null,
            is_vip: true,
            relationship_score: 80,
            interaction_count_30d: 0,
            open_commitments_count: 0,
            is_cold: false,
          });
        }
      }

      // Write commitment calibration decisions — trains the model
      for (const [commitmentId, confirmed] of Object.entries(decisions)) {
        await db
          .from('commitments')
          .update({
            user_confirmed: confirmed,
            status: confirmed ? 'open' : 'dismissed',
          })
          .eq('user_id', user.id)
          .eq('id', commitmentId);
      }

      // Mark onboarding as completed
      const { error: updateError } = await db
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (updateError) throw updateError;

      router.push('/dashboard');
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
          <CardTitle className="text-2xl font-bold tracking-tight">
            Welcome to Chief of Staff
          </CardTitle>

          {/* Step indicator dots */}
          <div className="flex items-center gap-2">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
                      i < step
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : i === step
                          ? 'bg-foreground text-background shadow-sm'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={`text-[10px] font-medium ${i === step ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`mb-4 h-px w-6 ${i < step ? 'bg-green-300 dark:bg-green-700' : 'bg-muted'}`} />
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
            <VIPSetupStep
              initialContacts={vipContacts}
              onNext={(contacts) => {
                setVipContacts(contacts);
                setStep(2);
              }}
              onBack={() => setStep(0)}
            />
          )}

          {step === 2 && (
            <ProjectSetupStep
              initialData={{ projects, weeklyPriority }}
              onNext={(data) => {
                setProjects(data.projects);
                setWeeklyPriority(data.weeklyPriority);
                setStep(3);
              }}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <CommitmentCalibrationStep
              onNext={(decisions) => {
                calibrationDecisionsRef.current = decisions;
                setStep(4);
              }}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && (
            <TelegramConnectStep
              onNext={() => handleComplete(calibrationDecisionsRef.current)}
              onBack={() => setStep(3)}
              onSkip={() => handleComplete(calibrationDecisionsRef.current)}
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
