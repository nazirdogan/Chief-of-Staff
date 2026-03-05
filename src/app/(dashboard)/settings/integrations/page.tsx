'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OAuthConsentScreen } from '@/components/onboarding/OAuthConsentScreen';
import {
  Mail,
  Calendar,
  MessageSquare,
  FileText,
  Loader2,
  Check,
  AlertCircle,
  X,
  Send,
} from 'lucide-react';
import type { IntegrationProvider, UserIntegration } from '@/lib/db/types';

interface IntegrationConfig {
  nangoProvider: string;
  dbProvider: IntegrationProvider;
  label: string;
  icon: typeof Mail;
  permissions: Array<{ label: string; description: string }>;
}

const INTEGRATIONS: IntegrationConfig[] = [
  {
    nangoProvider: 'google-mail',
    dbProvider: 'gmail',
    label: 'Gmail',
    icon: Mail,
    permissions: [
      {
        label: 'Read your emails',
        description:
          'We read email metadata and content to generate your daily briefing. Raw email bodies are never stored.',
      },
    ],
  },
  {
    nangoProvider: 'google-calendar',
    dbProvider: 'google_calendar',
    label: 'Google Calendar',
    icon: Calendar,
    permissions: [
      {
        label: 'Read your calendar events',
        description:
          "We read event titles, times, and attendees for your today's schedule and meeting prep.",
      },
    ],
  },
  {
    nangoProvider: 'microsoft',
    dbProvider: 'outlook',
    label: 'Microsoft Outlook',
    icon: Mail,
    permissions: [
      {
        label: 'Read your emails',
        description:
          'We read email metadata and content to generate your daily briefing. Raw email bodies are never stored.',
      },
      {
        label: 'Read your calendar',
        description:
          "We read event titles, times, and attendees for your today's schedule and meeting prep.",
      },
      {
        label: 'Send emails on your behalf',
        description:
          'Only after you explicitly confirm each action. We never send without your approval.',
      },
    ],
  },
  {
    nangoProvider: 'slack',
    dbProvider: 'slack',
    label: 'Slack',
    icon: MessageSquare,
    permissions: [
      {
        label: 'Read channel messages and DMs',
        description:
          'We read recent messages to surface important conversations in your briefing.',
      },
      {
        label: 'Read user profiles',
        description:
          'We match Slack users to your contacts for relationship tracking.',
      },
    ],
  },
  {
    nangoProvider: 'notion',
    dbProvider: 'notion',
    label: 'Notion',
    icon: FileText,
    permissions: [
      {
        label: 'Read your pages and databases',
        description:
          'We index your Notion content for meeting prep and context retrieval.',
      },
    ],
  },
];

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'connected':
      return (
        <span className="flex items-center gap-1.5 text-sm text-green-600">
          <Check className="h-3.5 w-3.5" /> Connected
        </span>
      );
    case 'error':
      return (
        <span className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-3.5 w-3.5" /> Error
        </span>
      );
    default:
      return null;
  }
}

function TelegramConnectCard() {
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const res = await fetch('/api/telegram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setConnectUrl(data.url);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Telegram</CardTitle>
            <p className="text-sm text-muted-foreground">
              Receive briefings and take actions via Telegram
            </p>
          </div>
        </div>
        {connected && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <Check className="h-3.5 w-3.5" /> Connected
          </span>
        )}
      </CardHeader>
      <CardContent>
        {connectUrl ? (
          <div className="space-y-2">
            <a
              href={connectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-[#0088cc] px-4 py-2 text-sm font-medium text-white hover:bg-[#0077b5]"
            >
              Open in Telegram
            </a>
            <p className="text-xs text-muted-foreground">
              After pressing Start in Telegram, click here to confirm.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setConnected(true); setConnectUrl(null); }}
            >
              I&apos;ve connected
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={handleConnect} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-2 h-3.5 w-3.5" />
            )}
            Connect Telegram
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function IntegrationsSettingsPage() {
  const [integrations, setIntegrations] = useState<UserIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [consentProvider, setConsentProvider] = useState<IntegrationConfig | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations');
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  function getStatus(dbProvider: IntegrationProvider): UserIntegration | undefined {
    return integrations.find((i) => i.provider === dbProvider);
  }

  async function handleConnect(config: IntegrationConfig) {
    setConnecting(true);
    try {
      const res = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: config.nangoProvider }),
      });

      if (res.ok) {
        const data = await res.json();
        window.location.href = data.url;
      }
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect(dbProvider: IntegrationProvider) {
    setDisconnecting(dbProvider);
    try {
      const res = await fetch('/api/integrations/disconnect', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: dbProvider }),
      });

      if (res.ok) {
        await fetchIntegrations();
      }
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
      <p className="mt-1 text-muted-foreground">
        Connect your accounts to power your daily briefing.
      </p>

      <div className="mt-6 grid gap-4">
        <TelegramConnectCard />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          INTEGRATIONS.map((config) => {
            const integration = getStatus(config.dbProvider);
            const isConnected = integration?.status === 'connected';
            const hasError = integration?.status === 'error';
            const Icon = config.icon;

            return (
              <Card key={config.dbProvider}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{config.label}</CardTitle>
                      {integration?.account_email && (
                        <p className="text-sm text-muted-foreground">
                          {integration.account_email}
                        </p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={integration?.status ?? 'disconnected'} />
                </CardHeader>
                <CardContent>
                  {hasError && integration?.error_message && (
                    <p className="mb-3 text-sm text-destructive">
                      {integration.error_message}
                    </p>
                  )}
                  <div className="flex gap-2">
                    {isConnected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(config.dbProvider)}
                        disabled={disconnecting === config.dbProvider}
                      >
                        {disconnecting === config.dbProvider ? (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <X className="mr-2 h-3.5 w-3.5" />
                        )}
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setConsentProvider(config)}
                      >
                        Connect {config.label}
                      </Button>
                    )}
                    {hasError && (
                      <Button
                        size="sm"
                        onClick={() => setConsentProvider(config)}
                      >
                        Reconnect
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
