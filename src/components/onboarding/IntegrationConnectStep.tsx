'use client';

import { useCallback, useEffect, useState } from 'react';
import Nango from '@nangohq/frontend';
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
  nangoProvider: string;
  dbProvider: IntegrationProvider;
  label: string;
  description: string;
  permissions: Array<{ label: string; description: string }>;
  category: string;
  recommended?: boolean;
}

const INTEGRATIONS: IntegrationConfig[] = [
  { nangoProvider: 'google-mail', dbProvider: 'gmail', label: 'Gmail', description: 'Read emails for your daily briefing and commitment tracking', category: 'Email & Calendar', recommended: true, permissions: [{ label: 'Read your emails', description: 'We read email metadata and content to generate your daily briefing. Raw email bodies are never stored.' }] },
  { nangoProvider: 'google-calendar', dbProvider: 'google_calendar', label: 'Google Calendar', description: 'Surface your schedule and prepare meeting briefs', category: 'Email & Calendar', recommended: true, permissions: [{ label: 'Read your calendar events', description: "We read event titles, times, and attendees for your today's schedule and meeting prep." }] },
  { nangoProvider: 'slack', dbProvider: 'slack', label: 'Slack', description: 'Surface important conversations and action items', category: 'Messaging', recommended: true, permissions: [{ label: 'Read channel messages and DMs', description: 'We read recent messages to surface important conversations in your briefing.' }] },
  { nangoProvider: 'notion', dbProvider: 'notion', label: 'Notion', description: 'Index pages for context and meeting prep', category: 'Documents', recommended: true, permissions: [{ label: 'Read your pages and databases', description: 'We index your Notion content for meeting prep and context retrieval.' }] },
];

interface IntegrationConnectStepProps {
  onNext: () => void;
}

export function IntegrationConnectStep({ onNext }: IntegrationConnectStepProps) {
  const [integrations, setIntegrations] = useState<UserIntegration[]>([]);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [consentProvider, setConsentProvider] = useState<IntegrationConfig | null>(null);
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
    } catch {
      // Silently fail — will retry on next poll
    }
  }, []);

  useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);

  // Poll: sync with Nango every 3s to detect completed OAuth flows
  useEffect(() => {
    const interval = setInterval(syncIntegrations, 3000);
    return () => clearInterval(interval);
  }, [syncIntegrations]);

  function isConnected(dbProvider: IntegrationProvider): boolean {
    return integrations.some((i) => i.provider === dbProvider && i.status === 'connected');
  }

  const connectedCount = INTEGRATIONS.filter((c) => isConnected(c.dbProvider)).length;

  async function handleConnect(config: IntegrationConfig) {
    setConnecting(true);
    setConnectError(null);

    try {
      // 1. Get a connect session token from our backend
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

      // 4. OAuth completed — sync to DB
      await syncIntegrations();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      if (!message.includes('closed') && !message.includes('cancelled') && !message.includes('canceled')) {
        setConnectError(`Failed to connect ${config.label}: ${message}`);
      }
    } finally {
      setConnecting(false);
      setConsentProvider(null);
    }
  }

  if (consentProvider) {
    return (
      <div className="space-y-6">
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

  function isAvailable(nangoProvider: string): boolean {
    return availableProviders.includes(nangoProvider);
  }

  function renderTile(config: IntegrationConfig) {
    const connected = isConnected(config.dbProvider);
    const available = isAvailable(config.nangoProvider);
    return (
      <button
        key={config.dbProvider}
        onClick={() => available && setConsentProvider(config)}
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
