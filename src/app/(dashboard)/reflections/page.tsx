'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Sun,
  Moon,
  CalendarDays,
  BookOpen,
  Plus,
  X,
  Clock,
  Trash2,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import type { UserRoutine, RoutineOutput, RoutineType, RoutineFrequency } from '@/lib/db/types';

/* ── Brand tokens ─────────────────────────────────────────── */
const c = {
  surface: 'rgba(45,45,45,0.04)',
  surfaceElevated: 'rgba(45,45,45,0.07)',
  border: 'rgba(45,45,45,0.08)',
  borderHover: 'rgba(45,45,45,0.18)',
  dawn: '#E8845C',
  dawnMuted: 'rgba(232,132,92,0.1)',
  dawnBorder: 'rgba(232,132,92,0.22)',
  text: '#2D2D2D',
  textSecondary: 'rgba(45,45,45,0.78)',
  textTertiary: 'rgba(45,45,45,0.58)',
  textMuted: 'rgba(45,45,45,0.45)',
  textGhost: 'rgba(45,45,45,0.32)',
  sage: '#52B788',
  sageBg: 'rgba(82,183,136,0.08)',
  sageBorder: 'rgba(82,183,136,0.2)',
  alert: '#D64B2A',
  alertBorder: 'rgba(214,75,42,0.25)',
  dusk: '#4E7DAA',
  duskBg: 'rgba(78,125,170,0.08)',
  duskBorder: 'rgba(78,125,170,0.2)',
  gold: '#C8A96E',
  goldBg: 'rgba(200,169,110,0.08)',
  goldBorder: 'rgba(200,169,110,0.22)',
};

/* ── Default routine templates ────────────────────────────── */
interface RoutineTemplate {
  routine_type: Exclude<RoutineType, 'custom'>;
  name: string;
  description: string;
  frequency: RoutineFrequency;
  scheduled_time: string;
  scheduled_day: number | null;
  instructions: string;
  color: string;
  colorBg: string;
  colorBorder: string;
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}

const DEFAULT_TEMPLATES: RoutineTemplate[] = [
  {
    routine_type: 'daily_briefing',
    name: 'Daily Briefing',
    description: 'Start every day knowing exactly what matters.',
    frequency: 'daily',
    scheduled_time: '07:00',
    scheduled_day: null,
    Icon: Sun,
    color: c.dawn,
    colorBg: c.dawnMuted,
    colorBorder: c.dawnBorder,
    instructions: `Review my emails, calendar events, commitments, and recent activity. Give me:
1. The 3 most important things to focus on today
2. My schedule — meetings and key blocks
3. Open commitments that are due or overdue
4. Anyone I should follow up with today

Keep it sharp, prioritised, and actionable. No fluff.`,
  },
  {
    routine_type: 'end_of_day',
    name: 'End of Day Review',
    description: 'Close the day with clarity on what was done and what comes next.',
    frequency: 'daily',
    scheduled_time: '18:00',
    scheduled_day: null,
    Icon: Moon,
    color: c.dusk,
    colorBg: c.duskBg,
    colorBorder: c.duskBorder,
    instructions: `Summarise my day based on today's activity, emails, and calendar. Cover:
1. What I accomplished today
2. What slipped or carried over
3. Commitments I made today that need tracking
4. Top 3 priorities for tomorrow

Be honest about what slipped. Suggest one thing I should do first tomorrow.`,
  },
  {
    routine_type: 'weekly_review',
    name: 'Weekly Review',
    description: 'Step back and see the shape of your week.',
    frequency: 'weekly',
    scheduled_time: '09:00',
    scheduled_day: 0,
    Icon: CalendarDays,
    color: c.sage,
    colorBg: c.sageBg,
    colorBorder: c.sageBorder,
    instructions: `Review the past 7 days across all my activity — emails, calendar, commitments, and tasks:
1. Key accomplishments this week
2. What slipped and why (if visible)
3. Relationship highlights — who I engaged with most, anyone to reconnect with
4. Patterns in how I spent my time
5. 3 strategic recommendations for next week

Give me a real, honest picture — not just a summary.`,
  },
  {
    routine_type: 'monthly_review',
    name: 'Monthly Review',
    description: 'A strategic lens on the month that was.',
    frequency: 'monthly',
    scheduled_time: '09:00',
    scheduled_day: 1,
    Icon: BookOpen,
    color: c.gold,
    colorBg: c.goldBg,
    colorBorder: c.goldBorder,
    instructions: `Give me a comprehensive review of the past month:
1. Major accomplishments and milestones
2. Missed commitments and what they signal
3. Relationship health — who I've grown closer to, who I've drifted from
4. Work habit patterns — what's working, what's draining me
5. Strategic recommendations for the month ahead

Be thorough, honest, and forward-looking. Don't soften anything.`,
  },
];

/* ── Helpers ──────────────────────────────────────────────── */
function formatTime(time: string): string {
  const parts = time.split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

function formatScheduleLabel(
  freq: RoutineFrequency,
  time: string,
  day: number | null
): string {
  const t = formatTime(time);
  if (freq === 'daily') return `Daily · ${t}`;
  if (freq === 'weekly') {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const d = day !== null ? (days[day] ?? 'Mon') : 'Mon';
    return `Every ${d} · ${t}`;
  }
  if (freq === 'monthly') {
    const d = day ?? 1;
    const s = d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th';
    return `${d}${s} of month · ${t}`;
  }
  return t;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ── RoutineCard ──────────────────────────────────────────── */
function RoutineCard({
  template,
  saved,
  onClick,
}: {
  template: RoutineTemplate;
  saved: UserRoutine | null;
  onClick: () => void;
}) {
  const { Icon, color, colorBg, colorBorder } = template;
  const isConfigured = saved !== null;
  const isEnabled = saved?.is_enabled ?? false;
  const freq = saved?.frequency ?? template.frequency;
  const time = saved?.scheduled_time ?? template.scheduled_time;
  const day = saved?.scheduled_day ?? template.scheduled_day;
  const name = saved?.name ?? template.name;
  const lastRan = saved?.last_run_at ?? null;

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl text-left transition-all duration-200"
      style={{
        background: c.surface,
        border: `1px solid ${isConfigured ? colorBorder : c.border}`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = c.surfaceElevated;
        (e.currentTarget as HTMLButtonElement).style.borderColor = isConfigured ? color : c.borderHover;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = c.surface;
        (e.currentTarget as HTMLButtonElement).style.borderColor = isConfigured ? colorBorder : c.border;
      }}
    >
      <div className="p-5">
        {/* Icon + status badge */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: isConfigured ? colorBg : c.surface,
              border: `1px solid ${isConfigured ? colorBorder : c.border}`,
            }}
          >
            <Icon size={16} style={{ color: isConfigured ? color : c.textGhost }} />
          </div>
          <span
            className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]"
            style={{
              background: isConfigured
                ? isEnabled ? colorBg : c.surface
                : c.surface,
              color: isConfigured
                ? isEnabled ? color : c.textMuted
                : c.textGhost,
              border: `1px solid ${isConfigured
                ? isEnabled ? colorBorder : c.border
                : c.border}`,
            }}
          >
            {isConfigured ? (isEnabled ? 'Active' : 'Paused') : 'Not set up'}
          </span>
        </div>

        {/* Name */}
        <p
          style={{
            color: isConfigured ? c.text : c.textTertiary,
            fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
            fontSize: '17px',
            fontWeight: 500,
            lineHeight: 1.3,
            marginBottom: '4px',
          }}
        >
          {name}
        </p>
        <p className="text-[12px] leading-[1.6]" style={{ color: c.textMuted }}>
          {template.description}
        </p>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Clock size={11} style={{ color: isConfigured ? color : c.textGhost, flexShrink: 0 }} />
            <span
              className="text-[11px] font-medium truncate"
              style={{ color: isConfigured ? c.textSecondary : c.textGhost }}
            >
              {formatScheduleLabel(freq, time, day)}
            </span>
          </div>
          {lastRan ? (
            <span className="text-[11px] shrink-0" style={{ color: c.textMuted }}>
              {formatRelativeTime(lastRan)}
            </span>
          ) : isConfigured ? (
            <span className="text-[11px] shrink-0" style={{ color: c.textGhost }}>Never run</span>
          ) : (
            <span className="text-[11px] shrink-0" style={{ color: c.textGhost }}>Click to configure</span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ── CustomRoutineCard ────────────────────────────────────── */
function CustomRoutineCard({
  routine,
  onClick,
}: {
  routine: UserRoutine;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl text-left transition-all duration-200"
      style={{ background: c.surface, border: `1px solid ${c.border}` }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = c.surfaceElevated;
        (e.currentTarget as HTMLButtonElement).style.borderColor = c.borderHover;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = c.surface;
        (e.currentTarget as HTMLButtonElement).style.borderColor = c.border;
      }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: c.dawnMuted, border: `1px solid ${c.dawnBorder}` }}
          >
            <Sparkles size={15} style={{ color: c.dawn }} />
          </div>
          <span
            className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]"
            style={{
              background: routine.is_enabled ? c.dawnMuted : c.surface,
              color: routine.is_enabled ? c.dawn : c.textMuted,
              border: `1px solid ${routine.is_enabled ? c.dawnBorder : c.border}`,
            }}
          >
            {routine.is_enabled ? 'Active' : 'Paused'}
          </span>
        </div>
        <p
          style={{
            color: c.text,
            fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
            fontSize: '17px',
            fontWeight: 500,
            lineHeight: 1.3,
            marginBottom: '4px',
          }}
        >
          {routine.name}
        </p>
        {routine.description && (
          <p className="text-[12px] leading-[1.6]" style={{ color: c.textMuted }}>
            {routine.description}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Clock size={11} style={{ color: c.dawn, flexShrink: 0 }} />
            <span className="text-[11px] font-medium truncate" style={{ color: c.textSecondary }}>
              {formatScheduleLabel(routine.frequency, routine.scheduled_time, routine.scheduled_day)}
            </span>
          </div>
          {routine.last_run_at ? (
            <span className="text-[11px] shrink-0" style={{ color: c.textMuted }}>
              {formatRelativeTime(routine.last_run_at)}
            </span>
          ) : (
            <span className="text-[11px] shrink-0" style={{ color: c.textGhost }}>Never run</span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ── Drawer form state ────────────────────────────────────── */
interface DrawerState {
  open: boolean;
  routineId: string | null;
  templateType: Exclude<RoutineType, 'custom'> | null;
  name: string;
  description: string;
  frequency: RoutineFrequency;
  scheduled_time: string;
  scheduled_day: number | null;
  instructions: string;
  is_enabled: boolean;
  color: string;
  colorBg: string;
}

const INITIAL_DRAWER: DrawerState = {
  open: false,
  routineId: null,
  templateType: null,
  name: '',
  description: '',
  frequency: 'daily',
  scheduled_time: '08:00',
  scheduled_day: null,
  instructions: '',
  is_enabled: true,
  color: c.dawn,
  colorBg: c.dawnMuted,
};

const DAYS_OF_WEEK = [
  { value: 0, label: 'Mon' },
  { value: 1, label: 'Tue' },
  { value: 2, label: 'Wed' },
  { value: 3, label: 'Thu' },
  { value: 4, label: 'Fri' },
  { value: 5, label: 'Sat' },
  { value: 6, label: 'Sun' },
];

/* ── RoutineDrawer ────────────────────────────────────────── */
function RoutineDrawer({
  state,
  outputs,
  outputsLoading,
  onClose,
  onChange,
  onSave,
  onDelete,
  saving,
  saveError,
  deleting,
}: {
  state: DrawerState;
  outputs: RoutineOutput[];
  outputsLoading: boolean;
  onClose: () => void;
  onChange: (updates: Partial<DrawerState>) => void;
  onSave: () => Promise<void>;
  onDelete: () => Promise<void>;
  saving: boolean;
  saveError: string | null;
  deleting: boolean;
}) {
  const isNew = state.routineId === null;
  const [expandedOutput, setExpandedOutput] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (state.open) {
      const mountId = setTimeout(() => setMounted(true), 0);
      const id = requestAnimationFrame(() => setShown(true));
      return () => { clearTimeout(mountId); cancelAnimationFrame(id); };
    } else {
      const showId = setTimeout(() => setShown(false), 0);
      const id = setTimeout(() => setMounted(false), 340);
      return () => { clearTimeout(showId); clearTimeout(id); };
    }
  }, [state.open]);

  const template = DEFAULT_TEMPLATES.find(t => t.routine_type === state.templateType);
  const Icon = template?.Icon ?? Sparkles;

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{
          background: 'rgba(45,45,45,0.25)',
          backdropFilter: 'blur(3px)',
          opacity: shown ? 1 : 0,
          transition: 'opacity 280ms ease',
          pointerEvents: shown ? 'auto' : 'none',
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] flex-col"
        style={{
          background: '#FAFAF8',
          borderLeft: `1px solid ${c.border}`,
          transform: shown ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-4 px-6 py-4 shrink-0"
          style={{ borderBottom: `1px solid ${c.border}` }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: state.colorBg }}
            >
              <Icon size={15} style={{ color: state.color }} />
            </div>
            <div className="min-w-0">
              <p
                className="text-[13px] font-semibold truncate"
                style={{ color: c.text }}
              >
                {isNew ? (state.name || 'New Routine') : state.name}
              </p>
              <p className="text-[11px]" style={{ color: c.textMuted }}>
                {isNew ? 'Configure this routine' : 'Edit routine'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 shrink-0 transition-colors"
            style={{ color: c.textMuted }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = c.surface;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label
              className="block text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5"
              style={{ color: c.textMuted }}
            >
              Name
            </label>
            <input
              type="text"
              value={state.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Morning Briefing"
              className="w-full rounded-lg px-3 py-2.5 text-[13px] outline-none transition-all"
              style={{
                background: c.surface,
                border: `1px solid ${c.border}`,
                color: c.text,
              }}
              onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = state.color; }}
              onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = c.border; }}
            />
          </div>

          {/* Description */}
          <div>
            <label
              className="block text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5"
              style={{ color: c.textMuted }}
            >
              Description{' '}
              <span
                style={{
                  color: c.textGhost,
                  fontWeight: 400,
                  textTransform: 'none',
                  letterSpacing: 0,
                }}
              >
                · optional
              </span>
            </label>
            <input
              type="text"
              value={state.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="What is this routine for?"
              className="w-full rounded-lg px-3 py-2.5 text-[13px] outline-none transition-all"
              style={{
                background: c.surface,
                border: `1px solid ${c.border}`,
                color: c.text,
              }}
              onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = state.color; }}
              onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = c.border; }}
            />
          </div>

          {/* Schedule */}
          <div
            className="rounded-xl p-4 space-y-4"
            style={{ background: c.surface, border: `1px solid ${c.border}` }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.06em]"
              style={{ color: c.textMuted }}
            >
              Schedule
            </p>

            {/* Frequency */}
            <div>
              <label
                className="block text-[11px] mb-1.5"
                style={{ color: c.textTertiary }}
              >
                Frequency
              </label>
              <div className="flex gap-2">
                {(['daily', 'weekly', 'monthly'] as RoutineFrequency[]).map(freq => (
                  <button
                    key={freq}
                    onClick={() => {
                      const newDay =
                        freq === 'weekly' ? 0
                        : freq === 'monthly' ? 1
                        : null;
                      onChange({ frequency: freq, scheduled_day: newDay });
                    }}
                    className="flex-1 rounded-lg py-2 text-[12px] font-medium capitalize transition-all"
                    style={{
                      background: state.frequency === freq ? state.colorBg : 'transparent',
                      color: state.frequency === freq ? state.color : c.textMuted,
                      border: `1px solid ${state.frequency === freq ? state.color + '55' : c.border}`,
                    }}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>

            {/* Time */}
            <div>
              <label
                className="block text-[11px] mb-1.5"
                style={{ color: c.textTertiary }}
              >
                Time
              </label>
              <input
                type="time"
                value={state.scheduled_time}
                onChange={(e) => onChange({ scheduled_time: e.target.value })}
                className="w-full rounded-lg px-3 py-2.5 text-[13px] outline-none transition-all"
                style={{
                  background: '#fff',
                  border: `1px solid ${c.border}`,
                  color: c.text,
                }}
                onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = state.color; }}
                onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = c.border; }}
              />
            </div>

            {/* Day of week — weekly */}
            {state.frequency === 'weekly' && (
              <div>
                <label
                  className="block text-[11px] mb-1.5"
                  style={{ color: c.textTertiary }}
                >
                  Day of week
                </label>
                <div className="flex gap-1.5">
                  {DAYS_OF_WEEK.map(d => (
                    <button
                      key={d.value}
                      onClick={() => onChange({ scheduled_day: d.value })}
                      className="flex-1 rounded-lg py-2 text-[11px] font-medium transition-all"
                      style={{
                        background: state.scheduled_day === d.value ? state.colorBg : 'transparent',
                        color: state.scheduled_day === d.value ? state.color : c.textMuted,
                        border: `1px solid ${state.scheduled_day === d.value ? state.color + '55' : c.border}`,
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Day of month — monthly */}
            {state.frequency === 'monthly' && (
              <div>
                <label
                  className="block text-[11px] mb-1.5"
                  style={{ color: c.textTertiary }}
                >
                  Day of month
                </label>
                <select
                  value={state.scheduled_day ?? 1}
                  onChange={(e) => onChange({ scheduled_day: parseInt(e.target.value, 10) })}
                  className="w-full rounded-lg px-3 py-2.5 text-[13px] outline-none"
                  style={{
                    background: '#fff',
                    border: `1px solid ${c.border}`,
                    color: c.text,
                  }}
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(d => {
                    const s = d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th';
                    return (
                      <option key={d} value={d}>
                        {d}{s} of each month
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div>
            <label
              className="block text-[11px] font-semibold uppercase tracking-[0.06em] mb-1"
              style={{ color: c.textMuted }}
            >
              Instructions
            </label>
            <p className="text-[11px] mb-2" style={{ color: c.textGhost }}>
              Tell Donna exactly what to cover. The more specific, the sharper the output.
            </p>
            <textarea
              value={state.instructions}
              onChange={(e) => onChange({ instructions: e.target.value })}
              placeholder="e.g. Review my emails and calendar. Highlight the 3 most important things I need to focus on today..."
              rows={9}
              className="w-full rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] outline-none resize-none transition-all"
              style={{
                background: c.surface,
                border: `1px solid ${c.border}`,
                color: c.text,
              }}
              onFocus={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = state.color; }}
              onBlur={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = c.border; }}
            />
          </div>

          {/* Active toggle */}
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: c.surface, border: `1px solid ${c.border}` }}
          >
            <div>
              <p className="text-[13px] font-medium" style={{ color: c.text }}>
                Active
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: c.textMuted }}>
                {state.is_enabled
                  ? 'Donna will run this routine on schedule.'
                  : 'This routine is paused and will not run.'}
              </p>
            </div>
            <button
              onClick={() => onChange({ is_enabled: !state.is_enabled })}
              className="relative h-6 w-10 rounded-full transition-all duration-200 shrink-0 ml-4"
              style={{ background: state.is_enabled ? state.color : c.borderHover }}
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200"
                style={{ left: state.is_enabled ? '18px' : '2px' }}
              />
            </button>
          </div>

          {/* Past outputs — only if editing existing routine */}
          {!isNew && (
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-3"
                style={{ color: c.textMuted }}
              >
                Recent Outputs
              </p>

              {outputsLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div
                      key={i}
                      className="h-12 animate-pulse rounded-lg"
                      style={{ background: c.surface }}
                    />
                  ))}
                </div>
              ) : outputs.length === 0 ? (
                <div
                  className="rounded-lg px-4 py-4 text-center"
                  style={{
                    background: c.surface,
                    border: `1px dashed ${c.borderHover}`,
                  }}
                >
                  <p className="text-[12px]" style={{ color: c.textGhost }}>
                    No outputs yet. Donna will deliver results here once the routine runs.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {outputs.map(output => (
                    <div
                      key={output.id}
                      className="rounded-lg overflow-hidden"
                      style={{ background: c.surface, border: `1px solid ${c.border}` }}
                    >
                      <button
                        onClick={() =>
                          setExpandedOutput(
                            expandedOutput === output.id ? null : output.id
                          )
                        }
                        className="w-full flex items-center justify-between px-4 py-3 text-left"
                      >
                        <span
                          className="text-[12px] font-medium"
                          style={{ color: c.textSecondary }}
                        >
                          {new Date(output.created_at).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          <span style={{ color: c.textMuted }}>
                            {new Date(output.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </span>
                        <ChevronDown
                          size={13}
                          style={{
                            color: c.textMuted,
                            transform:
                              expandedOutput === output.id
                                ? 'rotate(180deg)'
                                : 'rotate(0deg)',
                            transition: 'transform 200ms',
                          }}
                        />
                      </button>
                      {expandedOutput === output.id && (
                        <div
                          className="px-4 pb-4"
                          style={{ borderTop: `1px solid ${c.border}` }}
                        >
                          <p
                            className="pt-3 text-[12px] leading-[1.85] whitespace-pre-wrap"
                            style={{ color: c.textSecondary }}
                          >
                            {output.content}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bottom padding so footer doesn't cover content */}
          <div className="h-4" />
        </div>

        {/* Footer */}
        <div
          className="shrink-0"
          style={{ background: '#FAFAF8', borderTop: `1px solid ${c.border}` }}
        >
          {/* Error message */}
          {saveError && (
            <div
              className="px-6 py-2.5 text-[11px]"
              style={{ color: c.alert, borderBottom: `1px solid ${c.alertBorder}`, background: 'rgba(214,75,42,0.04)' }}
            >
              {saveError}
            </div>
          )}
          <div className="flex items-center gap-2.5 px-6 py-4">
            {!isNew && (
              <button
                onClick={onDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-[12px] font-medium transition-all"
                style={{
                  background: 'transparent',
                  color: c.alert,
                  border: `1px solid ${c.alertBorder}`,
                  opacity: deleting ? 0.5 : 1,
                }}
              >
                <Trash2 size={12} />
                {deleting ? 'Removing…' : 'Remove'}
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-[12px] font-medium transition-all"
              style={{
                background: 'transparent',
                color: c.textMuted,
                border: `1px solid ${c.border}`,
              }}
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving || !state.name.trim()}
              className="rounded-lg px-5 py-2.5 text-[12px] font-semibold transition-all"
              style={{
                background: state.name.trim() ? state.color : c.border,
                color: state.name.trim() ? '#fff' : c.textMuted,
                opacity: saving ? 0.7 : 1,
                cursor: !state.name.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : isNew ? 'Create Routine' : 'Save Routine'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Main page ────────────────────────────────────────────── */
export default function RoutinesPage() {
  const [routines, setRoutines] = useState<UserRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState<DrawerState>(INITIAL_DRAWER);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [outputs, setOutputs] = useState<RoutineOutput[]>([]);
  const [outputsLoading, setOutputsLoading] = useState(false);

  const fetchRoutines = useCallback(async () => {
    try {
      const res = await fetch('/api/routines');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = (await res.json()) as { routines?: UserRoutine[] };
      setRoutines(data.routines ?? []);
    } catch {
      // show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutines();
  }, [fetchRoutines]);

  async function fetchOutputs(routineId: string) {
    setOutputsLoading(true);
    try {
      const res = await fetch(`/api/routines/${routineId}/outputs?limit=5`);
      const data = (await res.json()) as { outputs?: RoutineOutput[] };
      setOutputs(data.outputs ?? []);
    } catch {
      setOutputs([]);
    } finally {
      setOutputsLoading(false);
    }
  }

  // Map: routine_type → saved record (for the 4 defaults)
  const savedByType = new Map<RoutineType, UserRoutine>();
  routines.forEach(r => {
    if (r.routine_type !== 'custom' && !savedByType.has(r.routine_type)) {
      savedByType.set(r.routine_type, r);
    }
  });
  const customRoutines = routines.filter(r => r.routine_type === 'custom');

  // Configured template routines (for "My Routines" section)
  const configuredTemplates = DEFAULT_TEMPLATES.filter(t => savedByType.has(t.routine_type));
  // Unconfigured templates (still shown in "Default Routines")
  const unconfiguredTemplates = DEFAULT_TEMPLATES.filter(t => !savedByType.has(t.routine_type));
  // All "My Routines" = configured templates + custom (in creation order for templates)
  const myRoutines: Array<{ template: RoutineTemplate | null; saved: UserRoutine }> = [
    ...configuredTemplates.map(t => ({ template: t, saved: savedByType.get(t.routine_type)! })),
    ...customRoutines.map(r => ({ template: null, saved: r })),
  ];

  function openForTemplate(template: RoutineTemplate) {
    const saved = savedByType.get(template.routine_type) ?? null;
    setOutputs([]);
    setDrawer({
      open: true,
      routineId: saved?.id ?? null,
      templateType: template.routine_type,
      name: saved?.name ?? template.name,
      description: saved?.description ?? template.description,
      frequency: saved?.frequency ?? template.frequency,
      scheduled_time: saved?.scheduled_time ?? template.scheduled_time,
      scheduled_day: saved?.scheduled_day ?? template.scheduled_day,
      instructions: saved?.instructions ?? template.instructions,
      is_enabled: saved?.is_enabled ?? true,
      color: template.color,
      colorBg: template.colorBg,
    });
    if (saved?.id) fetchOutputs(saved.id);
  }

  function openForCustom(routine: UserRoutine) {
    setOutputs([]);
    setDrawer({
      open: true,
      routineId: routine.id,
      templateType: null,
      name: routine.name,
      description: routine.description ?? '',
      frequency: routine.frequency,
      scheduled_time: routine.scheduled_time,
      scheduled_day: routine.scheduled_day,
      instructions: routine.instructions,
      is_enabled: routine.is_enabled,
      color: c.dawn,
      colorBg: c.dawnMuted,
    });
    fetchOutputs(routine.id);
  }

  function openNewCustom() {
    setOutputs([]);
    setDrawer({ ...INITIAL_DRAWER, open: true });
  }

  function closeDrawer() {
    setDrawer(INITIAL_DRAWER);
    setSaveError(null);
  }

  async function handleSave() {
    if (!drawer.name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const body = {
        name: drawer.name.trim(),
        description: drawer.description.trim() || null,
        routine_type: drawer.templateType ?? 'custom',
        frequency: drawer.frequency,
        scheduled_time: drawer.scheduled_time,
        scheduled_day: drawer.scheduled_day,
        instructions: drawer.instructions,
        is_enabled: drawer.is_enabled,
      };

      let res: Response;
      if (drawer.routineId) {
        res = await fetch(`/api/routines/${drawer.routineId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/routines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string };
        setSaveError(errData.error ?? 'Something went wrong. Please try again.');
        return;
      }

      await fetchRoutines();
      closeDrawer();
    } catch {
      setSaveError('Connection error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!drawer.routineId) return;
    setDeleting(true);
    try {
      await fetch(`/api/routines/${drawer.routineId}`, { method: 'DELETE' });
      await fetchRoutines();
      closeDrawer();
    } catch {
      // silent fail
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1
              className="tracking-[-0.02em] leading-tight"
              style={{
                color: c.text,
                fontFamily:
                  "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
                fontWeight: 300,
                fontSize: '28px',
              }}
            >
              Routines
            </h1>
            <p className="mt-1 text-[13px]" style={{ color: c.textMuted }}>
              Scheduled intelligence — Donna runs these automatically and delivers the
              output to you.
            </p>
          </div>
          <button
            onClick={openNewCustom}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-semibold transition-all shrink-0"
            style={{ background: c.dawn, color: '#fff' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '0.85';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '1';
            }}
          >
            <Plus size={13} />
            New Routine
          </button>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-xl"
                style={{ background: c.surface, border: `1px solid ${c.border}` }}
              />
            ))}
          </div>
        )}

        {/* Content */}
        {!loading && (
          <>
            {/* My Routines — configured templates + custom */}
            {myRoutines.length > 0 && (
              <section>
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3"
                  style={{ color: c.textGhost }}
                >
                  My Routines
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {myRoutines.map(({ template, saved }) =>
                    template ? (
                      <RoutineCard
                        key={saved.id}
                        template={template}
                        saved={saved}
                        onClick={() => openForTemplate(template)}
                      />
                    ) : (
                      <CustomRoutineCard
                        key={saved.id}
                        routine={saved}
                        onClick={() => openForCustom(saved)}
                      />
                    )
                  )}
                </div>
              </section>
            )}

            {/* Default Routines — only unconfigured templates */}
            {unconfiguredTemplates.length > 0 && (
              <section>
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3"
                  style={{ color: c.textGhost }}
                >
                  Default Routines
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {unconfiguredTemplates.map(template => (
                    <RoutineCard
                      key={template.routine_type}
                      template={template}
                      saved={null}
                      onClick={() => openForTemplate(template)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Drawer */}
      <RoutineDrawer
        state={drawer}
        outputs={outputs}
        outputsLoading={outputsLoading}
        onClose={closeDrawer}
        onChange={(updates) => setDrawer(prev => ({ ...prev, ...updates }))}
        onSave={handleSave}
        onDelete={handleDelete}
        saving={saving}
        saveError={saveError}
        deleting={deleting}
      />
    </>
  );
}
