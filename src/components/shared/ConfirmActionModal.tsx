'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface ConfirmActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  pendingActionId: string;
  onConfirmed?: (result: { result_summary: string }) => void;
  onRejected?: () => void;
}

export function ConfirmActionModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm & Execute',
  pendingActionId,
  onConfirmed,
  onRejected,
}: ConfirmActionModalProps) {
  const [loading, setLoading] = useState<'confirm' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading('confirm');
    setError(null);

    try {
      const res = await fetch('/api/actions/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pending_action_id: pendingActionId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to execute action');
        setLoading(null);
        return;
      }

      const data = await res.json();
      onConfirmed?.(data.data);
      onOpenChange(false);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    setLoading('reject');
    setError(null);

    try {
      const res = await fetch('/api/actions/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pending_action_id: pendingActionId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to reject action');
        setLoading(null);
        return;
      }

      onRejected?.();
      onOpenChange(false);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={loading !== null}
          >
            {loading === 'reject' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Discard
          </Button>
          <Button onClick={handleConfirm} disabled={loading !== null}>
            {loading === 'confirm' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
