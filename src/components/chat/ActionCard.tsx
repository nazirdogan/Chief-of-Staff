'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  CheckCircle2,
  FileText,
  Globe,
  X,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Users,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import EmailDraftCard from './EmailDraftCard';

// ── Color tokens (consistent with ChatMessage + EmailDraftCard) ───

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
  textMuted: 'rgba(45,45,45,0.5)',
  textGhost: 'rgba(45,45,45,0.4)',
  critical: '#D64B2A',
  success: '#52B788',
  successMuted: 'rgba(82,183,136,0.10)',
  calendarAccent: '#6B7FD7',
  calendarMuted: 'rgba(107,127,215,0.10)',
  taskAccent: '#52B788',
  searchAccent: '#4E7DAA',
  searchMuted: 'rgba(78,125,170,0.10)',
};

// ── Types ─────────────────────────────────────────────────────────

export type ActionType = 'email_draft' | 'calendar_event' | 'task_created' | 'meeting_prep' | 'web_search';
export type ActionStatus = 'pending' | 'confirmed' | 'executed' | 'failed';

export interface ActionCardProps {
  type: ActionType;
  data: Record<string, unknown>;
  pendingActionId?: string;
  status?: ActionStatus;
  expiresAt?: string;
}

// ── Shared status badge ───────────────────────────────────────────

function StatusBadge({ status }: { status: ActionStatus }) {
  if (status === 'pending') return null;

  const map: Record<Exclude<ActionStatus, 'pending'>, { label: string; color: string; bg: string }> = {
    confirmed: { label: 'Confirmed', color: c.success, bg: c.successMuted },
    executed:  { label: 'Executed',  color: c.success, bg: c.successMuted },
    failed:    { label: 'Failed',    color: c.critical, bg: 'rgba(214,75,42,0.08)' },
  };

  const { label, color, bg } = map[status];

  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium tracking-wide uppercase"
      style={{ background: bg, color }}
    >
      {status === 'failed'
        ? <X size={9} strokeWidth={2.5} />
        : <Check size={9} strokeWidth={2.5} />
      }
      {label}
    </span>
  );
}

// ── Card header strip (shared across variants) ────────────────────

interface CardHeaderProps {
  icon: React.ReactNode;
  label: string;
  accent: string;
  status?: ActionStatus;
  rightSlot?: React.ReactNode;
}

function CardHeader({ icon, label, accent, status, rightSlot }: CardHeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2.5"
      style={{
        background: c.surface,
        borderBottom: `1px solid ${c.border}`,
      }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color: accent }}>{icon}</span>
        <span
          className="text-[12px] font-medium uppercase tracking-wide"
          style={{ color: c.textMuted }}
        >
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {status && <StatusBadge status={status} />}
        {rightSlot}
      </div>
    </div>
  );
}

// ── Action button row (shared) ────────────────────────────────────

interface ActionRowProps {
  onConfirm: () => void;
  onDiscard: () => void;
  confirmLabel?: string;
  isBusy: boolean;
  isFinal: boolean;
  accentColor: string;
  accentLight: string;
}

function ActionRow({
  onConfirm,
  onDiscard,
  confirmLabel = 'Confirm',
  isBusy,
  isFinal,
  accentColor,
  accentLight,
}: ActionRowProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3"
      style={{ borderTop: `1px solid ${c.border}` }}
    >
      <button
        onClick={onDiscard}
        disabled={isBusy || isFinal}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium"
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

      <button
        onClick={onConfirm}
        disabled={isBusy || isFinal}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-opacity"
        style={{
          background: isBusy || isFinal ? c.surfaceElevated : accentColor,
          border: 'none',
          color: isBusy || isFinal ? c.textGhost : '#fff',
          cursor: isBusy || isFinal ? 'default' : 'pointer',
          opacity: isBusy ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isBusy && !isFinal) e.currentTarget.style.background = accentLight;
        }}
        onMouseLeave={(e) => {
          if (!isBusy && !isFinal) e.currentTarget.style.background = accentColor;
        }}
      >
        {isBusy ? <Loader2 size={13} strokeWidth={2} className="animate-spin" /> : <Check size={13} strokeWidth={2.5} />}
        {isBusy ? 'Working…' : confirmLabel}
      </button>
    </div>
  );
}

// ── Calendar Event Card ───────────────────────────────────────────

interface CalendarEventData {
  title?: string;
  start_time?: string;
  end_time?: string;
  attendees?: string[];
  location?: string;
  description?: string;
}

function CalendarEventCard({
  data,
  pendingActionId,
  status = 'pending',
}: {
  data: CalendarEventData;
  pendingActionId?: string;
  status?: ActionStatus;
}) {
  const [localStatus, setLocalStatus] = useState<ActionStatus>(status);
  const isBusy = localStatus === 'confirmed';
  const isFinal = localStatus === 'executed' || localStatus === 'failed';

  function formatEventTime(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async function handleConfirm() {
    if (!pendingActionId || isBusy || isFinal) return;
    setLocalStatus('confirmed');
    try {
      const res = await fetch('/api/actions/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pending_action_id: pendingActionId }),
      });
      if (!res.ok) throw new Error();
      setLocalStatus('executed');
    } catch {
      setLocalStatus('failed');
    }
  }

  async function handleDiscard() {
    if (!pendingActionId || isBusy || isFinal) return;
    setLocalStatus('confirmed');
    try {
      await fetch('/api/actions/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pending_action_id: pendingActionId }),
      });
      setLocalStatus('failed');
    } catch {
      setLocalStatus('failed');
    }
  }

  if (localStatus === 'executed') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2.5 rounded-lg px-4 py-3"
        style={{ background: c.calendarMuted, border: `1px solid rgba(107,127,215,0.20)` }}
      >
        <CheckCircle2 size={15} strokeWidth={2} color={c.calendarAccent} />
        <span className="text-[13px] font-medium" style={{ color: c.calendarAccent }}>
          Event created — {data.title ?? 'Untitled'}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-lg overflow-hidden"
      style={{ background: '#fff', border: `1px solid ${c.border}` }}
    >
      <CardHeader
        icon={<Calendar size={13} strokeWidth={1.5} />}
        label="Calendar Event"
        accent={c.calendarAccent}
        status={localStatus}
      />

      <div className="px-4 py-3 space-y-2.5">
        {/* Title */}
        <p className="text-[14px] font-semibold" style={{ color: c.text }}>
          {data.title ?? 'Untitled Event'}
        </p>

        {/* Time row */}
        <div className="flex items-start gap-2.5">
          <Clock size={13} strokeWidth={1.5} color={c.textGhost} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px]" style={{ color: c.textSecondary }}>
              {formatEventTime(data.start_time)}
            </p>
            {data.end_time && (
              <p className="text-[12px]" style={{ color: c.textMuted }}>
                until {formatEventTime(data.end_time)}
              </p>
            )}
          </div>
        </div>

        {/* Location */}
        {data.location && (
          <div className="flex items-start gap-2.5">
            <MapPin size={13} strokeWidth={1.5} color={c.textGhost} className="mt-0.5 shrink-0" />
            <p className="text-[13px]" style={{ color: c.textSecondary }}>
              {data.location}
            </p>
          </div>
        )}

        {/* Attendees */}
        {data.attendees && data.attendees.length > 0 && (
          <div className="flex items-start gap-2.5">
            <Users size={13} strokeWidth={1.5} color={c.textGhost} className="mt-0.5 shrink-0" />
            <p className="text-[13px]" style={{ color: c.textSecondary }}>
              {data.attendees.join(', ')}
            </p>
          </div>
        )}

        {/* Description */}
        {data.description && (
          <>
            <div style={{ height: 1, background: c.border }} />
            <p className="text-[13px] leading-relaxed" style={{ color: c.textMuted }}>
              {data.description}
            </p>
          </>
        )}
      </div>

      <ActionRow
        onConfirm={handleConfirm}
        onDiscard={handleDiscard}
        confirmLabel="Add to Calendar"
        isBusy={isBusy}
        isFinal={isFinal}
        accentColor={c.calendarAccent}
        accentLight="#8494E0"
      />
    </motion.div>
  );
}

// ── Task Created Card ─────────────────────────────────────────────

interface TaskCreatedData {
  title?: string;
  due_date?: string;
  priority?: 'high' | 'medium' | 'low';
  source_snippet?: string;
  task_id?: string;
}

function TaskCreatedCard({
  data,
  status = 'executed',
}: {
  data: TaskCreatedData;
  status?: ActionStatus;
}) {
  const priorityColor: Record<string, string> = {
    high:   c.critical,
    medium: c.dawn,
    low:    c.textGhost,
  };
  const pri = (data.priority ?? 'medium') as string;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-lg overflow-hidden"
      style={{ background: '#fff', border: `1px solid ${c.border}` }}
    >
      <CardHeader
        icon={<CheckCircle2 size={13} strokeWidth={1.5} />}
        label="Task Extracted"
        accent={c.taskAccent}
        status={status}
      />

      <div className="flex items-center justify-between px-4 py-3 gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium truncate" style={{ color: c.text }}>
            {data.title ?? 'Untitled Task'}
          </p>
          {data.due_date && (
            <p className="text-[12px] mt-0.5" style={{ color: c.textMuted }}>
              Due {new Date(data.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </p>
          )}
          {data.source_snippet && (
            <p
              className="text-[12px] mt-1.5 leading-snug line-clamp-2"
              style={{ color: c.textGhost, fontStyle: 'italic' }}
            >
              &ldquo;{data.source_snippet}&rdquo;
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Priority dot */}
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: priorityColor[pri] ?? c.textGhost }}
            title={`Priority: ${pri}`}
          />
          {/* View link */}
          {data.task_id && (
            <a
              href={`/tasks`}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[12px] font-medium"
              style={{
                background: c.surface,
                border: `1px solid ${c.border}`,
                color: c.textSecondary,
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = c.borderHover;
                e.currentTarget.style.background = c.surfaceElevated;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = c.border;
                e.currentTarget.style.background = c.surface;
              }}
            >
              View
              <ArrowRight size={11} strokeWidth={2} />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Meeting Prep Card ─────────────────────────────────────────────

interface MeetingPrepData {
  meeting_title?: string;
  attendees?: string[];
  scheduled_at?: string;
  key_points?: string[];
  background?: string;
  action_items?: string[];
  sources?: Array<{ label: string; ref: string }>;
}

function MeetingPrepCard({
  data,
  status = 'executed',
}: {
  data: MeetingPrepData;
  status?: ActionStatus;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasBody = (data.key_points?.length ?? 0) > 0 || !!data.background || (data.action_items?.length ?? 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-lg overflow-hidden"
      style={{ background: '#fff', border: `1px solid ${c.border}` }}
    >
      <CardHeader
        icon={<FileText size={13} strokeWidth={1.5} />}
        label="Meeting Prep"
        accent={c.dawn}
        status={status}
      />

      {/* Always-visible summary row */}
      <button
        onClick={() => hasBody && setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{ cursor: hasBody ? 'pointer' : 'default' }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold" style={{ color: c.text }}>
            {data.meeting_title ?? 'Upcoming Meeting'}
          </p>
          {data.scheduled_at && (
            <p className="text-[12px] mt-0.5" style={{ color: c.textMuted }}>
              {new Date(data.scheduled_at).toLocaleString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
          {data.attendees && data.attendees.length > 0 && (
            <p className="text-[12px] mt-0.5" style={{ color: c.textGhost }}>
              {data.attendees.join(', ')}
            </p>
          )}
        </div>
        {hasBody && (
          <span style={{ color: c.textGhost, marginLeft: 12 }}>
            {expanded ? <ChevronUp size={15} strokeWidth={2} /> : <ChevronDown size={15} strokeWidth={2} />}
          </span>
        )}
      </button>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ overflow: 'hidden', borderTop: `1px solid ${c.border}` }}
          >
            <div className="px-4 py-3 space-y-3">
              {data.background && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: c.textGhost }}>
                    Background
                  </p>
                  <p className="text-[13px] leading-relaxed" style={{ color: c.textSecondary }}>
                    {data.background}
                  </p>
                </div>
              )}

              {data.key_points && data.key_points.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: c.textGhost }}>
                    Key Points
                  </p>
                  <ul className="space-y-1">
                    {data.key_points.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span
                          className="mt-1.5 w-1 h-1 rounded-full shrink-0"
                          style={{ background: c.dawn }}
                        />
                        <span className="text-[13px] leading-relaxed" style={{ color: c.textSecondary }}>
                          {pt}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.action_items && data.action_items.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: c.textGhost }}>
                    Action Items
                  </p>
                  <ul className="space-y-1">
                    {data.action_items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ArrowRight size={11} strokeWidth={2} color={c.dawn} className="mt-1 shrink-0" />
                        <span className="text-[13px] leading-relaxed" style={{ color: c.textSecondary }}>
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.sources && data.sources.length > 0 && (
                <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 10 }}>
                  <p className="text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: c.textGhost }}>
                    Sources
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {data.sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.ref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium"
                        style={{
                          background: c.surface,
                          border: `1px solid ${c.border}`,
                          color: c.textMuted,
                          textDecoration: 'none',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.borderHover; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; }}
                      >
                        <ExternalLink size={9} strokeWidth={2} />
                        {src.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Web Search Card ───────────────────────────────────────────────

interface WebSearchResult {
  title?: string;
  url?: string;
  snippet?: string;
  source?: string;
}

interface WebSearchData {
  query?: string;
  results?: WebSearchResult[];
  summary?: string;
}

function WebSearchCard({
  data,
  status = 'executed',
}: {
  data: WebSearchData;
  status?: ActionStatus;
}) {
  const [expanded, setExpanded] = useState(false);
  const results = data.results ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-lg overflow-hidden"
      style={{ background: '#fff', border: `1px solid ${c.border}` }}
    >
      <CardHeader
        icon={<Globe size={13} strokeWidth={1.5} />}
        label="Web Search"
        accent={c.searchAccent}
        status={status}
      />

      <div className="px-4 py-3">
        {/* Query pill */}
        {data.query && (
          <div
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium mb-3"
            style={{ background: c.searchMuted, color: c.searchAccent }}
          >
            <Globe size={11} strokeWidth={2} />
            {data.query}
          </div>
        )}

        {/* Summary */}
        {data.summary && (
          <p className="text-[13px] leading-relaxed" style={{ color: c.textSecondary }}>
            {data.summary}
          </p>
        )}

        {/* Toggle results */}
        {results.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-2.5 flex items-center gap-1 text-[12px] font-medium"
            style={{ color: c.searchAccent, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {expanded ? <ChevronUp size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />}
            {expanded ? 'Hide sources' : `${results.length} source${results.length !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      {/* Expandable source list */}
      <AnimatePresence initial={false}>
        {expanded && results.length > 0 && (
          <motion.div
            key="results"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ overflow: 'hidden', borderTop: `1px solid ${c.border}` }}
          >
            <div className="divide-y" style={{ borderColor: c.border }}>
              {results.map((result, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium leading-snug" style={{ color: c.text }}>
                        {result.title ?? result.url ?? 'Source'}
                      </p>
                      {result.source && (
                        <p className="text-[11px] mt-0.5" style={{ color: c.textGhost }}>
                          {result.source}
                        </p>
                      )}
                      {result.snippet && (
                        <p
                          className="text-[12px] mt-1.5 leading-snug line-clamp-2"
                          style={{ color: c.textMuted }}
                        >
                          {result.snippet}
                        </p>
                      )}
                    </div>
                    {result.url && (
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md"
                        style={{
                          background: c.surface,
                          border: `1px solid ${c.border}`,
                          color: c.textGhost,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = c.borderHover;
                          e.currentTarget.style.color = c.searchAccent;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = c.border;
                          e.currentTarget.style.color = c.textGhost;
                        }}
                        aria-label={`Open ${result.title ?? result.url}`}
                      >
                        <ExternalLink size={12} strokeWidth={2} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main ActionCard router ────────────────────────────────────────

export default function ActionCard({
  type,
  data,
  pendingActionId,
  status = 'pending',
  expiresAt,
}: ActionCardProps) {
  if (type === 'email_draft') {
    // Delegate to EmailDraftCard — it handles its own state fully
    const draft = data.draft as { to: string; subject: string; body: string; provider?: string } | undefined;
    if (!draft || !pendingActionId) return null;
    return (
      <EmailDraftCard
        draft={draft}
        pendingActionId={pendingActionId}
        expiresAt={expiresAt}
      />
    );
  }

  if (type === 'calendar_event') {
    return (
      <CalendarEventCard
        data={data as CalendarEventData}
        pendingActionId={pendingActionId}
        status={status}
      />
    );
  }

  if (type === 'task_created') {
    return (
      <TaskCreatedCard
        data={data as TaskCreatedData}
        status={status}
      />
    );
  }

  if (type === 'meeting_prep') {
    return (
      <MeetingPrepCard
        data={data as MeetingPrepData}
        status={status}
      />
    );
  }

  if (type === 'web_search') {
    return (
      <WebSearchCard
        data={data as WebSearchData}
        status={status}
      />
    );
  }

  return null;
}
