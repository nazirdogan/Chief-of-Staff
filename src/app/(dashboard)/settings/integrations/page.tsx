'use client';

import { useCallback, useEffect, useState } from 'react';
import Nango from '@nangohq/frontend';
import { OAuthConsentScreen } from '@/components/onboarding/OAuthConsentScreen';
import { BrandIcon } from '@/components/shared/BrandIcon';
import {
  Loader2,
  Check,
  AlertCircle,
  X,
  Monitor,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { IntegrationProvider, UserIntegration } from '@/lib/db/types';

interface IntegrationConfig {
  nangoProvider: string;
  dbProvider: IntegrationProvider;
  label: string;
  permissions: Array<{ label: string; description: string }>;
  category: string;
}

const INTEGRATIONS: IntegrationConfig[] = [
  // EMAIL & CALENDAR
  { nangoProvider: 'google-mail', dbProvider: 'gmail', label: 'Gmail', category: 'Email & Calendar', permissions: [{ label: 'Read your emails', description: 'We read email metadata and content to generate your daily briefing. Raw email bodies are never stored.' }] },
  { nangoProvider: 'google-calendar', dbProvider: 'google_calendar', label: 'Google Calendar', category: 'Email & Calendar', permissions: [{ label: 'Read your calendar events', description: "We read event titles, times, and attendees for your today's schedule and meeting prep." }] },
  { nangoProvider: 'microsoft', dbProvider: 'outlook', label: 'Outlook', category: 'Email & Calendar', permissions: [{ label: 'Read your emails', description: 'We read email metadata and content to generate your daily briefing. Raw email bodies are never stored.' }, { label: 'Read your calendar', description: "We read event titles, times, and attendees for your today's schedule and meeting prep." }] },
  { nangoProvider: 'icloud', dbProvider: 'apple_icloud_mail', label: 'iCloud Mail', category: 'Email & Calendar', permissions: [{ label: 'Read your iCloud emails', description: 'We read iCloud Mail metadata and content for your daily briefing. Raw bodies are never stored.' }] },
  { nangoProvider: 'calendly', dbProvider: 'calendly', label: 'Calendly', category: 'Email & Calendar', permissions: [{ label: 'Read your scheduled events', description: 'We fetch upcoming bookings so you are aware of scheduled meetings before they happen.' }] },
  // MESSAGING
  { nangoProvider: 'slack', dbProvider: 'slack', label: 'Slack', category: 'Messaging', permissions: [{ label: 'Read channel messages and DMs', description: 'We read recent messages to surface important conversations in your briefing.' }] },
  { nangoProvider: 'microsoft-teams', dbProvider: 'microsoft_teams', label: 'Teams', category: 'Messaging', permissions: [{ label: 'Read your Teams messages and DMs', description: 'We read Teams messages where you are mentioned or sent direct messages.' }] },
  { nangoProvider: 'linkedin', dbProvider: 'linkedin', label: 'LinkedIn', category: 'Messaging', permissions: [{ label: 'Read your LinkedIn messages', description: 'We read unread LinkedIn conversations to surface important professional messages.' }] },
  { nangoProvider: 'twitter', dbProvider: 'twitter', label: 'X / Twitter', category: 'Messaging', permissions: [{ label: 'Read your Twitter/X direct messages', description: 'We read unread DMs so important messages surface in your daily briefing.' }] },
  // DOCUMENTS
  { nangoProvider: 'notion', dbProvider: 'notion', label: 'Notion', category: 'Documents', permissions: [{ label: 'Read your pages and databases', description: 'We index your Notion content for meeting prep and context retrieval.' }] },
  { nangoProvider: 'google-drive', dbProvider: 'google_drive', label: 'Google Drive', category: 'Documents', permissions: [{ label: 'Read your documents', description: 'We index Docs and files for meeting prep and context. Raw content is never stored.' }] },
  { nangoProvider: 'dropbox', dbProvider: 'dropbox', label: 'Dropbox', category: 'Documents', permissions: [{ label: 'Read your files', description: 'We index text files for meeting prep and context. Raw content is never stored.' }] },
  { nangoProvider: 'microsoft', dbProvider: 'onedrive', label: 'OneDrive', category: 'Documents', permissions: [{ label: 'Read your OneDrive files', description: 'We index documents for meeting prep and context. Raw content is never stored.' }] },
  // TASK MANAGEMENT
  { nangoProvider: 'asana', dbProvider: 'asana', label: 'Asana', category: 'Tasks', permissions: [{ label: 'Read tasks assigned to you', description: 'We fetch your open Asana tasks so they surface in your daily briefing.' }] },
  { nangoProvider: 'monday', dbProvider: 'monday', label: 'Monday', category: 'Tasks', permissions: [{ label: 'Read board items assigned to you', description: 'We fetch your Monday.com items so they surface in your daily briefing.' }] },
  { nangoProvider: 'jira', dbProvider: 'jira', label: 'Jira', category: 'Tasks', permissions: [{ label: 'Read issues assigned to you', description: 'We fetch your open Jira issues so they surface in your daily briefing.' }] },
  { nangoProvider: 'linear', dbProvider: 'linear', label: 'Linear', category: 'Tasks', permissions: [{ label: 'Read issues assigned to you', description: 'We fetch your open Linear issues so they surface in your daily briefing.' }] },
  { nangoProvider: 'clickup', dbProvider: 'clickup', label: 'ClickUp', category: 'Tasks', permissions: [{ label: 'Read tasks assigned to you', description: 'We fetch your open ClickUp tasks so they surface in your daily briefing.' }] },
  { nangoProvider: 'trello', dbProvider: 'trello', label: 'Trello', category: 'Tasks', permissions: [{ label: 'Read cards assigned to you', description: 'We fetch your open Trello cards so they surface in your daily briefing.' }] },
  // CRM
  { nangoProvider: 'hubspot', dbProvider: 'hubspot', label: 'HubSpot', category: 'CRM', permissions: [{ label: 'Read deals, contacts, and tasks', description: 'We surface your open deals and tasks so you stay on top of your pipeline.' }] },
  { nangoProvider: 'salesforce', dbProvider: 'salesforce', label: 'Salesforce', category: 'CRM', permissions: [{ label: 'Read opportunities, tasks, and contacts', description: 'We surface open opportunities and tasks so your pipeline is always front of mind.' }] },
  { nangoProvider: 'pipedrive', dbProvider: 'pipedrive', label: 'Pipedrive', category: 'CRM', permissions: [{ label: 'Read deals and activities', description: 'We surface open deals and upcoming activities so you never miss a follow-up.' }] },
  // CODE
  { nangoProvider: 'github', dbProvider: 'github', label: 'GitHub', category: 'Code', permissions: [{ label: 'Read PR reviews requested and @mentions', description: 'We surface PRs awaiting your review and issues where you are mentioned.' }] },
];

const CATEGORIES = Array.from(new Set(INTEGRATIONS.map((i) => i.category)));

// Desktop Observer apps captured via macOS accessibility
const DESKTOP_OBSERVER_APPS = [
  'WhatsApp', 'Messages', 'Telegram', 'Signal', 'Discord',
  'Slack (desktop)', 'Teams (desktop)', 'Mail', 'Calendar',
  'Notion', 'Figma', 'Chrome', 'Safari', 'Arc',
];

type ObserverState = 'unavailable' | 'no_permission' | 'active' | 'inactive';

export default function IntegrationsSettingsPage() {
  const [integrations, setIntegrations] = useState<UserIntegration[]>([]);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [consentProvider, setConsentProvider] = useState<IntegrationConfig | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  // Desktop Observer state
  const [observerState, setObserverState] = useState<ObserverState>('unavailable');
  const [observerLoading, setObserverLoading] = useState(false);
  const [observerStats, setObserverStats] = useState<{ apps_observed: number; context_changes_emitted: number } | null>(null);

  // Check desktop observer availability on mount
  useEffect(() => {
    async function checkObserver() {
      // Only works in Tauri shell
      if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
        setObserverState('unavailable');
        return;
      }
      try {
        const { checkAccessibility, getObserverStatus } = await import('@/lib/desktop-observer/client');
        const hasPermission = await checkAccessibility();
        if (!hasPermission) {
          setObserverState('no_permission');
          return;
        }
        const status = await getObserverStatus();
        if (status) {
          setObserverStats({ apps_observed: status.apps_observed, context_changes_emitted: status.context_changes_emitted });
          setObserverState(status.running ? 'active' : 'inactive');
        } else {
          setObserverState('inactive');
        }
      } catch {
        setObserverState('unavailable');
      }
    }
    checkObserver();
  }, []);

  async function handleRequestPermission() {
    setObserverLoading(true);
    try {
      const { requestAccessibility } = await import('@/lib/desktop-observer/client');
      const granted = await requestAccessibility();
      if (granted) {
        setObserverState('inactive');
      }
    } catch {
      // ignore
    } finally {
      setObserverLoading(false);
    }
  }

  async function handleToggleObserver() {
    setObserverLoading(true);
    try {
      if (observerState === 'active') {
        const { stopObserver } = await import('@/lib/desktop-observer/client');
        await stopObserver();
        setObserverState('inactive');
      } else {
        const { startObserver } = await import('@/lib/desktop-observer/client');
        const started = await startObserver();
        setObserverState(started ? 'active' : 'inactive');
      }
    } catch {
      // ignore
    } finally {
      setObserverLoading(false);
    }
  }

  const fetchIntegrations = useCallback(async () => {
    try {
      const [intRes, availRes] = await Promise.all([
        fetch('/api/integrations'),
        fetch('/api/integrations/available'),
      ]);
      if (intRes.ok) {
        const data = await intRes.json();
        setIntegrations(data.integrations);
      }
      if (availRes.ok) {
        const data = await availRes.json();
        setAvailableProviders(data.available);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const syncIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);

  // Poll to detect completed OAuth flows
  useEffect(() => {
    const interval = setInterval(syncIntegrations, 4000);
    return () => clearInterval(interval);
  }, [syncIntegrations]);

  function getStatus(dbProvider: IntegrationProvider): UserIntegration | undefined {
    return integrations.find((i) => i.provider === dbProvider);
  }

  async function handleConnect(config: IntegrationConfig) {
    setConnecting(true);
    setConnectError(null);

    try {
      // 1. Get a connect session token from our backend (creates Nango session)
      const res = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: config.nangoProvider }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to start connection' }));
        throw new Error(err.error || 'Failed to start connection');
      }

      const { sessionToken } = await res.json();

      // 2. Create a Nango frontend instance with the session token
      const nango = new Nango({ connectSessionToken: sessionToken });

      // 3. This opens the real OAuth login page in a popup
      await nango.auth(config.nangoProvider);

      // 4. OAuth completed — sync connection to our DB
      await syncIntegrations();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      // Don't show error if user simply closed the popup
      if (!message.includes('closed') && !message.includes('cancelled') && !message.includes('canceled')) {
        setConnectError(`Failed to connect ${config.label}: ${message}`);
      }
    } finally {
      setConnecting(false);
      setConsentProvider(null);
    }
  }

  async function handleDisconnect(config: IntegrationConfig) {
    setDisconnecting(config.dbProvider);
    try {
      const res = await fetch('/api/integrations/disconnect', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: config.dbProvider }) });
      if (res.ok) await fetchIntegrations();
    } finally {
      setDisconnecting(null);
    }
  }

  if (consentProvider) {
    return (
      <div className="py-8">
        <OAuthConsentScreen
          provider={consentProvider.nangoProvider}
          providerLabel={consentProvider.label}
          permissions={consentProvider.permissions}
          onConsent={() => handleConnect(consentProvider)}
          onCancel={() => setConsentProvider(null)}
          loading={connecting}
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Integrations</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Connect your accounts to power your daily briefing.
      </p>

      {connectError && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{connectError}</span>
          <button onClick={() => setConnectError(null)} className="ml-auto">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Desktop Observer Section */}
      <div className="mt-6 rounded-lg border p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Monitor className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Desktop Observer</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Captures activity from apps on your Mac — WhatsApp, Messages, Telegram, and more.
                Uses macOS Accessibility to read on-screen text. No API needed.
              </p>
            </div>
          </div>

          <div className="ml-4 shrink-0">
            {observerState === 'unavailable' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                Desktop app required
              </span>
            )}
            {observerState === 'no_permission' && (
              <button
                onClick={handleRequestPermission}
                disabled={observerLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {observerLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
                Grant Permission
              </button>
            )}
            {(observerState === 'active' || observerState === 'inactive') && (
              <button
                onClick={handleToggleObserver}
                disabled={observerLoading}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                  observerState === 'active'
                    ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {observerLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : observerState === 'active' ? (
                  <Eye className="h-3 w-3" />
                ) : (
                  <EyeOff className="h-3 w-3" />
                )}
                {observerState === 'active' ? 'Observing' : 'Start Observer'}
              </button>
            )}
          </div>
        </div>

        {observerState === 'active' && observerStats && (
          <div className="mt-3 flex gap-4 text-[10px] text-muted-foreground">
            <span>{observerStats.apps_observed} apps observed</span>
            <span>{observerStats.context_changes_emitted} context changes captured</span>
          </div>
        )}

        {observerState !== 'unavailable' && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {DESKTOP_OBSERVER_APPS.map((app) => (
              <span
                key={app}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  observerState === 'active'
                    ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {app}
              </span>
            ))}
          </div>
        )}

        {observerState === 'no_permission' && (
          <div className="mt-3 rounded-md bg-amber-50 p-2.5 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
            <strong>How it works:</strong> Click &quot;Grant Permission&quot; above, then enable Donna in
            System Settings &rarr; Privacy &amp; Security &rarr; Accessibility. You may need to restart the app.
          </div>
        )}

        {observerState === 'unavailable' && (
          <div className="mt-3 rounded-md bg-muted/50 p-2.5 text-[11px] text-muted-foreground">
            The Desktop Observer requires the Donna desktop app (macOS). It captures
            WhatsApp, Messages, and other app activity that can&apos;t be accessed via OAuth APIs.
          </div>
        )}
      </div>

      {/* OAuth Integrations */}
      {loading ? (
        <div className="mt-12 flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {CATEGORIES.map((category) => {
            const items = INTEGRATIONS.filter((i) => i.category === category);
            return (
              <div key={category}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{category}</h2>
                <div className="grid grid-cols-5 gap-2">
                  {items.map((config) => {
                    const integration = getStatus(config.dbProvider);
                    const isConnected = integration?.status === 'connected';
                    const hasError = integration?.status === 'error';
                    const isDisconnecting = disconnecting === config.dbProvider;
                    const isAvailable = availableProviders.includes(config.nangoProvider);

                    return (
                      <button
                        key={config.dbProvider}
                        onClick={() => {
                          if (!isAvailable && !isConnected) return;
                          if (isConnected || hasError) {
                            if (isConnected) handleDisconnect(config);
                            else setConsentProvider(config);
                          } else {
                            setConsentProvider(config);
                          }
                        }}
                        disabled={isDisconnecting || (!isAvailable && !isConnected)}
                        className={`group relative flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors ${
                          isConnected
                            ? 'border-green-300 bg-green-50/60 dark:border-green-800 dark:bg-green-950/30 hover:bg-muted/50'
                            : hasError
                              ? 'border-destructive/40 bg-destructive/5 hover:bg-muted/50'
                              : isAvailable
                                ? 'hover:bg-muted/50'
                                : 'cursor-not-allowed opacity-40'
                        }`}
                      >
                        {/* Status indicator */}
                        {isConnected && (
                          <div className="absolute right-1.5 top-1.5">
                            <Check className="h-3 w-3 text-green-600" />
                          </div>
                        )}
                        {hasError && (
                          <div className="absolute right-1.5 top-1.5">
                            <AlertCircle className="h-3 w-3 text-destructive" />
                          </div>
                        )}
                        {!isAvailable && !isConnected && !hasError && (
                          <div className="absolute right-1.5 top-1.5">
                            <span className="text-[8px] font-medium text-muted-foreground">Soon</span>
                          </div>
                        )}

                        {/* Disconnect overlay on hover when connected */}
                        {isConnected && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80 opacity-0 transition-opacity group-hover:opacity-100">
                            {isDisconnecting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                                <X className="h-3 w-3" /> Disconnect
                              </span>
                            )}
                          </div>
                        )}

                        <BrandIcon provider={config.dbProvider} size={24} />
                        <span className="text-xs font-medium leading-tight">{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
