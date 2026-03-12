'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { PendingActionType, UserAutonomySettings } from '@/lib/db/types';

interface ActionConfig {
  type: PendingActionType;
  label: string;
  description: string;
  tier1Locked?: boolean;
  note?: string;
}

const ACTION_CONFIGS: ActionConfig[] = [
  {
    type: 'create_task',
    label: 'Create tasks',
    description: 'Donna creates tasks from commitments and action items found in your messages.',
  },
  {
    type: 'archive_email',
    label: 'Archive emails',
    description: 'Donna archives low-engagement newsletters and automated emails.',
    note: 'Donna learns what you engage with. New senders are never auto-archived until Donna has observed your behaviour for at least 14 days.',
  },
  {
    type: 'update_notion_page',
    label: 'Update Notion pages',
    description: 'Donna updates your Notion pages with meeting notes and action items.',
  },
  {
    type: 'send_message',
    label: 'Send messages',
    description: 'Donna sends follow-up messages via Slack on your behalf.',
  },
  {
    type: 'reschedule_meeting',
    label: 'Reschedule meetings',
    description: 'Donna proposes new times for conflicting or low-priority meetings.',
  },
  {
    type: 'create_calendar_event',
    label: 'Create calendar events',
    description: 'Donna creates calendar events from commitments and scheduling requests.',
  },
  {
    type: 'send_email',
    label: 'Send emails',
    description: 'Donna drafts and sends email replies on your behalf.',
    tier1Locked: true,
  },
];

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        ${checked ? 'bg-primary' : 'bg-muted'}
        ${disabled ? 'cursor-not-allowed opacity-50' : ''}
      `}
    >
      <span
        className={`
          pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
}

export default function AutonomySettingsPage() {
  const [settings, setSettings] = useState<UserAutonomySettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings/autonomy')
      .then((r) => r.json())
      .then((data) => setSettings(data.settings ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getSettingFor = useCallback(
    (actionType: PendingActionType) => {
      return settings.find((s) => s.action_type === actionType);
    },
    [settings],
  );

  const handleToggle = async (
    actionType: PendingActionType,
    field: 'tier_1_enabled' | 'tier_2_enabled',
    value: boolean,
  ) => {
    setSaving(actionType + field);
    try {
      const res = await fetch('/api/settings/autonomy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_type: actionType, [field]: value }),
      });
      const data = await res.json();
      if (res.ok && data.setting) {
        setSettings((prev) => {
          const idx = prev.findIndex((s) => s.action_type === actionType);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = data.setting;
            return updated;
          }
          return [...prev, data.setting];
        });
      }
    } catch (err) {
      console.error('Failed to update setting:', err);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Autonomy Settings</h1>
        <p className="mt-1 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Autonomy Settings</h1>
      <p className="mt-1 text-muted-foreground">
        Control how independently Donna acts on your behalf.
      </p>

      <div className="mt-6 grid gap-4">
        {ACTION_CONFIGS.map((config) => {
          const setting = getSettingFor(config.type);
          const tier1Enabled = setting?.tier_1_enabled ?? false;
          const tier2Enabled = setting?.tier_2_enabled ?? true;

          return (
            <Card key={config.type}>
              <CardHeader>
                <CardTitle className="text-base">{config.label}</CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Auto-execute silently (Tier 1)</p>
                    <p className="text-xs text-muted-foreground">
                      {config.tier1Locked
                        ? 'Locked — emails always require full review.'
                        : 'Donna executes without asking. Full audit log recorded.'}
                    </p>
                  </div>
                  <Toggle
                    checked={tier1Enabled}
                    onChange={(v) => handleToggle(config.type, 'tier_1_enabled', v)}
                    disabled={config.tier1Locked || saving === config.type + 'tier_1_enabled'}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">One-tap confirm (Tier 2)</p>
                    <p className="text-xs text-muted-foreground">
                      A quick toast notification — tap to approve or dismiss.
                    </p>
                  </div>
                  <Toggle
                    checked={tier2Enabled}
                    onChange={(v) => handleToggle(config.type, 'tier_2_enabled', v)}
                    disabled={saving === config.type + 'tier_2_enabled'}
                  />
                </div>

                {config.note && (
                  <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    {config.note}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
