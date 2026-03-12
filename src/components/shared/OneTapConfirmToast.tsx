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
const TICK_MS = 50; // 50 ms ticks for a smoother progress bar

function getActionIcon(type: PendingActionType) {
  switch (type) {
    case 'send_message':        return MessageSquare;
    case 'send_email':          return Mail;
    case 'reschedule_meeting':  return CalendarClock;
    case 'create_calendar_event': return CalendarPlus;
    case 'archive_email':       return Archive;
    default:                    return Zap;
  }
}

function getActionLabel(type: PendingActionType): string {
  switch (type) {
    case 'send_message':          return 'Send message';
    case 'send_email':            return 'Send email';
    case 'reschedule_meeting':    return 'Reschedule meeting';
    case 'create_calendar_event': return 'Create calendar event';
    case 'archive_email':         return 'Archive email';
    case 'create_task':           return 'Create task';
    case 'update_notion_page':    return 'Update Notion page';
    case 'task_reminder':         return 'Set task reminder';
    case 'view_meeting_prep':     return 'Open meeting prep';
    default:                      return (type as string).replace(/_/g, ' ');
  }
}

function getActionSummary(type: PendingActionType, payload: Record<string, unknown>): string {
  switch (type) {
    case 'send_message':
      return `Reply to ${String(payload.recipient_name ?? 'contact')}`;
    case 'send_email':
      return payload.subject
        ? `Send — ${String(payload.subject)}`
        : `Send email to ${String(payload.to ?? 'recipient')}`;
    case 'reschedule_meeting':
      return `Reschedule ${String(payload.meeting_title ?? 'meeting')}`;
    case 'create_calendar_event':
      return `Create event: ${String(payload.title ?? 'Untitled')}`;
    case 'archive_email':
      return `Archive from ${String(payload.sender_domain ?? 'unknown')}`;
    case 'create_task':
      return `Add task: ${String(payload.title ?? 'Untitled')}`;
    default:
      return getActionLabel(type);
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

  // Resolve immediately if already expired on mount
  useEffect(() => {
    if (new Date(action.expires_at) < new Date()) {
      resolve(action.id);
    }
  }, [action.expires_at, action.id, resolve]);

  // Countdown timer — ticks at TICK_MS for smooth visual progress
  useEffect(() => {
    if (new Date(action.expires_at) < new Date()) return;

    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const left = COUNTDOWN_MS - elapsed;
      if (left <= 0) {
        setRemaining(0);
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
  const label = getActionLabel(action.action_type);
  const progress = remaining / COUNTDOWN_MS; // 1.0 → 0.0
  const secondsLeft = Math.ceil(remaining / 1000);

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed z-50 bottom-6 right-6 w-[380px] max-sm:left-0 max-sm:right-0 max-sm:bottom-0 max-sm:w-full max-sm:rounded-none rounded-xl overflow-hidden"
      style={{
        background: '#1C2B38',
        boxShadow: '0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.16)',
      }}
    >
      {/* Content row */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Icon + label column */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <Icon size={15} color="rgba(251,247,244,0.55)" />
        </div>

        {/* Text column */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[11px] font-medium uppercase tracking-wide leading-none mb-0.5"
            style={{ color: 'rgba(232,132,92,0.80)' }}
          >
            {label}
          </p>
          <p
            className="text-[13px] font-medium truncate"
            style={{ color: error ? '#F4897B' : '#FBF7F4' }}
          >
            {error ?? summary}
          </p>
        </div>

        {/* Seconds badge */}
        <span
          className="shrink-0 text-[12px] font-medium tabular-nums"
          style={{ color: 'rgba(251,247,244,0.45)', minWidth: 24, textAlign: 'right' }}
          aria-label={`${secondsLeft}s remaining`}
        >
          {secondsLeft}s
        </span>

        {/* Approve button */}
        <button
          onClick={handleApprove}
          disabled={loading}
          aria-label={`Approve: ${summary}`}
          className="shrink-0 flex items-center justify-center h-7 px-3 rounded-md text-[12px] font-semibold"
          style={{
            background: '#E8845C',
            color: '#FFFFFF',
            border: 'none',
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'opacity 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#F09D7A'; }}
          onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = '#E8845C'; }}
        >
          {loading
            ? <Loader2 size={13} strokeWidth={2} className="animate-spin" />
            : <Check size={13} strokeWidth={2.5} />
          }
        </button>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="shrink-0 flex items-center justify-center h-7 w-7 rounded-md"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(251,247,244,0.45)',
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#FBF7F4';
            e.currentTarget.style.background = 'rgba(251,247,244,0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(251,247,244,0.45)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Countdown bar — dawn orange draining left to right */}
      <div
        className="h-[3px] w-full"
        style={{ background: 'rgba(232,132,92,0.15)' }}
        role="progressbar"
        aria-valuenow={secondsLeft}
        aria-valuemin={0}
        aria-valuemax={30}
      >
        <div
          className="h-full"
          style={{
            width: `${progress * 100}%`,
            background: '#E8845C',
            // No CSS transition — JS ticks at 50 ms so the bar is already smooth
          }}
        />
      </div>
    </div>
  );
}
