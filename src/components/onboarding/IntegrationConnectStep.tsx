'use client';

import { useCallback, useEffect, useState } from 'react';
import Nango from '@nangohq/frontend';
import { Button } from '@/components/ui/button';
import { OAuthConsentScreen } from './OAuthConsentScreen';
import { BrandIcon } from '@/components/shared/BrandIcon';
import {
  Loader2,
  Check,
  ChevronDown,
  ChevronUp,
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
  // ── Recommended ──
  { nangoProvider: 'google-mail', dbProvider: 'gmail', label: 'Gmail', description: 'Read emails for your daily briefing and commitment tracking', category: 'Email & Calendar', recommended: true, permissions: [{ label: 'Read your emails', description: 'We read email metadata and content to generate your daily briefing. Raw email bodies are never stored.' }] },
  { nangoProvider: 'google-calendar', dbProvider: 'google_calendar', label: 'Google Calendar', description: 'Surface your schedule and prepare meeting briefs', category: 'Email & Calendar', recommended: true, permissions: [{ label: 'Read your calendar events', description: "We read event titles, times, and attendees for your today's schedule and meeting prep." }] },
  { nangoProvider: 'microsoft', dbProvider: 'outlook', label: 'Outlook', description: 'Read emails and calendar from your Microsoft account', category: 'Email & Calendar', recommended: true, permissions: [{ label: 'Read your emails and calendar', description: 'We read email metadata and calendar events. Raw email bodies are never stored.' }] },
  { nangoProvider: 'slack', dbProvider: 'slack', label: 'Slack', description: 'Surface important conversations and action items', category: 'Messaging', recommended: true, permissions: [{ label: 'Read channel messages and DMs', description: 'We read recent messages to surface important conversations in your briefing.' }] },
  // ── Email & Calendar (additional) ──
  { nangoProvider: 'icloud', dbProvider: 'apple_icloud_mail', label: 'iCloud Mail', description: 'Read iCloud emails for your daily briefing', category: 'Email & Calendar', permissions: [{ label: 'Read your iCloud emails', description: 'We read iCloud Mail metadata and content. Raw bodies are never stored.' }] },
  { nangoProvider: 'calendly', dbProvider: 'calendly', label: 'Calendly', description: 'See upcoming bookings in your briefing', category: 'Email & Calendar', permissions: [{ label: 'Read your scheduled events', description: 'We fetch upcoming bookings so you know about meetings before they happen.' }] },
  // ── Messaging (additional) ──
  { nangoProvider: 'microsoft-teams', dbProvider: 'microsoft_teams', label: 'Teams', description: 'Surface Teams messages and @mentions', category: 'Messaging', permissions: [{ label: 'Read your Teams messages and DMs', description: 'We read messages where you are mentioned or sent direct messages.' }] },
  { nangoProvider: 'linkedin', dbProvider: 'linkedin', label: 'LinkedIn', description: 'Surface unread LinkedIn conversations', category: 'Messaging', permissions: [{ label: 'Read your LinkedIn messages', description: 'We read unread LinkedIn conversations to surface important professional messages.' }] },
  { nangoProvider: 'twitter', dbProvider: 'twitter', label: 'X / Twitter', description: 'Surface unread direct messages', category: 'Messaging', permissions: [{ label: 'Read your Twitter/X direct messages', description: 'We read unread DMs so important messages surface in your daily briefing.' }] },
  // ── Documents ──
  { nangoProvider: 'notion', dbProvider: 'notion', label: 'Notion', description: 'Index pages for context and meeting prep', category: 'Documents', permissions: [{ label: 'Read your pages and databases', description: 'We index your Notion content for meeting prep and context retrieval.' }] },
  { nangoProvider: 'google-drive', dbProvider: 'google_drive', label: 'Google Drive', description: 'Index documents for meeting prep', category: 'Documents', permissions: [{ label: 'Read your documents', description: 'We index Docs and files for meeting prep. Raw content is never stored.' }] },
  { nangoProvider: 'dropbox', dbProvider: 'dropbox', label: 'Dropbox', description: 'Index files for meeting prep', category: 'Documents', permissions: [{ label: 'Read your files', description: 'We index text files for context retrieval. Raw content is never stored.' }] },
  { nangoProvider: 'microsoft', dbProvider: 'onedrive', label: 'OneDrive', description: 'Index documents for context', category: 'Documents', permissions: [{ label: 'Read your OneDrive files', description: 'We index documents for context retrieval. Raw content is never stored.' }] },
  // ── Tasks ──
  { nangoProvider: 'asana', dbProvider: 'asana', label: 'Asana', description: 'Surface tasks assigned to you', category: 'Tasks', permissions: [{ label: 'Read tasks assigned to you', description: 'We fetch your open Asana tasks so they surface in your daily briefing.' }] },
  { nangoProvider: 'monday', dbProvider: 'monday', label: 'Monday', description: 'Surface board items assigned to you', category: 'Tasks', permissions: [{ label: 'Read board items assigned to you', description: 'We fetch your Monday.com items so they surface in your daily briefing.' }] },
  { nangoProvider: 'jira', dbProvider: 'jira', label: 'Jira', description: 'Surface issues assigned to you', category: 'Tasks', permissions: [{ label: 'Read issues assigned to you', description: 'We fetch your open Jira issues so they surface in your daily briefing.' }] },
  { nangoProvider: 'linear', dbProvider: 'linear', label: 'Linear', description: 'Surface issues assigned to you', category: 'Tasks', permissions: [{ label: 'Read issues assigned to you', description: 'We fetch your open Linear issues so they surface in your daily briefing.' }] },
  { nangoProvider: 'clickup', dbProvider: 'clickup', label: 'ClickUp', description: 'Surface tasks assigned to you', category: 'Tasks', permissions: [{ label: 'Read tasks assigned to you', description: 'We fetch your open ClickUp tasks so they surface in your daily briefing.' }] },
  { nangoProvider: 'trello', dbProvider: 'trello', label: 'Trello', description: 'Surface cards assigned to you', category: 'Tasks', permissions: [{ label: 'Read cards assigned to you', description: 'We fetch your open Trello cards so they surface in your daily briefing.' }] },
  // ── CRM ──
  { nangoProvider: 'hubspot', dbProvider: 'hubspot', label: 'HubSpot', description: 'Surface deals and tasks', category: 'CRM', permissions: [{ label: 'Read deals, contacts, and tasks', description: 'We surface your open deals and tasks so you stay on top of your pipeline.' }] },
  { nangoProvider: 'salesforce', dbProvider: 'salesforce', label: 'Salesforce', description: 'Surface opportunities and tasks', category: 'CRM', permissions: [{ label: 'Read opportunities, tasks, and contacts', description: 'We surface open opportunities and tasks so your pipeline is always front of mind.' }] },
  { nangoProvider: 'pipedrive', dbProvider: 'pipedrive', label: 'Pipedrive', description: 'Surface deals and activities', category: 'CRM', permissions: [{ label: 'Read deals and activities', description: 'We surface open deals and upcoming activities so you never miss a follow-up.' }] },
  // ── Code ──
  { nangoProvider: 'github', dbProvider: 'github', label: 'GitHub', description: 'Surface PR reviews and @mentions', category: 'Code', permissions: [{ label: 'Read PR reviews requested and @mentions', description: 'We surface PRs awaiting your review and issues where you are mentioned.' }] },
];

const RECOMMENDED = INTEGRATIONS.filter((i) => i.recommended);
const ADDITIONAL = INTEGRATIONS.filter((i) => !i.recommended);
const ADDITIONAL_CATEGORIES = Array.from(new Set(ADDITIONAL.map((i) => i.category)));

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
  const [showMore, setShowMore] = useState(false);

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
          Chief of Staff reads across your digital life to deliver your daily
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
        <>
          {/* Recommended */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recommended
            </p>
            <div className="grid grid-cols-4 gap-2">
              {RECOMMENDED.map(renderTile)}
            </div>
          </div>

          {/* Additional - expandable */}
          <div>
            <button
              type="button"
              onClick={() => setShowMore(!showMore)}
              className="flex w-full items-center justify-between rounded-md px-1 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <span>{showMore ? 'Hide' : 'Show'} {ADDITIONAL.length} more integrations</span>
              {showMore ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {showMore && (
              <div className="mt-2 space-y-4">
                {ADDITIONAL_CATEGORIES.map((category) => {
                  const items = ADDITIONAL.filter((i) => i.category === category);
                  return (
                    <div key={category}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {category}
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {items.map(renderTile)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
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
