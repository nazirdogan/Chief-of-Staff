'use client';

import { useState } from 'react';
import { Loader2, Mail, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';

// ── Color tokens ─────────────────────────────────────────────────

const c = {
  surface: 'rgba(45,45,45,0.04)',
  border: 'rgba(45,45,45,0.08)',
  borderHover: 'rgba(45,45,45,0.16)',
  borderActive: 'rgba(232,132,92,0.35)',
  dawn: '#E8845C',
  dawnLight: '#F09D7A',
  dawnMuted: 'rgba(232,132,92,0.12)',
  text: '#2D2D2D',
  textSecondary: 'rgba(45,45,45,0.8)',
  textMuted: 'rgba(45,45,45,0.5)',
  textGhost: 'rgba(45,45,45,0.4)',
  critical: '#D64B2A',
  info: '#4E7DAA',
  infoMuted: 'rgba(78,125,170,0.10)',
};

// ── Email payload type ────────────────────────────────────────────

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  provider?: string;
}

// ── Props ─────────────────────────────────────────────────────────

interface ConfirmActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  pendingActionId: string;
  /** When provided and action_type === 'send_email', renders the email-specific view */
  action_type?: string;
  emailPayload?: EmailPayload;
  onConfirmed?: (result: { result_summary: string }) => void;
  onRejected?: () => void;
}

// ── ProviderBadge ─────────────────────────────────────────────────

function ProviderBadge({ provider }: { provider?: string }) {
  const isOutlook = provider === 'outlook';
  const label = isOutlook ? 'Outlook' : 'Gmail';
  const color = isOutlook ? c.info : c.dawn;
  const bg = isOutlook ? c.infoMuted : c.dawnMuted;

  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium tracking-wide uppercase"
      style={{ background: bg, color }}
    >
      <Mail size={10} strokeWidth={2} />
      {label}
    </span>
  );
}

// ── Editable field row ────────────────────────────────────────────

function FieldRow({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const sharedInputStyle: React.CSSProperties = {
    flex: 1,
    background: c.surface,
    border: `1px solid ${c.border}`,
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 13,
    color: c.textSecondary,
    caretColor: c.dawn,
    outline: 'none',
    resize: multiline ? 'vertical' : 'none',
    lineHeight: '1.6',
    fontFamily: 'inherit',
  };

  return (
    <div className="flex items-start gap-3">
      <span
        className="shrink-0 w-14 text-right text-[11px] font-medium uppercase tracking-wide"
        style={{ color: c.textGhost, paddingTop: 8 }}
      >
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={8}
          style={{ ...sharedInputStyle, minHeight: 120 }}
          onFocus={(e) => { e.currentTarget.style.borderColor = c.borderActive; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = c.border; }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={sharedInputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = c.borderActive; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = c.border; }}
        />
      )}
    </div>
  );
}

// ── ConfirmActionModal ────────────────────────────────────────────

export function ConfirmActionModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm & Execute',
  pendingActionId,
  action_type,
  emailPayload,
  onConfirmed,
  onRejected,
}: ConfirmActionModalProps) {
  const [loading, setLoading] = useState<'confirm' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable email fields (only relevant when action_type === 'send_email')
  const [editTo, setEditTo] = useState(emailPayload?.to ?? '');
  const [editSubject, setEditSubject] = useState(emailPayload?.subject ?? '');
  const [editBody, setEditBody] = useState(emailPayload?.body ?? '');

  const isEmail = action_type === 'send_email';

  async function handleConfirm() {
    setLoading('confirm');
    setError(null);

    try {
      // If email, persist edits first
      if (isEmail && emailPayload) {
        const patchRes = await fetch(`/api/actions/${pendingActionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payload: { to: editTo, subject: editSubject, body: editBody },
          }),
        });
        if (!patchRes.ok) {
          const d = await patchRes.json().catch(() => ({})) as { error?: string };
          setError(d.error ?? 'Failed to save edits');
          setLoading(null);
          return;
        }
      }

      const res = await fetch('/api/actions/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pending_action_id: pendingActionId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? 'Failed to execute action');
        setLoading(null);
        return;
      }

      const data = await res.json() as { data: { result_summary: string } };
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
        const data = await res.json().catch(() => ({})) as { error?: string };
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

  const isBusy = loading !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 overflow-hidden gap-0"
        style={{
          background: '#fff',
          border: `1px solid ${c.border}`,
          borderRadius: 12,
          boxShadow: '0 12px 40px rgba(45,45,45,0.12), 0 2px 8px rgba(45,45,45,0.06)',
          maxWidth: isEmail ? 560 : 440,
          width: '100%',
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-6 py-5"
          style={{ borderBottom: `1px solid ${c.border}` }}
        >
          <div>
            {isEmail && (
              <div className="flex items-center gap-2 mb-2">
                <Mail size={14} strokeWidth={1.5} color={c.dawn} />
                <span
                  className="text-[11px] font-medium uppercase tracking-wide"
                  style={{ color: c.dawn }}
                >
                  Send Email
                </span>
                <ProviderBadge provider={emailPayload?.provider} />
              </div>
            )}
            <h2 className="text-[15px] font-semibold" style={{ color: c.text }}>
              {title}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed" style={{ color: c.textMuted }}>
              {description}
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="shrink-0 ml-4 flex items-center justify-center w-7 h-7 rounded-md"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: c.textGhost }}
            onMouseEnter={(e) => { e.currentTarget.style.background = c.surface; e.currentTarget.style.color = c.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.textGhost; }}
            aria-label="Close"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Email-specific body */}
        {isEmail && emailPayload && (
          <div className="px-6 py-4 space-y-3">
            <FieldRow label="To" value={editTo} onChange={setEditTo} />
            <FieldRow label="Subject" value={editSubject} onChange={setEditSubject} />
            <div style={{ height: 1, background: c.border }} />
            <FieldRow label="Body" value={editBody} onChange={setEditBody} multiline />
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="mx-6 mb-2 rounded-md px-3 py-2.5 text-[13px]"
            style={{
              background: 'rgba(214,75,42,0.07)',
              border: `1px solid rgba(214,75,42,0.20)`,
              color: c.critical,
            }}
          >
            {error}
          </div>
        )}

        {/* Footer */}
        <DialogFooter
          className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: `1px solid ${c.border}` }}
        >
          {/* Discard */}
          <button
            onClick={handleReject}
            disabled={isBusy}
            className="flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-medium"
            style={{
              background: 'transparent',
              border: `1px solid ${c.border}`,
              color: isBusy ? c.textGhost : c.textMuted,
              cursor: isBusy ? 'default' : 'pointer',
              opacity: loading === 'reject' ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isBusy) {
                e.currentTarget.style.borderColor = 'rgba(214,75,42,0.30)';
                e.currentTarget.style.color = c.critical;
              }
            }}
            onMouseLeave={(e) => {
              if (!isBusy) {
                e.currentTarget.style.borderColor = c.border;
                e.currentTarget.style.color = c.textMuted;
              }
            }}
          >
            {loading === 'reject' ? (
              <Loader2 size={13} strokeWidth={2} className="animate-spin" />
            ) : (
              <X size={13} strokeWidth={2} />
            )}
            Discard
          </button>

          {/* Confirm */}
          <button
            onClick={handleConfirm}
            disabled={isBusy}
            className="flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-medium transition-opacity"
            style={{
              background: isBusy ? c.surface : c.dawn,
              border: 'none',
              color: isBusy ? c.textGhost : '#fff',
              cursor: isBusy ? 'default' : 'pointer',
              opacity: loading === 'confirm' ? 0.7 : 1,
            }}
            onMouseEnter={(e) => { if (!isBusy) e.currentTarget.style.background = c.dawnLight; }}
            onMouseLeave={(e) => { if (!isBusy) e.currentTarget.style.background = c.dawn; }}
          >
            {loading === 'confirm' ? (
              <Loader2 size={13} strokeWidth={2} className="animate-spin" />
            ) : (
              <Mail size={13} strokeWidth={2} />
            )}
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
