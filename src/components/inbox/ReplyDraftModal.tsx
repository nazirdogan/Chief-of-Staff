'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface DraftData {
  pending_action_id: string;
  draft: {
    subject: string;
    body: string;
    tone: string;
    sources_used: number;
  };
  expires_at: string;
}

interface ReplyDraftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftData: DraftData | null;
  recipientEmail: string;
  recipientName?: string | null;
  onSent?: () => void;
  onRejected?: () => void;
}

export function ReplyDraftModal({
  open,
  onOpenChange,
  draftData,
  recipientEmail,
  recipientName,
  onSent,
  onRejected,
}: ReplyDraftModalProps) {
  const [editedBody, setEditedBody] = useState<string | null>(null);
  const [loading, setLoading] = useState<'send' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!draftData) return null;

  const displayBody = editedBody ?? draftData.draft.body;

  async function handleSend() {
    if (!draftData) return;
    setLoading('send');
    setError(null);

    try {
      const res = await fetch('/api/actions/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pending_action_id: draftData.pending_action_id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to send email');
        setLoading(null);
        return;
      }

      onSent?.();
      onOpenChange(false);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    if (!draftData) return;
    setLoading('reject');
    setError(null);

    try {
      const res = await fetch('/api/actions/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pending_action_id: draftData.pending_action_id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to reject draft');
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

  const expiresAt = new Date(draftData.expires_at);
  const hoursLeft = Math.max(
    0,
    Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reply Draft</DialogTitle>
          <DialogDescription>
            To: {recipientName ?? recipientEmail}
            {recipientName && (
              <span className="text-muted-foreground"> &lt;{recipientEmail}&gt;</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Subject:</span>
            <span className="text-sm">{draftData.draft.subject}</span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline">{draftData.draft.tone}</Badge>
            <span className="text-xs text-muted-foreground">
              {draftData.draft.sources_used} source{draftData.draft.sources_used !== 1 ? 's' : ''} used
            </span>
            <span className="text-xs text-muted-foreground">
              Expires in {hoursLeft}h
            </span>
          </div>

          <Textarea
            value={displayBody}
            onChange={(e) => setEditedBody(e.target.value)}
            rows={8}
            className="text-sm"
          />

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

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
          <Button onClick={handleSend} disabled={loading !== null}>
            {loading === 'send' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Send Reply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
