'use client';

import { useCallback, useEffect, useState } from 'react';
import { BrandIcon } from '@/components/shared/BrandIcon';
import {
  Loader2,
  Check,
  AlertCircle,
  X,
  Plus,
  Pencil,
  Info,
  Star,
} from 'lucide-react';
import type { IntegrationProvider, UserIntegration } from '@/lib/db/types';

interface IntegrationConfig {
  dbProvider: IntegrationProvider;
  label: string;
  permissions: Array<{ label: string; description: string }>;
  category: string;
  /** Whether the user can connect more than one account of this provider */
  allowMultiple: boolean;
}

const INTEGRATIONS: IntegrationConfig[] = [
  // EMAIL & CALENDAR
  {
    dbProvider: 'gmail',
    label: 'Gmail',
    category: 'Email & Calendar',
    allowMultiple: true,
    permissions: [{ label: 'Read your emails', description: 'We read email metadata and content to generate your daily briefing. Raw email bodies are never stored.' }],
  },
  {
    dbProvider: 'google_calendar',
    label: 'Google Calendar',
    category: 'Email & Calendar',
    allowMultiple: true,
    permissions: [{ label: 'Read your calendar events', description: "We read event titles, times, and attendees for your today's schedule and meeting prep." }],
  },
  // MESSAGING
  {
    dbProvider: 'slack',
    label: 'Slack',
    category: 'Messaging',
    allowMultiple: false,
    permissions: [{ label: 'Read channel messages and DMs', description: 'We read recent messages to surface important conversations in your briefing.' }],
  },
  // DOCUMENTS
  {
    dbProvider: 'notion',
    label: 'Notion',
    category: 'Documents',
    allowMultiple: false,
    permissions: [{ label: 'Read your pages and databases', description: 'We index your Notion content for meeting prep and context retrieval.' }],
  },
];

const CATEGORIES = Array.from(new Set(INTEGRATIONS.map((i) => i.category)));


export default function IntegrationsSettingsPage() {
  const [integrations, setIntegrations] = useState<UserIntegration[]>([]);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccess, setConnectSuccess] = useState<string | null>(null);
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  // On web: Google redirects back with ?connected=provider or ?error=reason
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    // Support both old ?connected= and new ?provider= param names
    const connected = params.get('connected') ?? params.get('provider');
    const error = params.get('error');
    if (connected) {
      const label: Record<string, string> = {
        gmail: 'Gmail',
        google_calendar: 'Google Calendar',
        slack: 'Slack',
        notion: 'Notion',
      };
      setConnectSuccess(`${label[connected] ?? connected} connected!`);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error) {
      const messages: Record<string, string> = {
        google_denied: 'Sign-in cancelled.',
        token_exchange_failed: 'Could not complete sign-in. Please try again.',
        db_error: 'Account connected but failed to save. Please try again.',
      };
      setConnectError(messages[error] ?? 'Connection failed. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
  // Tracks which integration row UUID is being disconnected
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  // Tracks which integration row UUID is having its alias edited
  const [editingAlias, setEditingAlias] = useState<string | null>(null);
  const [aliasValue, setAliasValue] = useState('');
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null);

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
        const data = await availRes.json() as { available: string[] };
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
    } catch { /* Silently fail */ }
  }, []);

  useEffect(() => { void fetchIntegrations(); }, [fetchIntegrations]);

  useEffect(() => {
    const interval = setInterval(() => { void syncIntegrations(); }, 4000);
    return () => clearInterval(interval);
  }, [syncIntegrations]);

  // Auto-clear connecting state when the new connection appears in the DB
  useEffect(() => {
    if (!connecting) return;
    const config = INTEGRATIONS.find((c) => c.dbProvider === connecting);
    if (!config) return;
    const isNowConnected = integrations.some(
      (i) => i.provider === config.dbProvider && i.status === 'connected'
    );
    if (isNowConnected) setConnecting(null);
  }, [integrations, connecting]);

  /** Returns all connected rows for a provider */
  function getConnections(dbProvider: IntegrationProvider): UserIntegration[] {
    return integrations.filter((i) => i.provider === dbProvider && i.status === 'connected');
  }

  /** Returns any row (connected or error) for a single-account provider */
  function getSingleStatus(dbProvider: IntegrationProvider): UserIntegration | undefined {
    return integrations.find((i) => i.provider === dbProvider);
  }

  /**
   * Kick off the Google OAuth flow.
   *
   * Web: redirects the current tab to Google sign-in. On return, the callback
   * route stores the tokens and redirects back to this page.
   *
   * Tauri (desktop): opens the auth URL in the system browser. The callback
   * stores the tokens server-side; the 4-second polling loop detects the new row.
   */
  async function connectProvider(config: IntegrationConfig) {
    if (!['gmail', 'google_calendar'].includes(config.dbProvider)) {
      setConnectError(`${config.label} connections are not yet available.`);
      return;
    }

    setConnecting(config.dbProvider);
    setConnectError(null);

    try {
      const res = await fetch(`/api/integrations/google/auth-url?provider=${config.dbProvider}`);
      if (!res.ok) throw new Error('Could not generate auth URL');
      const { url } = await res.json() as { url: string };

      if (isTauri) {
        // Open in system browser; polling loop will detect the new row
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('plugin:shell|open', { path: url });

        // Poll every 2s for up to 90s, then give up
        const checkDone = setInterval(() => { void syncIntegrations(); }, 2000);
        setTimeout(() => {
          clearInterval(checkDone);
          setConnecting(null);
        }, 90_000);
      } else {
        // Web: redirect current tab; callback will redirect back here
        window.location.href = url;
      }
    } catch {
      setConnectError(`Could not start ${config.label} sign-in. Please try again.`);
      setConnecting(null);
    }
  }

  async function handleDisconnect(integrationId: string) {
    setDisconnecting(integrationId);
    try {
      const res = await fetch('/api/integrations/disconnect', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId }),
      });
      if (res.ok) await fetchIntegrations();
    } finally {
      setDisconnecting(null);
    }
  }

  function startEditAlias(integration: UserIntegration) {
    setEditingAlias(integration.id);
    setAliasValue(integration.connection_alias ?? integration.account_email ?? '');
  }

  async function saveAlias(integrationId: string) {
    if (!aliasValue.trim()) return;
    try {
      await fetch(`/api/integrations/${integrationId}/alias`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: aliasValue.trim() }),
      });
      setIntegrations(prev =>
        prev.map(i => i.id === integrationId ? { ...i, connection_alias: aliasValue.trim() } : i)
      );
    } catch { /* ignore */ } finally {
      setEditingAlias(null);
    }
  }

  async function setPrimaryAccount(provider: IntegrationProvider, integrationId: string) {
    setSettingPrimary(integrationId);
    try {
      await fetch(`/api/integrations/${integrationId}/primary`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      await fetchIntegrations();
    } catch { /* ignore */ } finally {
      setSettingPrimary(null);
    }
  }

  /** Check if an integration row is the primary for its provider */
  function isPrimary(integration: UserIntegration, allConnections: UserIntegration[]): boolean {
    // Primary = has connection_alias containing "(Primary)" or is the first connected
    if (integration.connection_alias?.includes('(Primary)')) return true;
    // If no explicit primary is set, the first connected account is primary
    const firstConnected = allConnections[0];
    return firstConnected?.id === integration.id && !allConnections.some(
      (c) => c.connection_alias?.includes('(Primary)')
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Integrations</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Connect your accounts to power your daily briefing.
      </p>

      {isTauri && connecting && !connectError && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-blue-300/60 bg-blue-50/60 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>Sign-in opened in your browser — complete it there and come back.</span>
        </div>
      )}

      {connectSuccess && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-300/60 bg-green-50/60 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
          <Check className="h-4 w-4 shrink-0" />
          <span>{connectSuccess}</span>
          <button onClick={() => setConnectSuccess(null)} className="ml-auto">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {connectError && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{connectError}</span>
          <button onClick={() => setConnectError(null)} className="ml-auto">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Google OAuth setup guide */}
      <button
        onClick={() => setShowSetupGuide(!showSetupGuide)}
        className="mt-4 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Info className="h-3.5 w-3.5" />
        <span>Seeing an &ldquo;unverified app&rdquo; warning from Google?</span>
      </button>

      {showSetupGuide && (
        <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/20">
          <p className="font-medium text-blue-900 dark:text-blue-200">Google OAuth Setup (Beta)</p>
          <p className="mt-1 text-blue-800/80 dark:text-blue-300/80">
            While Donna is in beta, Google shows an &ldquo;unverified app&rdquo; screen during sign-in.
            This is normal for apps that haven&apos;t completed Google&apos;s verification review yet.
          </p>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-blue-800/80 dark:text-blue-300/80">
            <li>On the warning screen, click <strong>&ldquo;Advanced&rdquo;</strong></li>
            <li>Then click <strong>&ldquo;Go to Donna (unsafe)&rdquo;</strong></li>
            <li>Review the permissions and click <strong>&ldquo;Continue&rdquo;</strong></li>
          </ol>
          <p className="mt-2 text-[11px] text-blue-700/60 dark:text-blue-400/60">
            Your data is protected by encryption at rest. Donna never stores raw email content — only AI-generated summaries.
          </p>
        </div>
      )}

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
                <div className="space-y-2">
                  {items.map((config) => {
                    const isAvailable = availableProviders.includes(config.dbProvider);

                    if (config.allowMultiple) {
                      // Multi-account provider: show connected account cards + "Add account" button
                      const connections = getConnections(config.dbProvider);
                      const hasConnections = connections.length > 0;

                      return (
                        <div key={config.dbProvider} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BrandIcon provider={config.dbProvider} size={20} />
                              <span className="text-sm font-medium">{config.label}</span>
                              {hasConnections && (
                                <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                  {connections.length} connected
                                </span>
                              )}
                            </div>
                            {isAvailable && (
                              <button
                                onClick={() => connectProvider(config)}
                                disabled={connecting === config.dbProvider}
                                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground disabled:opacity-50"
                              >
                                {connecting === config.dbProvider
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <Plus className="h-3 w-3" />}
                                {connecting === config.dbProvider ? (isTauri ? 'Check browser...' : 'Connecting...') : hasConnections ? 'Add account' : 'Connect'}
                              </button>
                            )}
                            {!isAvailable && !hasConnections && (
                              <span className="text-[10px] font-medium text-muted-foreground">Soon</span>
                            )}
                          </div>

                          {/* Connected account cards */}
                          {hasConnections && (
                            <div className="mt-3 space-y-2">
                              {connections.map((integration) => {
                                const isDisconnecting = disconnecting === integration.id;
                                const isEditing = editingAlias === integration.id;
                                const displayName = integration.connection_alias ?? integration.account_email ?? integration.id;

                                const isAccountPrimary = isPrimary(integration, connections);

                                return (
                                  <div
                                    key={integration.id}
                                    className={`flex items-center gap-2 rounded-md px-3 py-2 ${isAccountPrimary ? 'bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40' : 'bg-muted/40'}`}
                                  >
                                    <Check className="h-3.5 w-3.5 shrink-0 text-green-600" />

                                    {isEditing ? (
                                      <input
                                        autoFocus
                                        value={aliasValue}
                                        onChange={(e) => setAliasValue(e.target.value)}
                                        onBlur={() => void saveAlias(integration.id)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') void saveAlias(integration.id);
                                          if (e.key === 'Escape') setEditingAlias(null);
                                        }}
                                        className="flex-1 rounded border bg-background px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                                        maxLength={60}
                                      />
                                    ) : (
                                      <div className="flex min-w-0 flex-1 flex-col">
                                        <span className="truncate text-xs font-medium">{displayName}</span>
                                        {integration.connection_alias && integration.account_email && integration.connection_alias !== integration.account_email && (
                                          <span className="truncate text-[10px] text-muted-foreground">{integration.account_email}</span>
                                        )}
                                      </div>
                                    )}

                                    {!isEditing && (
                                      <>
                                        {connections.length > 1 && (
                                          <button
                                            onClick={() => void setPrimaryAccount(config.dbProvider, integration.id)}
                                            disabled={settingPrimary === integration.id || isAccountPrimary}
                                            className={`ml-auto shrink-0 rounded p-1 transition-colors ${
                                              isAccountPrimary
                                                ? 'text-amber-500'
                                                : 'text-muted-foreground hover:bg-muted hover:text-amber-500 disabled:opacity-50'
                                            }`}
                                            title={isAccountPrimary ? 'Primary account' : 'Set as primary'}
                                          >
                                            {settingPrimary === integration.id
                                              ? <Loader2 className="h-3 w-3 animate-spin" />
                                              : <Star className={`h-3 w-3 ${isAccountPrimary ? 'fill-amber-500' : ''}`} />}
                                          </button>
                                        )}
                                        <button
                                          onClick={() => startEditAlias(integration)}
                                          className={`${connections.length <= 1 ? 'ml-auto' : ''} shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground`}
                                          title="Rename"
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </button>
                                      </>
                                    )}

                                    <button
                                      onClick={() => void handleDisconnect(integration.id)}
                                      disabled={isDisconnecting}
                                      className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                                      title="Disconnect"
                                    >
                                      {isDisconnecting ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <X className="h-3 w-3" />
                                      )}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Single-account provider: original tile UI
                    const integration = getSingleStatus(config.dbProvider);
                    const isConnected = integration?.status === 'connected';
                    const hasError = integration?.status === 'error';
                    const isDisconnecting = disconnecting === integration?.id;

                    return (
                      <button
                        key={config.dbProvider}
                        onClick={() => {
                          if (!isAvailable && !isConnected) return;
                          if (isConnected && integration) {
                            void handleDisconnect(integration.id);
                          } else {
                            connectProvider(config);
                          }
                        }}
                        disabled={isDisconnecting || connecting === config.dbProvider || (!isAvailable && !isConnected)}
                        className={`group relative flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                          isConnected
                            ? 'border-green-300 bg-green-50/60 dark:border-green-800 dark:bg-green-950/30 hover:bg-muted/50'
                            : hasError
                              ? 'border-destructive/40 bg-destructive/5 hover:bg-muted/50'
                              : isAvailable
                                ? 'hover:bg-muted/50'
                                : 'cursor-not-allowed opacity-40'
                        }`}
                      >
                        <BrandIcon provider={config.dbProvider} size={20} />
                        <span className="flex-1 text-sm font-medium">{config.label}</span>

                        {isConnected && integration?.account_email && (
                          <span className="truncate text-[11px] text-muted-foreground">{integration.account_email}</span>
                        )}

                        {isConnected && (
                          <div className="flex shrink-0 items-center gap-1.5">
                            <Check className="h-3.5 w-3.5 text-green-600" />
                            <span className="hidden text-[10px] font-medium text-muted-foreground group-hover:block">
                              {isDisconnecting ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : 'Disconnect'}
                            </span>
                          </div>
                        )}
                        {hasError && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />}
                        {!isAvailable && !isConnected && !hasError && (
                          <span className="text-[10px] font-medium text-muted-foreground">Soon</span>
                        )}
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
