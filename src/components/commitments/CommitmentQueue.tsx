'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
import { CommitmentCard } from './CommitmentCard';
import type { Commitment } from '@/lib/db/types';

const c = {
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.14)',
  dawn: '#E8845C',
  dawnSubtle: 'rgba(232,132,92,0.15)',
  text: '#FFFFFF',
  textTertiary: 'rgba(255,255,255,0.55)',
  textQuaternary: 'rgba(255,255,255,0.35)',
};

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
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{ height: 80, borderRadius: 10, background: c.dawnSubtle, border: `1px solid ${c.border}` }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: 24, borderRadius: 12, textAlign: 'center',
          background: 'rgba(214,75,42,0.08)', border: '1px solid rgba(214,75,42,0.2)',
        }}
      >
        <p style={{ fontSize: 13, color: '#D64B2A' }}>{error}</p>
      </div>
    );
  }

  const highConfidence = commitments.filter((c) => c.confidence === 'high');
  const mediumConfidence = commitments.filter((c) => c.confidence === 'medium');

  if (highConfidence.length === 0 && mediumConfidence.length === 0) {
    return (
      <div style={{
        padding: 48, textAlign: 'center', borderRadius: 12,
        border: `1px dashed ${c.borderHover}`, background: c.surface,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, display: 'flex',
          alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          background: c.dawnSubtle,
        }}>
          <CheckCircle2 size={22} color={c.dawn} />
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: c.text }}>No open commitments</p>
        <p style={{ fontSize: 13, color: c.textTertiary, marginTop: 4, maxWidth: 320, margin: '4px auto 0' }}>
          Commitments are automatically extracted from your sent emails. Connect Gmail or Outlook to get started.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {highConfidence.length > 0 && (
        <div>
          <p
            style={{
              fontSize: 11, fontWeight: 600, color: c.textQuaternary,
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
            }}
          >
            Commitments
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {highConfidence.map((c) => (
              <CommitmentCard key={c.id} commitment={c} onAction={handleAction} />
            ))}
          </div>
        </div>
      )}
      {mediumConfidence.length > 0 && (
        <div>
          <p
            style={{
              fontSize: 11, fontWeight: 600, color: c.textQuaternary,
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
            }}
          >
            Possible
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {mediumConfidence.map((c) => (
              <CommitmentCard key={c.id} commitment={c} onAction={handleAction} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
