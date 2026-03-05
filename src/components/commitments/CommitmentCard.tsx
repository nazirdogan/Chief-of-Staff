'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Commitment } from '@/lib/db/types';

interface CommitmentCardProps {
  commitment: Commitment;
  onAction: (id: string, action: string, snoozedUntil?: string) => Promise<void>;
}

export function CommitmentCard({ commitment, onAction }: CommitmentCardProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const isPossible = commitment.confidence === 'medium';

  async function handleAction(action: string, snoozedUntil?: string) {
    setLoading(action);
    try {
      await onAction(commitment.id, action, snoozedUntil);
    } finally {
      setLoading(null);
    }
  }

  function handleSnooze() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    handleAction('snooze', tomorrow.toISOString());
  }

  return (
    <Card className={isPossible ? 'border-dashed opacity-80' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-sm">
              {commitment.commitment_text}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              To: {commitment.recipient_name || commitment.recipient_email}
            </p>
          </div>
          {isPossible && (
            <span className="shrink-0 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              Possible
            </span>
          )}
          {commitment.confidence === 'high' && (
            <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
              High
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <blockquote className="border-l-2 border-muted-foreground/30 pl-3 text-xs italic text-muted-foreground">
          &ldquo;{commitment.source_quote}&rdquo;
        </blockquote>
        {commitment.implied_deadline && (
          <p className="mt-2 text-xs text-muted-foreground">
            Deadline: {new Date(commitment.implied_deadline).toLocaleDateString()}
          </p>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          size="sm"
          onClick={() => handleAction('resolve')}
          disabled={loading !== null}
        >
          {loading === 'resolve' ? 'Resolving...' : 'Resolve'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSnooze}
          disabled={loading !== null}
        >
          {loading === 'snooze' ? 'Snoozing...' : 'Snooze'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleAction('dismiss')}
          disabled={loading !== null}
        >
          {loading === 'dismiss' ? 'Dismissing...' : 'Dismiss'}
        </Button>
      </CardFooter>
    </Card>
  );
}
