'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, X, Loader2, Mail, CalendarPlus, Archive, MessageSquare, CalendarClock, Zap } from 'lucide-react';
import type { PendingActionType } from '@/lib/db/types';

export interface OneTapAction {
  id: string;
  action_type: PendingActionType;
  payload: Record<string, unknown>;
  created_at: string;
  expires_at: string;
}

interface OneTapConfirmToastProps {
  action: OneTapAction;
  onResolve: (actionId: string) => void;
}

const COUNTDOWN_MS = 30_000;
const TICK_MS = 100;

function getActionIcon(type: PendingActionType) {
  switch (type) {
    case 'send_message': return MessageSquare;
    case 'send_email': return Mail;
    case 'reschedule_meeting': return CalendarClock;
    case 'create_calendar_event': return CalendarPlus;
    case 'archive_email': return Archive;
    default: return Zap;
  }
}

function getActionSummary(type: PendingActionType, payload: Record<string, unknown>): string {
  switch (type) {
    case 'send_message':
      return `Reply to ${payload.recipient_name ?? 'contact'}`;
    case 'reschedule_meeting':
      return `Reschedule ${payload.meeting_title ?? 'meeting'}`;
    case 'create_calendar_event':
      return `Create event: ${payload.title ?? 'Untitled'}`;
    case 'archive_email':
      return `Archive email from ${payload.sender_domain ?? 'unknown'}`;
    default:
      return `Donna wants to: ${type.replace(/_/g, ' ')}`;
  }
}

export function OneTapConfirmToast({ action, onResolve }: OneTapConfirmToastProps) {
  const [remaining, setRemaining] = useState(COUNTDOWN_MS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolvedRef = useRef(false);

  const resolve = useCallback((id: string) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);
    onResolve(id);
  }, [onResolve]);

  // If expired on mount, resolve immediately
  useEffect(() => {
    if (new Date(action.expires_at) < new Date()) {
      resolve(action.id);
    }
  }, [action.expires_at, action.id, resolve]);

  // Countdown timer
  useEffect(() => {
    if (new Date(action.expires_at) < new Date()) return;

    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const left = COUNTDOWN_MS - elapsed;
      if (left <= 0) {
        setRemaining(0);
        // Timeout — reject with reason
        fetch('/api/actions/reject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pending_action_id: action.id, reason: 'timeout' }),
        }).catch(() => {});
        resolve(action.id);
      } else {
        setRemaining(left);
      }
    }, TICK_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [action.id, action.expires_at, resolve]);

  // Don't render if expired
  if (new Date(action.expires_at) < new Date()) return null;

  async function handleApprove() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/actions/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pending_action_id: action.id }),
      });
      if (!res.ok) throw new Error('Failed to confirm');
      resolve(action.id);
    } catch {
      setError('Failed');
      setTimeout(() => resolve(action.id), 3000);
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    fetch('/api/actions/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pending_action_id: action.id, reason: 'user_dismissed' }),
    }).catch(() => {});
    resolve(action.id);
  }

  const Icon = getActionIcon(action.action_type);
  const summary = getActionSummary(action.action_type, action.payload);
  const progress = remaining / COUNTDOWN_MS;
  const secondsLeft = Math.ceil(remaining / 1000);

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed z-50 bottom-6 right-6 w-[360px] max-sm:left-0 max-sm:right-0 max-sm:bottom-0 max-sm:w-full max-sm:rounded-none rounded-xl shadow-xl overflow-hidden"
      style={{ background: '#1B1F3A', maxHeight: 96 }}
    >
      {/* Content row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Icon size={16} color="#FBF7F4" className="shrink-0" />
        <span
          className="flex-1 text-[13px] font-medium truncate"
          style={{ color: '#FBF7F4' }}
        >
          {error ?? summary}
        </span>
        <button
          onClick={handleApprove}
          disabled={loading}
          aria-label={`Approve: ${summary}`}
          className="shrink-0 flex items-center justify-center h-7 px-3 rounded-md text-[12px] font-semibold transition-opacity"
          style={{ background: '#E8845C', color: '#FFFFFF' }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="shrink-0 flex items-center justify-center h-7 w-7 rounded-md transition-opacity hover:opacity-80"
          style={{ color: '#FBF7F4' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Countdown bar */}
      <div className="h-[3px] w-full" style={{ background: 'rgba(251,247,244,0.1)' }}>
        <div
          aria-label={`${secondsLeft} seconds remaining`}
          className="h-full transition-none"
          style={{
            width: `${progress * 100}%`,
            background: '#E8845C',
          }}
        />
      </div>
    </div>
  );
}
