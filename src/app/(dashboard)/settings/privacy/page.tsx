'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { BackButton } from '@/components/shared/BackButton';

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

export default function PrivacySettingsPage() {
  const [observedApps, setObservedApps] = useState<string[]>([]);
  const [blockedApps, setBlockedApps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/privacy');
      if (res.ok) {
        const data = await res.json();
        setBlockedApps(new Set(data.blocked_apps ?? []));
        setObservedApps(data.observed_apps ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function handleToggle(appName: string, enabled: boolean) {
    setSaving(appName);
    const updated = new Set(blockedApps);

    if (enabled) {
      updated.delete(appName);
    } else {
      updated.add(appName);
    }

    try {
      const res = await fetch('/api/settings/privacy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_apps: [...updated] }),
      });

      if (res.ok) {
        setBlockedApps(updated);
      }
    } catch (err) {
      console.error('Failed to update privacy settings:', err);
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div>
        <BackButton href="/settings" />
        <h1 className="text-2xl font-bold tracking-tight">Privacy Controls</h1>
        <div className="mt-4 flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton href="/settings" />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Privacy Controls</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Donna&apos;s desktop observer reads everything visible on your screen — including every
          app you use. The list below shows every app Donna has seen since you connected. Toggle
          an app off and Donna will immediately stop capturing any context from it.
        </p>
      </div>

      {observedApps.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No apps observed yet. Once you start using the desktop observer, every app that
              appears on your screen will be listed here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {observedApps.map((appName) => {
              const isObserved = !blockedApps.has(appName);

              return (
                <div key={appName} className="flex items-center justify-between">
                  <p className="text-sm font-medium">{appName}</p>
                  <Toggle
                    checked={isObserved}
                    onChange={(v) => handleToggle(appName, v)}
                    disabled={saving === appName}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
