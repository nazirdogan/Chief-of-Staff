'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from '@/lib/db/queries/notification-preferences';

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

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState<Record<NotificationCategory, boolean>>(
    () => {
      const defaults = {} as Record<NotificationCategory, boolean>;
      for (const cat of NOTIFICATION_CATEGORIES) {
        defaults[cat.id] = true;
      }
      return defaults;
    },
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<NotificationCategory | null>(null);

  useEffect(() => {
    fetch('/api/settings/notifications')
      .then((r) => r.json())
      .then((body) => {
        if (body.data) {
          setPrefs((prev) => ({ ...prev, ...body.data }));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (category: NotificationCategory, enabled: boolean) => {
    // Optimistic update
    setPrefs((prev) => ({ ...prev, [category]: enabled }));
    setSaving(category);

    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, enabled }),
      });
      if (!res.ok) {
        // Revert on failure
        setPrefs((prev) => ({ ...prev, [category]: !enabled }));
        console.error('Failed to update notification preference');
      }
    } catch (err) {
      // Revert on failure
      setPrefs((prev) => ({ ...prev, [category]: !enabled }));
      console.error('Failed to update notification preference:', err);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Notification Settings</h1>
        <p className="mt-1 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Notification Settings</h1>
      <p className="mt-1 text-muted-foreground">
        Choose which proactive notifications Donna sends you.
      </p>

      <div className="mt-6 grid gap-4">
        {NOTIFICATION_CATEGORIES.map((cat) => (
          <Card key={cat.id}>
            <CardHeader>
              <CardTitle className="text-base">{cat.label}</CardTitle>
              <CardDescription>{cat.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {prefs[cat.id] ? 'Enabled' : 'Disabled'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {prefs[cat.id]
                      ? 'Donna will notify you for this category.'
                      : 'Donna will stay silent for this category.'}
                  </p>
                </div>
                <Toggle
                  checked={prefs[cat.id]}
                  onChange={(v) => handleToggle(cat.id, v)}
                  disabled={saving === cat.id}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
