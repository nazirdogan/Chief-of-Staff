'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/db/browser-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { VIPSetupStep } from './VIPSetupStep';
import { ProjectSetupStep } from './ProjectSetupStep';
import { CommitmentCalibrationStep } from './CommitmentCalibrationStep';
import { TelegramConnectStep } from './TelegramConnectStep';

interface VIPContact {
  email: string;
  name: string;
}

const STEP_LABELS = ['VIP Contacts', 'Projects', 'Calibration', 'Telegram'];

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

      router.push('/');
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
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Welcome to Chief of Staff
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Step {step + 1} of {STEP_LABELS.length}: {STEP_LABELS[step]}
          </p>
          <Progress value={progressPercent} className="mt-2" />
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {step === 0 && (
            <VIPSetupStep
              initialContacts={vipContacts}
              onNext={(contacts) => {
                setVipContacts(contacts);
                setStep(1);
              }}
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
            <CommitmentCalibrationStep
              onNext={(decisions) => {
                calibrationDecisionsRef.current = decisions;
                setStep(3);
              }}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <TelegramConnectStep
              onNext={() => handleComplete(calibrationDecisionsRef.current)}
              onBack={() => setStep(2)}
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
