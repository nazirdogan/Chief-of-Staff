'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { OAuthConsentScreen } from './OAuthConsentScreen';
import { BrandIcon } from '@/components/shared/BrandIcon';
import {
  Loader2,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';
import type { IntegrationProvider, UserIntegration } from '@/lib/db/types';

interface IntegrationConfig {
  dbProvider: IntegrationProvider;
  label: string;
  description: string;
  permissions: Array<{ label: string; description: string }>;
  category: string;
  recommended?: boolean;
}

const INTEGRATIONS: IntegrationConfig[] = [
  { dbProvider: 'gmail', label: 'Gmail', description: 'Read emails for your daily briefing and commitment tracking', category: 'Email & Calendar', recommended: true, permissions: [{ label: 'Read your emails', description: 'We read email metadata and content to generate your daily briefing. Raw email bodies are never stored.' }] },
  { dbProvider: 'google_calendar', label: 'Google Calendar', description: 'Surface your schedule and prepare meeting briefs', category: 'Email & Calendar', recommended: true, permissions: [{ label: 'Read your calendar events', description: "We read event titles, times, and attendees for your today's schedule and meeting prep." }] },
  { dbProvider: 'slack', label: 'Slack', description: 'Surface important conversations and action items', category: 'Messaging', recommended: true, permissions: [{ label: 'Read channel messages and DMs', description: 'We read recent messages to surface important conversations in your briefing.' }] },
  { dbProvider: 'notion', label: 'Notion', description: 'Index pages for context and meeting prep', category: 'Documents', recommended: true, permissions: [{ label: 'Read your pages and databases', description: 'We index your Notion content for meeting prep and context retrieval.' }] },
];

const GOOGLE_PROVIDERS: IntegrationProvider[] = ['gmail', 'google_calendar'];

interface IntegrationConnectStepProps {
  onNext: () => void;
}

export function IntegrationConnectStep({ onNext }: IntegrationConnectStepProps) {
  const [integrations, setIntegrations] = useState<UserIntegration[]>([]);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [consentProvider, setConsentProvider] = useState<IntegrationConfig | null>(null);
  const [pendingAuthUrl, setPendingAuthUrl] = useState<string | null>(null);
  const [urlFetching, setUrlFetching] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

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
    } catch { /* Silently fail — will retry on next poll */ }
  }, []);

  useEffect(() => { void fetchIntegrations(); }, [fetchIntegrations]);

  useEffect(() => {
    const interval = setInterval(() => { void syncIntegrations(); }, 3000);
    return () => clearInterval(interval);
  }, [syncIntegrations]);

  function isConnected(dbProvider: IntegrationProvider): boolean {
    return integrations.some((i) => i.provider === dbProvider && i.status === 'connected');
  }

  const connectedCount = INTEGRATIONS.filter((c) => isConnected(c.dbProvider)).length;

  async function openConsent(config: IntegrationConfig) {
    setConsentProvider(config);
    setPendingAuthUrl(null);
    setUrlFetching(true);
    try {
      const res = await fetch(`/api/integrations/google/auth-url?provider=${config.dbProvider}`);
      if (res.ok) {
        const data = await res.json() as { url?: string };
        setPendingAuthUrl(data.url ?? null);
      }
    } catch { /* URL will be fetched again when user clicks Connect */ }
    finally { setUrlFetching(false); }
  }

  function handleConnect(config: IntegrationConfig) {
    const url = pendingAuthUrl;
    if (!url) return;

    setConnecting(true);
    setConnectError(null);
    setPendingAuthUrl(null);

    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

    if (isTauri) {
      import('@tauri-apps/api/core')
        .then(({ invoke }) => invoke('plugin:shell|open', { path: url }))
        .then(() => {
          setConsentProvider(null);
          setConnecting(false);
        })
        .catch(() => {
          setConnectError(`Could not open browser for ${config.label} sign-in.`);
          setConnecting(false);
        });
    } else {
      // Web: redirect to Google. Callback will return to settings page.
      window.location.href = url;
    }
  }

  function isAvailable(dbProvider: IntegrationProvider): boolean {
    return availableProviders.includes(dbProvider);
  }

  if (consentProvider) {
    return (
      <div className="space-y-6">
        <OAuthConsentScreen
          provider={consentProvider.dbProvider}
          providerLabel={consentProvider.label}
          permissions={consentProvider.permissions}
          onConsent={() => handleConnect(consentProvider)}
          onCancel={() => setConsentProvider(null)}
          loading={connecting}
          tokenLoading={urlFetching}
        />
      </div>
    );
  }

  function renderTile(config: IntegrationConfig) {
    const connected = isConnected(config.dbProvider);
    const available = GOOGLE_PROVIDERS.includes(config.dbProvider)
      ? isAvailable(config.dbProvider)
      : false; // Slack/Notion not yet wired to direct OAuth
    return (
      <button
        key={config.dbProvider}
        onClick={() => available && void openConsent(config)}
        disabled={!available}
        className={`relative flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors ${
          connected
            ? 'border-green-300 bg-green-50/60 dark:border-green-800 dark:bg-green-950/30'
            : available
              ? 'hover:bg-muted/50'
              : 'cursor-not-allowed opacity-40'
        }`}
      >
        {connected && (
          <div className="absolute right-1.5 top-1.5">
            <Check className="h-3 w-3 text-green-600" />
          </div>
        )}
        {!available && !connected && (
          <div className="absolute right-1.5 top-1.5">
            <span className="text-[8px] font-medium text-muted-foreground">Soon</span>
          </div>
        )}
        <BrandIcon provider={config.dbProvider} size={24} />
        <span className="text-xs font-medium leading-tight">{config.label}</span>
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Connect Your Apps</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Donna reads across your digital life to deliver your daily
          briefing. Connect at least one source to get started — you can add more
          later from Settings.
        </p>
      </div>

      {connectError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{connectError}</span>
          <button onClick={() => setConnectError(null)} className="ml-auto">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-4 gap-2">
            {INTEGRATIONS.map(renderTile)}
          </div>
        </div>
      )}

      {connectedCount > 0 && (
        <p className="text-sm text-muted-foreground">
          {connectedCount} app{connectedCount !== 1 ? 's' : ''} connected.
          {connectedCount < INTEGRATIONS.length && ' You can connect more now or later from Settings.'}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" onClick={onNext}>Skip for now</Button>
        <Button onClick={onNext}>
          {connectedCount > 0 ? 'Continue' : 'Continue without connecting'}
        </Button>
      </div>
    </div>
  );
}
