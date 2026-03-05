'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CommitmentCard } from './CommitmentCard';
import type { Commitment } from '@/lib/db/types';

export function CommitmentQueue() {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommitments = useCallback(async () => {
    try {
      const res = await fetch('/api/commitments?status=open');
      if (!res.ok) throw new Error('Failed to fetch commitments');
      const data = await res.json();
      setCommitments(data.commitments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommitments();
  }, [fetchCommitments]);

  async function handleAction(id: string, action: string, snoozedUntil?: string) {
    try {
      const res = await fetch(`/api/commitments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, snoozed_until: snoozedUntil }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Action failed');
      }

      setCommitments((prev) => prev.filter((c) => c.id !== id));

      const labels: Record<string, string> = {
        resolve: 'Commitment resolved',
        snooze: 'Commitment snoozed',
        dismiss: 'Commitment dismissed',
        confirm: 'Commitment confirmed',
        reject: 'Commitment rejected',
      };
      toast.success(labels[action] ?? 'Action completed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading commitments...</p>;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  const highConfidence = commitments.filter((c) => c.confidence === 'high');
  const mediumConfidence = commitments.filter((c) => c.confidence === 'medium');

  if (highConfidence.length === 0 && mediumConfidence.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm font-medium">No open commitments</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Commitments are automatically extracted from your sent emails. Connect Gmail or Outlook to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {highConfidence.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Commitments</h3>
          {highConfidence.map((c) => (
            <CommitmentCard key={c.id} commitment={c} onAction={handleAction} />
          ))}
        </div>
      )}
      {mediumConfidence.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Possible</h3>
          {mediumConfidence.map((c) => (
            <CommitmentCard key={c.id} commitment={c} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  );
}
