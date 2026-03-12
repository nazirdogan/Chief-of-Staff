'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Edit3, X, Mail, Check, Loader2 } from 'lucide-react';

const c = {
  surface: 'rgba(45,45,45,0.04)',
  surfaceElevated: 'rgba(45,45,45,0.06)',
  border: 'rgba(45,45,45,0.08)',
  borderHover: 'rgba(45,45,45,0.16)',
  borderActive: 'rgba(232,132,92,0.35)',
  dawn: '#E8845C',
  dawnLight: '#F09D7A',
  dawnMuted: 'rgba(232,132,92,0.12)',
  text: '#2D2D2D',
  textSecondary: 'rgba(45,45,45,0.8)',
  textTertiary: 'rgba(45,45,45,0.6)',
  textMuted: 'rgba(45,45,45,0.5)',
  textGhost: 'rgba(45,45,45,0.4)',
  critical: '#D64B2A',
  success: '#52B788',
  info: '#4E7DAA',
};

type DraftStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'discarded';

export interface EmailDraftCardProps {
  draft: { to: string; subject: string; body: string; provider?: string };
  pendingActionId: string;
  expiresAt?: string;
}

function ProviderBadge({ provider }: { provider?: string }) {
  const label = provider === 'outlook' ? 'Outlook' : 'Gmail';
  const color = provider === 'outlook' ? c.info : c.dawn;
  const bg = provider === 'outlook' ? 'rgba(78,125,170,0.10)' : c.dawnMuted;

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

export default function EmailDraftCard({
  draft,
  pendingActionId,
  expiresAt,
}: EmailDraftCardProps) {
  const [status, setStatus] = useState<DraftStatus>('pending');
  const [isEditing, setIsEditing] = useState(false);

  const [editTo, setEditTo] = useState(draft.to);
  const [editSubject, setEditSubject] = useState(draft.subject);
  const [editBody, setEditBody] = useState(draft.body);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isFinal = status === 'sent' || status === 'discarded' || status === 'failed';

  async function handleSend() {
    if (status !== 'pending') return;
    setStatus('sending');
    setErrorMsg(null);

    try {
      // If in edit mode, persist edits first
      if (isEditing) {
        const patchRes = await fetch(`/api/actions/${pendingActionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payload: { to: editTo, subject: editSubject, body: editBody },
          }),
        });
        if (!patchRes.ok) throw new Error('Failed to save edits');
        setIsEditing(false);
      }

      const res = await fetch('/api/actions/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pending_action_id: pendingActionId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Send failed');
      }

      setStatus('sent');
    } catch (err) {
      setStatus('failed');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  async function handleDiscard() {
    if (status !== 'pending') return;
    setStatus('sending'); // reuse sending state to disable buttons
    setErrorMsg(null);

    try {
      const res = await fetch('/api/actions/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pending_action_id: pendingActionId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Discard failed');
      }

      setStatus('discarded');
    } catch (err) {
      setStatus('failed');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  async function handleSaveEdits() {
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/actions/${pendingActionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: { to: editTo, subject: editSubject, body: editBody },
        }),
      });
      if (!res.ok) throw new Error('Failed to save edits');
      setIsEditing(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not save edits');
    }
  }

  // ── Final states ─────────────────────────────────────────────

  if (status === 'sent') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex items-center gap-2.5 rounded-lg px-4 py-3"
        style={{
          background: 'rgba(82,183,136,0.08)',
          border: `1px solid rgba(82,183,136,0.20)`,
        }}
      >
        <Check size={15} strokeWidth={2.5} color={c.success} />
        <span className="text-[13px] font-medium" style={{ color: c.success }}>
          Email sent
        </span>
        <span className="text-[12px]" style={{ color: c.textGhost }}>
          — {editSubject}
        </span>
      </motion.div>
    );
  }

  if (status === 'discarded') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2.5 rounded-lg px-4 py-3"
        style={{
          background: c.surface,
          border: `1px solid ${c.border}`,
        }}
      >
        <X size={14} strokeWidth={2} color={c.textGhost} />
        <span className="text-[13px]" style={{ color: c.textMuted }}>
          Draft discarded
        </span>
      </motion.div>
    );
  }

  // ── Main card ────────────────────────────────────────────────

  const isBusy = status === 'sending';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-lg overflow-hidden"
      style={{
        background: '#fff',
        border: `1px solid ${c.border}`,
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{
          background: c.surface,
          borderBottom: `1px solid ${c.border}`,
        }}
      >
        <div className="flex items-center gap-2">
          <Mail size={13} strokeWidth={1.5} color={c.textGhost} />
          <span className="text-[12px] font-medium uppercase tracking-wide" style={{ color: c.textMuted }}>
            Email Draft
          </span>
        </div>
        <ProviderBadge provider={draft.provider} />
      </div>

      {/* Fields */}
      <div className="px-4 py-3 space-y-2.5">
        {/* To */}
        <div className="flex items-start gap-3">
          <span
            className="shrink-0 w-14 text-right text-[12px] font-medium uppercase tracking-wide pt-0.5"
            style={{ color: c.textGhost }}
          >
            To
          </span>
          {isEditing ? (
            <input
              type="text"
              value={editTo}
              onChange={(e) => setEditTo(e.target.value)}
              className="flex-1 rounded-md px-2.5 py-1.5 text-[13px] outline-none"
              style={{
                background: c.surface,
                border: `1px solid ${c.border}`,
                color: c.text,
                caretColor: c.dawn,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = c.borderActive;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = c.border;
              }}
            />
          ) : (
            <span className="text-[13px] pt-0.5" style={{ color: c.textSecondary }}>
              {editTo}
            </span>
          )}
        </div>

        {/* Subject */}
        <div className="flex items-start gap-3">
          <span
            className="shrink-0 w-14 text-right text-[12px] font-medium uppercase tracking-wide pt-0.5"
            style={{ color: c.textGhost }}
          >
            Subject
          </span>
          {isEditing ? (
            <input
              type="text"
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
              className="flex-1 rounded-md px-2.5 py-1.5 text-[13px] outline-none"
              style={{
                background: c.surface,
                border: `1px solid ${c.border}`,
                color: c.text,
                caretColor: c.dawn,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = c.borderActive;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = c.border;
              }}
            />
          ) : (
            <span className="text-[13px] font-medium pt-0.5" style={{ color: c.text }}>
              {editSubject}
            </span>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: c.border }} />

        {/* Body */}
        {isEditing ? (
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={6}
            className="w-full resize-y rounded-md px-2.5 py-2 text-[13px] leading-relaxed outline-none"
            style={{
              background: c.surface,
              border: `1px solid ${c.border}`,
              color: c.textSecondary,
              caretColor: c.dawn,
              minHeight: 100,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = c.borderActive;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = c.border;
            }}
          />
        ) : (
          <p
            className="text-[13px] leading-relaxed whitespace-pre-wrap"
            style={{ color: c.textSecondary }}
          >
            {editBody}
          </p>
        )}
      </div>

      {/* Error */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-2"
          >
            <p className="text-[12px]" style={{ color: c.critical }}>
              {errorMsg}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expiry note */}
      {expiresAt && status === 'pending' && (() => {
        const exp = new Date(expiresAt);
        const now = new Date();
        const diffMin = Math.round((exp.getTime() - now.getTime()) / 60000);
        if (diffMin > 0 && diffMin < 60) {
          return (
            <div className="px-4 pb-2">
              <p className="text-[11px]" style={{ color: c.textGhost }}>
                Expires in {diffMin} min
              </p>
            </div>
          );
        }
        return null;
      })()}

      {/* Action buttons */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderTop: `1px solid ${c.border}` }}
      >
        {/* Left: Discard */}
        <button
          onClick={handleDiscard}
          disabled={isBusy || isFinal}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors"
          style={{
            background: 'transparent',
            border: `1px solid ${c.border}`,
            color: isBusy || isFinal ? c.textGhost : c.textMuted,
            cursor: isBusy || isFinal ? 'default' : 'pointer',
            opacity: isBusy || isFinal ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isBusy && !isFinal) {
              e.currentTarget.style.borderColor = 'rgba(214,75,42,0.30)';
              e.currentTarget.style.color = c.critical;
            }
          }}
          onMouseLeave={(e) => {
            if (!isBusy && !isFinal) {
              e.currentTarget.style.borderColor = c.border;
              e.currentTarget.style.color = c.textMuted;
            }
          }}
        >
          <X size={13} strokeWidth={2} />
          Discard
        </button>

        {/* Right: Edit / Save + Send */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <button
              onClick={handleSaveEdits}
              disabled={isBusy}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors"
              style={{
                background: 'transparent',
                border: `1px solid ${c.border}`,
                color: c.textSecondary,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = c.borderHover;
                e.currentTarget.style.background = c.surface;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = c.border;
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Check size={13} strokeWidth={2.5} />
              Save
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              disabled={isBusy || isFinal}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors"
              style={{
                background: 'transparent',
                border: `1px solid ${c.border}`,
                color: isBusy || isFinal ? c.textGhost : c.textSecondary,
                cursor: isBusy || isFinal ? 'default' : 'pointer',
                opacity: isBusy || isFinal ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isBusy && !isFinal) {
                  e.currentTarget.style.borderColor = c.borderHover;
                  e.currentTarget.style.background = c.surface;
                }
              }}
              onMouseLeave={(e) => {
                if (!isBusy && !isFinal) {
                  e.currentTarget.style.borderColor = c.border;
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <Edit3 size={13} strokeWidth={1.5} />
              Edit
            </button>
          )}

          <button
            onClick={handleSend}
            disabled={isBusy || isFinal}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-opacity"
            style={{
              background: isBusy || isFinal ? c.surfaceElevated : c.dawn,
              border: 'none',
              color: isBusy || isFinal ? c.textGhost : '#fff',
              cursor: isBusy || isFinal ? 'default' : 'pointer',
              opacity: isBusy ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isBusy && !isFinal) {
                e.currentTarget.style.background = c.dawnLight;
              }
            }}
            onMouseLeave={(e) => {
              if (!isBusy && !isFinal) {
                e.currentTarget.style.background = c.dawn;
              }
            }}
          >
            {isBusy ? (
              <Loader2 size={13} strokeWidth={2} className="animate-spin" />
            ) : (
              <Send size={13} strokeWidth={2} />
            )}
            {isBusy ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
