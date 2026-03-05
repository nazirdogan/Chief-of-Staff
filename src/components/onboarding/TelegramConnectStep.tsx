'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface TelegramConnectStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function TelegramConnectStep({ onNext, onBack, onSkip }: TelegramConnectStepProps) {
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/telegram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error('Failed to generate connect link');

      const data = await res.json();
      setConnectUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Connect Telegram</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Receive your daily briefing and take quick actions directly from Telegram.
          You can always connect later from Settings.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">1</span>
              <span>Click the button below to generate your personal connect link</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">2</span>
              <span>Open the link in Telegram and press Start</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">3</span>
              <span>You&apos;ll receive a confirmation message in Telegram</span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {!connectUrl ? (
            <Button onClick={handleConnect} disabled={loading}>
              {loading ? 'Generating link...' : 'Generate Telegram Connect Link'}
            </Button>
          ) : (
            <div className="space-y-3">
              <a
                href={connectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-[#0088cc] px-4 py-2 text-sm font-medium text-white hover:bg-[#0077b5]"
              >
                Open in Telegram
              </a>
              <p className="text-xs text-muted-foreground">
                Link expires in 15 minutes. Click the button above again to generate a new one.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSkip}>
            Skip for now
          </Button>
          <Button onClick={onNext}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
