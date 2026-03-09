'use client';

import { useCallback, useEffect, useState } from 'react';
import Nango from '@nangohq/frontend';
import { BrandIcon } from '@/components/shared/BrandIcon';
import { OAuthConsentScreen } from '../OAuthConsentScreen';
import { Loader2, AlertCircle, X } from 'lucide-react';
import type { IntegrationProvider, UserIntegration } from '@/lib/db/types';

interface ConnectDataStepProps {
  onNext: () => void;
  onBack: () => void;
}

interface ProviderConfig {
  nangoProvider: string;
  dbProvider: IntegrationProvider;
  label: string;
  description: string;
  permissions: Array<{ label: string; description: string }>;
}

const ESSENTIAL_PROVIDERS: ProviderConfig[] = [
  {
    nangoProvider: 'google-mail', dbProvider: 'gmail', label: 'Gmail',
    description: '30 days of email history \u2014 commitments, contacts, context',
    permissions: [{ label: 'Read your emails', description: 'We read email metadata and content to generate your daily briefing. Raw email bodies are never stored.' }],
  },
  {
    nangoProvider: 'google-calendar', dbProvider: 'google_calendar', label: 'Google Calendar',
    description: 'Schedule, meetings, and attendees for meeting prep',
    permissions: [{ label: 'Read your calendar events', description: "We read event titles, times, and attendees for today's schedule and meeting prep." }],
  },
  {
    nangoProvider: 'slack', dbProvider: 'slack', label: 'Slack',
    description: 'Conversations, action items, and @mentions',
    permissions: [{ label: 'Read messages and DMs', description: 'We read recent messages to surface important conversations in your briefing.' }],
  },
  {
    nangoProvider: 'notion', dbProvider: 'notion', label: 'Notion',
    description: 'Pages and databases for context and meeting prep',
    permissions: [{ label: 'Read your pages and databases', description: 'We index your Notion content for meeting prep and context retrieval.' }],
  },
];

export function ConnectDataStep({ onNext, onBack }: ConnectDataStepProps) {
  const [integrations, setIntegrations] = useState<UserIntegration[]>([]);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [consentProvider, setConsentProvider] = useState<ProviderConfig | null>(null);
  // Pre-fetched session token — obtained eagerly when the consent screen opens so
  // nango.auth() fires synchronously from the "Proceed" click, avoiding popup blocking.
  const [pendingSessionToken, setPendingSessionToken] = useState<string | null>(null);
  const [tokenFetching, setTokenFetching] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const fetchIntegrations = useCallback(async () => {
    try {
      const [intRes, availRes] = await Promise.all([
        fetch('/api/integrations'), fetch('/api/integrations/available'),
      ]);
      if (intRes.ok) setIntegrations((await intRes.json()).integrations);
      if (availRes.ok) setAvailableProviders((await availRes.json()).available);
    } finally { setLoading(false); }
  }, []);

  const syncIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/sync', { method: 'POST' });
      if (res.ok) setIntegrations((await res.json()).integrations);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);
  useEffect(() => {
    const interval = setInterval(syncIntegrations, 3000);
    return () => clearInterval(interval);
  }, [syncIntegrations]);

  function isConnected(p: IntegrationProvider) { return integrations.some((i) => i.provider === p && i.status === 'connected'); }
  function isAvailable(p: string) { return availableProviders.includes(p); }
  const connectedCount = ESSENTIAL_PROVIDERS.filter((p) => isConnected(p.dbProvider)).length;

  async function openConsent(config: ProviderConfig) {
    setConsentProvider(config);
    setPendingSessionToken(null);
    setTokenFetching(true);
    try {
      const res = await fetch('/api/integrations/connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: config.nangoProvider }),
      });
      if (res.ok) setPendingSessionToken(((await res.json()) as { sessionToken?: string }).sessionToken ?? null);
    } catch { /* token will be re-fetched inside handleConnect as fallback */ }
    finally { setTokenFetching(false); }
  }

  // MUST be a plain (non-async) function — see settings/integrations/page.tsx for explanation.
  function handleConnect(config: ProviderConfig) {
    const token = pendingSessionToken;
    if (!token) return;

    setConnecting(true);
    setConnectError(null);
    setPendingSessionToken(null);

    new Nango({ connectSessionToken: token })
      .auth(config.nangoProvider)
      .then(() => syncIntegrations())
      .catch((error: unknown) => {
        const msg = error instanceof Error ? error.message : 'Connection failed';
        if (!msg.includes('closed') && !msg.includes('cancel')) setConnectError(`${config.label}: ${msg}`);
      })
      .finally(() => { setConnecting(false); setConsentProvider(null); });
  }

  if (consentProvider) {
    return (
      <OAuthConsentScreen
        provider={consentProvider.nangoProvider}
        providerLabel={consentProvider.label}
        permissions={consentProvider.permissions}
        onConsent={() => handleConnect(consentProvider)}
        onCancel={() => setConsentProvider(null)}
        loading={connecting}
        tokenLoading={tokenFetching}
      />
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <h2
        className="transition-all duration-700"
        style={{
          fontSize: '22px', fontStyle: 'italic', color: '#FBF7F4',
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        Connect your data
      </h2>
      <p
        className="mt-3 max-w-[340px] text-[13px] leading-[1.65] transition-all duration-700"
        style={{
          color: '#9BAFC4',
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)',
          transitionDelay: '100ms', transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        30 days of history, instantly. The desktop observer handles everything
        that doesn&apos;t have an API.
      </p>

      {connectError && (
        <div
          className="mt-4 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[12px]"
          style={{ background: 'rgba(214, 75, 42, 0.08)', border: '1px solid rgba(214, 75, 42, 0.2)', color: '#D64B2A' }}
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{connectError}</span>
          <button onClick={() => setConnectError(null)}><X className="h-3 w-3" /></button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#9BAFC4' }} />
        </div>
      ) : (
        <div
          className="mt-6 w-full space-y-2 transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)',
            transitionDelay: '250ms', transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {ESSENTIAL_PROVIDERS.map((config) => {
            const connected = isConnected(config.dbProvider);
            const available = isAvailable(config.nangoProvider);

            return (
              <button
                key={config.dbProvider}
                onClick={() => !connected && available && void openConsent(config)}
                disabled={connected || !available}
                className="group flex w-full items-center gap-4 rounded-xl p-4 text-left transition-all duration-300"
                style={{
                  background: connected
                    ? 'rgba(82, 183, 136, 0.06)'
                    : 'rgba(14, 18, 37, 0.4)',
                  border: connected
                    ? '1px solid rgba(82, 183, 136, 0.2)'
                    : '1px solid rgba(251, 247, 244, 0.04)',
                  opacity: !available && !connected ? 0.35 : 1,
                  cursor: connected ? 'default' : !available ? 'not-allowed' : 'pointer',
                }}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-300"
                  style={{
                    background: connected
                      ? 'rgba(82, 183, 136, 0.1)'
                      : 'rgba(251, 247, 244, 0.03)',
                  }}
                >
                  <BrandIcon provider={config.dbProvider} size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium" style={{ color: '#FBF7F4' }}>
                    {config.label}
                  </p>
                  <p className="text-[11px] leading-snug" style={{ color: 'rgba(155, 175, 196, 0.5)' }}>
                    {config.description}
                  </p>
                </div>
                {connected ? (
                  <div className="animate-check-pop flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{ background: 'rgba(82, 183, 136, 0.15)' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="#52B788" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                ) : !available ? (
                  <span className="shrink-0 text-[9px] font-medium tracking-wide" style={{ fontFamily: 'var(--font-mono)', color: 'rgba(155,175,196,0.3)', textTransform: 'uppercase' as const }}>
                    Soon
                  </span>
                ) : (
                  <div
                    className="shrink-0 rounded-md px-3 py-1 text-[11px] font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    style={{ background: 'rgba(232, 132, 92, 0.1)', color: '#E8845C' }}
                  >
                    Connect
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {connectedCount > 0 && (
        <p className="mt-4 text-[11px]" style={{ fontFamily: 'var(--font-mono)', color: 'rgba(82, 183, 136, 0.5)' }}>
          {connectedCount} connected \u2014 pulling in your history now
        </p>
      )}

      {/* Navigation */}
      <div className="mt-7 flex w-full items-center justify-between">
        <button onClick={onBack} className="text-[12px] font-medium transition-colors hover:underline" style={{ color: 'rgba(155,175,196,0.4)' }}>
          Back
        </button>
        <button
          onClick={onNext}
          className="rounded-lg px-5 py-2 text-[13px] font-medium transition-all duration-300"
          style={{
            background: connectedCount > 0 ? 'linear-gradient(135deg, #E8845C, #D4704A)' : 'rgba(251,247,244,0.05)',
            color: connectedCount > 0 ? '#FBF7F4' : 'rgba(155,175,196,0.5)',
            border: connectedCount > 0 ? 'none' : '1px solid rgba(251,247,244,0.06)',
          }}
        >
          {connectedCount > 0 ? 'Continue' : 'Skip for now'}
        </button>
      </div>
    </div>
  );
}
