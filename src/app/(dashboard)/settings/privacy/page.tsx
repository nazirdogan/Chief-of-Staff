'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Comprehensive list of macOS apps — sorted alphabetically.
// Donna's desktop observer has access to everything visible on screen,
// so this list covers the full range of apps a user may have installed.
const ALL_APPS: string[] = [
  '1Password',
  'Activity Monitor',
  'Adobe Acrobat',
  'Adobe After Effects',
  'Adobe Creative Cloud',
  'Adobe Illustrator',
  'Adobe Lightroom',
  'Adobe Photoshop',
  'Adobe Premiere Pro',
  'Alfred',
  'App Store',
  'Arc',
  'Bartender',
  'Bear',
  'Books',
  'Brave Browser',
  'Calculator',
  'Calendar',
  'Canva',
  'ChatGPT',
  'Claude',
  'CleanMyMac',
  'Contacts',
  'Cursor',
  'Discord',
  'Dropbox',
  'FaceTime',
  'Figma',
  'Finder',
  'Firefox',
  'Font Book',
  'Framer',
  'GitHub Desktop',
  'Google Chrome',
  'Google Drive',
  'Grammarly',
  'Home',
  'Image Capture',
  'IntelliJ IDEA',
  'iStat Menus',
  'iTerm2',
  'Jira',
  'Keynote',
  'Linear',
  'Little Bird',
  'Loom',
  'Mail',
  'Maps',
  'Messages',
  'Microsoft Excel',
  'Microsoft Outlook',
  'Microsoft PowerPoint',
  'Microsoft Teams',
  'Microsoft Word',
  'Miro',
  'Music',
  'News',
  'Notes',
  'Notion',
  'Numbers',
  'Obsidian',
  'Pages',
  'Parallels Desktop',
  'Photo Booth',
  'Photos',
  'Podcasts',
  'Postman',
  'Preview',
  'QuickTime Player',
  'Raycast',
  'Reminders',
  'Safari',
  'Screen Time',
  'Shortcuts',
  'Signal',
  'Sketch',
  'Slack',
  'Spotify',
  'Stocks',
  'Sublime Text',
  'System Settings',
  'TablePlus',
  'Telegram',
  'Terminal',
  'TextEdit',
  'Tot',
  'Tower',
  'Tuple',
  'TV',
  'VS Code',
  'Voice Memos',
  'Warp',
  'Weather',
  'WhatsApp',
  'Wispr Flow',
  'Xcode',
  'Xcode Simulator',
  'Zed',
  'Zoom',
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

export default function PrivacySettingsPage() {
  const [blockedApps, setBlockedApps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/privacy');
      if (res.ok) {
        const data = await res.json();
        setBlockedApps(new Set(data.blocked_apps ?? []));
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
        <h1 className="text-2xl font-bold tracking-tight">Privacy Controls</h1>
        <div className="mt-4 flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Privacy Controls</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Because you granted accessibility access, Donna can read everything visible on your
          screen — across every app. Toggle an app off and Donna will immediately stop capturing
          any context from it.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {ALL_APPS.map((appName) => {
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
    </div>
  );
}
