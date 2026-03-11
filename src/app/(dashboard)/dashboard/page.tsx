'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CitationDrawer } from '@/components/briefing/CitationDrawer';
import { MeetingPrepCard } from '@/components/people/MeetingPrepCard';
import { decodeEntities } from '@/lib/utils/decode-entities';
import type { Briefing, BriefingItem, MeetingPrepData, SourceRef } from '@/lib/db/types';
import {
  Loader2,
  Zap,
  RefreshCw,
  Clock,
  Users,
  LayoutDashboard,
  CheckCircle2,
  ArrowRight,
  ListChecks,
  History,
  ArrowRightFromLine,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';

interface BriefingResponse {
  briefing: (Briefing & { items: BriefingItem[] }) | null;
}

interface RoutineOutputWithMeta {
  id: string;
  routine_id: string;
  content: string;
  generation_model: string | null;
  generation_ms: number | null;
  created_at: string;
  user_routines: {
    id: string;
    name: string;
    routine_type: string;
    frequency: string;
    scheduled_time: string;
    is_enabled: boolean;
  };
}

/* Donna brand tokens — The Editor */
const c = {
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  border: 'rgba(45,45,45,0.08)',
  borderHover: 'rgba(45,45,45,0.16)',
  dawn: '#E8845C',
  dawnMuted: 'rgba(232,132,92,0.1)',
  text: '#2D2D2D',
  textSecondary: 'rgba(45,45,45,0.8)',
  textTertiary: 'rgba(141,153,174,0.85)',
  textMuted: 'rgba(141,153,174,0.6)',
  textGhost: 'rgba(141,153,174,0.35)',
  sage: '#52B788',
  alert: '#D64B2A',
  dusk: '#457B9D',
  gold: '#C9862A',
};

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 style="font-size:13px;font-weight:600;margin:12px 0 4px">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:14px;font-weight:600;margin:14px 0 6px">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:15px;font-weight:600;margin:16px 0 8px">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li style="margin:2px 0;padding-left:4px">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul style="list-style:disc;padding-left:16px;margin:6px 0">$&</ul>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

export default function BriefingPage() {
  const [briefing, setBriefing] = useState<BriefingResponse['briefing']>(null);
  const [meetingPreps, setMeetingPreps] = useState<MeetingPrepData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerItem, setDrawerItem] = useState<BriefingItem | null>(null);
  const [integrations, setIntegrations] = useState<Array<{ provider: string; status: string }>>([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [checkedActions, setCheckedActions] = useState<Set<string>>(new Set());
  const [prepLoading, setPrepLoading] = useState<Record<string, boolean>>({});
  const [generatedPreps, setGeneratedPreps] = useState<Record<string, MeetingPrepData>>({});
  const [routineOutputs, setRoutineOutputs] = useState<RoutineOutputWithMeta[]>([]);
  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null);

  const fetchBriefing = useCallback(async () => {
    try {
      const res = await fetch('/api/briefing/today');
      if (!res.ok) throw new Error('Failed to fetch briefing');
      const data: BriefingResponse = await res.json();
      setBriefing(data.briefing);
      setMeetingPreps(data.briefing?.meeting_preps ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBriefing();
    fetch('/api/integrations')
      .then((r) => r.json())
      .then((data) => setIntegrations(data.integrations ?? []))
      .catch(() => {});
    fetch('/api/routines/today')
      .then((r) => r.json())
      .then((data: { outputs?: RoutineOutputWithMeta[] }) => setRoutineOutputs(data.outputs ?? []))
      .catch(() => {});
  }, [fetchBriefing]);

  async function handleGenerateBriefing() {
    setGenerating(true);
    setGenerateError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300_000);
      const res = await fetch('/api/briefing/generate', { method: 'POST', signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Generation failed');
      }
      toast.success('Briefing generated!');
      await fetchBriefing();
    } catch (err) {
      const message = err instanceof Error
        ? err.name === 'AbortError' ? 'Generation timed out. Please try again.' : err.message
        : 'Failed to generate briefing';
      setGenerateError(message);
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }

  function handleCitationClick(item: BriefingItem) {
    setDrawerItem(item);
  }

  function handlePrepCitationClick(sourceRef: SourceRef, title: string) {
    setDrawerItem({ source_ref: sourceRef, title } as BriefingItem);
  }

  async function handleGenerateMeetingPrep(item: BriefingItem) {
    const eventId = item.source_ref?.message_id;
    if (!eventId || prepLoading[eventId]) return;

    setPrepLoading(prev => ({ ...prev, [eventId]: true }));
    try {
      const res = await fetch(`/api/meetings/${eventId}/prep`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_title: item.title,
          start: item.source_ref?.sent_at ?? new Date().toISOString(),
          end: item.source_ref?.sent_at ?? new Date().toISOString(),
          attendees: item.source_ref?.from_name
            ? [{ name: item.source_ref.from_name, email: '' }]
            : [],
          organizer: { email: '', name: '' },
        }),
      });
      if (!res.ok) throw new Error('Failed to generate prep');
      const data = await res.json();
      setGeneratedPreps(prev => ({ ...prev, [eventId]: data.prep }));
      toast.success('Meeting prep ready');
    } catch {
      toast.error('Could not generate prep brief');
    } finally {
      setPrepLoading(prev => ({ ...prev, [eventId]: false }));
    }
  }

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function toggleAction(id: string) {
    setCheckedActions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1
            className="text-[28px] tracking-[-0.02em]"
            style={{
              color: c.text,
              fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
              fontWeight: 300,
            }}
          >
            {getGreeting()}
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: c.textMuted }}>
            Preparing your briefing...
          </p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl"
              style={{ background: c.dawnMuted, border: `1px solid ${c.border}` }}
            />
          ))}
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div className="space-y-6">
        <h1
          className="text-[28px] tracking-[-0.02em]"
          style={{
            color: c.text,
            fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
            fontWeight: 300,
          }}
        >
          Daily Briefing
        </h1>
        <div
          className="rounded-xl p-6 text-center"
          style={{
            background: 'rgba(214,75,42,0.08)',
            border: '1px solid rgba(214,75,42,0.2)',
          }}
        >
          <p className="text-[13px]" style={{ color: c.alert }}>{error}</p>
        </div>
      </div>
    );
  }

  /* ── First-time empty state (no briefing generated yet) ── */
  if (!briefing) {
    return (
      <div className="space-y-6">
        <h1
          className="text-[28px] tracking-[-0.02em]"
          style={{
            color: c.text,
            fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
            fontWeight: 300,
          }}
        >
          {getGreeting()}
        </h1>

        <div
          className="rounded-xl p-10 text-center"
          style={{ background: c.surface, border: `1px dashed ${c.borderHover}` }}
        >
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: c.dawnMuted }}
          >
            <LayoutDashboard size={22} style={{ color: c.dawn }} />
          </div>
          <p className="text-[14px] font-semibold" style={{ color: c.text }}>
            Ready to generate your briefing
          </p>
          <p
            className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed"
            style={{ color: c.textTertiary }}
          >
            Donna will pull from your desktop activity, connected integrations, commitments, and calendar to build your daily briefing.
          </p>

          <button
            onClick={handleGenerateBriefing}
            disabled={generating}
            className="mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-semibold transition-all duration-200"
            style={{
              background: c.dawn,
              color: '#FAF9F6',
              opacity: generating ? 0.7 : 1,
              cursor: generating ? 'not-allowed' : 'pointer',
            }}
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            {generating ? 'Generating...' : 'Generate briefing'}
          </button>

          {generateError && (
            <div
              className="mx-auto mt-4 max-w-md rounded-lg px-4 py-3 text-[12px]"
              style={{ background: 'rgba(214,75,42,0.08)', border: '1px solid rgba(214,75,42,0.2)', color: c.alert }}
            >
              {generateError}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     BRIEFING CONTENT — 3 clean sections
     ═══════════════════════════════════════════════════════════ */

  // Group items by the new sections
  const priorities: BriefingItem[] = [];
  const yesterdayCompleted: BriefingItem[] = [];
  const yesterdayCarriedOver: BriefingItem[] = [];
  const todaysSchedule: BriefingItem[] = [];

  for (const item of briefing.items) {
    switch (item.section) {
      case 'priorities':
        priorities.push(item);
        break;
      case 'yesterday_completed':
        yesterdayCompleted.push(item);
        break;
      case 'yesterday_carried_over':
        yesterdayCarriedOver.push(item);
        break;
      case 'todays_schedule':
        todaysSchedule.push(item);
        break;
      default:
        // Legacy sections → treat as priorities
        priorities.push(item);
        break;
    }
  }

  // Sort by rank within each section
  priorities.sort((a, b) => a.rank - b.rank);
  yesterdayCompleted.sort((a, b) => a.rank - b.rank);
  yesterdayCarriedOver.sort((a, b) => a.rank - b.rank);
  todaysSchedule.sort((a, b) => a.rank - b.rank);

  const dateStr = new Date(briefing.briefing_date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Context line
  const contextParts: string[] = [];
  if (priorities.length > 0) contextParts.push(`${priorities.length} priorit${priorities.length === 1 ? 'y' : 'ies'}`);
  if (todaysSchedule.length > 0) contextParts.push(`${todaysSchedule.length} meeting${todaysSchedule.length > 1 ? 's' : ''}`);
  if (yesterdayCarriedOver.length > 0) contextParts.push(`${yesterdayCarriedOver.length} carried over`);
  const contextLine = contextParts.length === 0 ? 'All clear today.' : contextParts.join(' · ');

  const hasYesterday = yesterdayCompleted.length > 0 || yesterdayCarriedOver.length > 0;

  // Check which integrations are connected to show relevant CTAs
  const connectedProviders = new Set(integrations.filter(i => i.status === 'connected').map(i => i.provider));
  const hasEmail = connectedProviders.has('gmail') || connectedProviders.has('outlook');
  const hasCalendar = connectedProviders.has('google_calendar') || connectedProviders.has('microsoft_calendar');

  return (
    <div className="space-y-8">

      {/* ═══════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════ */}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-[28px] tracking-[-0.02em] leading-tight"
            style={{
              color: c.text,
              fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
              fontWeight: 300,
            }}
          >
            {getGreeting()}
          </h1>
          <div className="mt-1.5 flex items-center gap-3">
            <p
              className="text-[12px] font-medium tracking-wide"
              style={{ color: c.textMuted, fontFamily: "'JetBrains Mono', monospace" }}
            >
              {dateStr}
            </p>
            <span style={{ color: c.textGhost }}>·</span>
            <p className="text-[13px] font-medium" style={{ color: c.textTertiary }}>
              {contextLine}
            </p>
          </div>
        </div>
        <button
          onClick={handleGenerateBriefing}
          disabled={generating}
          className="mt-1 shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-all duration-150"
          style={{
            background: generating ? c.dawnMuted : c.surface,
            color: generating ? c.textMuted : c.textTertiary,
            border: `1px solid ${c.border}`,
            cursor: generating ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => { if (!generating) e.currentTarget.style.borderColor = c.borderHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; }}
        >
          {generating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {generating ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {generateError && (
        <div
          className="rounded-lg px-4 py-3 text-[12px]"
          style={{ background: 'rgba(214,75,42,0.08)', border: '1px solid rgba(214,75,42,0.2)', color: c.alert }}
        >
          {generateError}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          SECTION 1: PRIORITIES
          ═══════════════════════════════════════════════════════ */}

      <section>
        <div className="flex items-center gap-2 mb-4">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ background: c.dawnMuted }}
          >
            <ListChecks size={14} style={{ color: c.dawn }} />
          </div>
          <h2 className="text-[15px] font-semibold" style={{ color: c.text }}>
            Today&apos;s Priorities
          </h2>
          {priorities.length > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
              style={{ background: c.dawnMuted, color: c.dawn }}
            >
              {priorities.length}
            </span>
          )}
        </div>

        {priorities.length === 0 ? (
          <div
            className="rounded-xl p-6 text-center"
            style={{ background: c.surface, border: `1px dashed ${c.border}` }}
          >
            <p className="text-[13px] font-medium" style={{ color: c.textTertiary }}>
              No priorities found for today.
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {!hasEmail && (
                <Link
                  href="/settings/integrations"
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors"
                  style={{ background: c.dawnMuted, color: c.dawn, border: '1px solid rgba(232,132,92,0.25)' }}
                >
                  <Zap size={11} /> Connect Gmail or Outlook
                </Link>
              )}
              <p className="text-[12px]" style={{ color: c.textMuted }}>
                Donna uses your email, desktop activity, and commitments to surface priorities.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {priorities.map((item, i) => {
              const checked = checkedActions.has(item.id);
              return (
                <div
                  key={item.id}
                  className="group rounded-xl px-4 py-3.5 transition-all duration-150"
                  style={{
                    background: checked ? 'rgba(82,183,136,0.04)' : c.surface,
                    border: `1px solid ${c.border}`,
                  }}
                  onMouseEnter={(e) => {
                    if (!checked) e.currentTarget.style.borderColor = c.borderHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = c.border;
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleAction(item.id)}
                      className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded transition-all duration-150 cursor-pointer"
                      style={{
                        background: checked ? 'rgba(82,183,136,0.15)' : 'transparent',
                        border: `1.5px solid ${checked ? c.sage : 'rgba(155,175,196,0.25)'}`,
                      }}
                    >
                      {checked && <CheckCircle2 size={11} style={{ color: c.sage }} />}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-[12px] font-bold tabular-nums shrink-0"
                          style={{ color: checked ? c.textMuted : c.dawn }}
                        >
                          {i + 1}.
                        </span>
                        <h3
                          className="text-[13px] font-semibold leading-snug"
                          style={{
                            color: checked ? c.textMuted : c.text,
                            textDecoration: checked ? 'line-through' : 'none',
                          }}
                        >
                          {decodeEntities(item.title)}
                        </h3>
                      </div>

                      {/* Why it matters */}
                      <p
                        className="mt-1 text-[12px] leading-relaxed"
                        style={{ color: checked ? c.textGhost : c.textTertiary }}
                      >
                        {decodeEntities(item.summary)}
                      </p>

                      {/* Action + Citation row */}
                      <div className="mt-2 flex items-center gap-3">
                        {item.action_suggestion && (
                          <span
                            className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                            style={{
                              background: c.dawnMuted,
                              color: c.dawn,
                              border: '1px solid rgba(232,132,92,0.25)',
                            }}
                          >
                            {decodeEntities(item.action_suggestion)}
                          </span>
                        )}
                        {item.sentiment === 'urgent' && (
                          <span
                            className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                            style={{
                              background: 'rgba(214,75,42,0.08)',
                              color: c.alert,
                              border: '1px solid rgba(214,75,42,0.2)',
                            }}
                          >
                            Urgent
                          </span>
                        )}
                        {item.sentiment === 'negative' && (
                          <span
                            className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                            style={{
                              background: 'rgba(214,75,42,0.08)',
                              color: c.alert,
                              border: '1px solid rgba(214,75,42,0.2)',
                            }}
                          >
                            Needs attention
                          </span>
                        )}
                        <button
                          onClick={() => handleCitationClick(item)}
                          className="ml-auto text-[11px] font-medium transition-colors duration-200 opacity-0 group-hover:opacity-100"
                          style={{ color: c.textMuted }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = c.dawn; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = c.textMuted; }}
                        >
                          View source
                        </button>
                      </div>
                    </div>

                    {/* Quick complete */}
                    <button
                      onClick={() => toggleAction(item.id)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        color: checked ? c.sage : c.textMuted,
                        background: checked ? 'rgba(82,183,136,0.08)' : 'rgba(45,45,45,0.05)',
                      }}
                    >
                      {checked ? 'Done' : 'Complete'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2: YESTERDAY'S SUMMARY
          ═══════════════════════════════════════════════════════ */}

      {hasYesterday && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ background: 'rgba(78,125,170,0.12)' }}
            >
              <History size={14} style={{ color: c.dusk }} />
            </div>
            <h2 className="text-[15px] font-semibold" style={{ color: c.text }}>
              Yesterday
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Completed */}
            {yesterdayCompleted.length > 0 && (
              <div
                className="rounded-xl p-4"
                style={{ background: c.surface, border: `1px solid ${c.border}` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={13} style={{ color: c.sage }} />
                  <p
                    className="text-[11px] font-semibold tracking-[0.06em] uppercase"
                    style={{ color: c.sage, fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Completed
                  </p>
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
                    style={{ background: 'rgba(82,183,136,0.1)', color: c.sage }}
                  >
                    {yesterdayCompleted.length}
                  </span>
                </div>
                <ul className="space-y-2">
                  {yesterdayCompleted.map(item => (
                    <li
                      key={item.id}
                      className="flex items-start gap-2 group cursor-pointer"
                      onClick={() => handleCitationClick(item)}
                    >
                      <span
                        className="mt-[7px] block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: c.sage }}
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] leading-snug" style={{ color: c.textSecondary }}>
                          {decodeEntities(item.title)}
                        </p>
                        <p className="mt-0.5 text-[11px]" style={{ color: c.textMuted }}>
                          {decodeEntities(item.summary)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Carried Over */}
            {yesterdayCarriedOver.length > 0 && (
              <div
                className="rounded-xl p-4"
                style={{ background: c.surface, border: `1px solid ${c.border}` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRightFromLine size={13} style={{ color: c.gold }} />
                  <p
                    className="text-[11px] font-semibold tracking-[0.06em] uppercase"
                    style={{ color: c.gold, fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Carried Over
                  </p>
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
                    style={{ background: 'rgba(244,200,150,0.1)', color: c.gold }}
                  >
                    {yesterdayCarriedOver.length}
                  </span>
                </div>
                <ul className="space-y-2">
                  {yesterdayCarriedOver.map(item => (
                    <li
                      key={item.id}
                      className="flex items-start gap-2 group cursor-pointer"
                      onClick={() => handleCitationClick(item)}
                    >
                      <span
                        className="mt-[7px] block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: c.gold }}
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] leading-snug" style={{ color: c.textSecondary }}>
                          {decodeEntities(item.title)}
                        </p>
                        <p className="mt-0.5 text-[11px]" style={{ color: c.textMuted }}>
                          {decodeEntities(item.summary)}
                          {item.sentiment === 'urgent' && (
                            <span
                              className="ml-1.5 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
                              style={{ background: 'rgba(214,75,42,0.08)', color: c.alert }}
                            >
                              Overdue
                            </span>
                          )}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          SECTION 3: TODAY'S SCHEDULE
          ═══════════════════════════════════════════════════════ */}

      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ background: 'rgba(78,125,170,0.12)' }}
            >
              <Clock size={14} style={{ color: c.dusk }} />
            </div>
            <h2 className="text-[15px] font-semibold" style={{ color: c.text }}>
              Today&apos;s Schedule
            </h2>
            {todaysSchedule.length > 0 && (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
                style={{ background: 'rgba(78,125,170,0.1)', color: c.dusk }}
              >
                {todaysSchedule.length}
              </span>
            )}
          </div>
          <Link
            href="/calendar"
            className="flex items-center gap-1 text-[12px] font-medium transition-colors duration-150"
            style={{ color: c.textMuted }}
            onMouseEnter={(e) => { e.currentTarget.style.color = c.dawn; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = c.textMuted; }}
          >
            Full calendar <ArrowRight size={11} />
          </Link>
        </div>

        {todaysSchedule.length === 0 ? (
          <div
            className="rounded-xl p-6 text-center"
            style={{ background: c.surface, border: `1px dashed ${c.border}` }}
          >
            <p className="text-[13px] font-medium" style={{ color: c.textTertiary }}>
              No events on your calendar today.
            </p>
            {!hasCalendar && (
              <Link
                href="/settings/integrations"
                className="mt-3 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors"
                style={{ background: 'rgba(78,125,170,0.1)', color: c.dusk, border: '1px solid rgba(78,125,170,0.2)' }}
              >
                <Zap size={11} /> Connect Google Calendar or Outlook
              </Link>
            )}
          </div>
        ) : (
          <>
          {/* Vertical timeline */}
          <div className="relative">
            <div
              className="absolute left-[7px] top-0 bottom-0 w-px"
              style={{ background: `linear-gradient(to bottom, ${c.dusk}, transparent)` }}
            />
            <div className="space-y-1">
              {todaysSchedule.map(item => {
                const time = item.source_ref?.sent_at
                  ? new Date(item.source_ref.sent_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                  : null;

                // Find prep — either pre-generated (legacy) or on-demand generated
                const eventId = item.source_ref?.message_id;
                const prep = eventId
                  ? (generatedPreps[eventId] ?? meetingPreps.find(p => p.event_id === eventId))
                  : undefined;

                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 pl-0 py-1.5 group"
                  >
                    {/* Timeline dot */}
                    <div
                      className="mt-[5px] h-[14px] w-[14px] shrink-0 rounded-full border-2 transition-all duration-150"
                      style={{
                        borderColor: c.dusk,
                        background: 'rgba(78,125,170,0.15)',
                      }}
                    />
                    {/* Content */}
                    <div
                      className="flex-1 rounded-lg px-3.5 py-2.5 transition-all duration-150"
                      style={{
                        background: c.surface,
                        border: `1px solid ${c.border}`,
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
                      <div className="flex items-center gap-2">
                        {time && (
                          <span
                            className="text-[11px] font-medium tabular-nums"
                            style={{ color: c.dusk, fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            {time}
                          </span>
                        )}
                        <span className="text-[13px] font-medium" style={{ color: c.text }}>
                          {decodeEntities(item.title)}
                        </span>
                      </div>

                      {/* Participants */}
                      {item.source_ref?.from_name && (
                        <p className="mt-0.5 flex items-center gap-1 text-[12px]" style={{ color: c.textMuted }}>
                          <Users size={10} />
                          {decodeEntities(item.source_ref.from_name)}
                        </p>
                      )}

                      {/* Prep note from summary */}
                      {item.summary && !item.summary.includes(item.title) && (
                        <p className="mt-1 text-[11px] leading-relaxed" style={{ color: c.textTertiary }}>
                          {decodeEntities(item.summary)}
                        </p>
                      )}

                      {/* Meeting prep — on-demand or pre-generated */}
                      {prep ? (
                        <div
                          className="mt-2 rounded-md px-3 py-2 text-[11px] leading-relaxed"
                          style={{ background: 'rgba(78,125,170,0.06)', color: c.textTertiary }}
                        >
                          <MeetingPrepCard
                            prep={prep}
                            onCitationClick={handlePrepCitationClick}
                          />
                        </div>
                      ) : eventId && (
                        <button
                          onClick={() => handleGenerateMeetingPrep(item)}
                          disabled={!!prepLoading[eventId]}
                          className="mt-1.5 flex items-center gap-1 text-[11px] font-medium opacity-60 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
                          style={{ color: c.dusk }}
                        >
                          {prepLoading[eventId] ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            <Zap size={10} />
                          )}
                          {prepLoading[eventId] ? 'Generating...' : 'Prep for this meeting'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Standalone meeting preps for events without matching schedule items */}
          {meetingPreps.filter(p => !todaysSchedule.some(s => s.source_ref?.message_id === p.event_id)).length > 0 && (
            <div className="mt-3 space-y-2">
              {meetingPreps
                .filter(p => !todaysSchedule.some(s => s.source_ref?.message_id === p.event_id))
                .map(prep => (
                  <MeetingPrepCard
                    key={prep.event_id}
                    prep={prep}
                    onCitationClick={handlePrepCitationClick}
                  />
                ))
              }
            </div>
          )}
          </>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════
          ROUTINES — outputs from user-scheduled routines
          ═══════════════════════════════════════════════════════ */}
      {routineOutputs.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Zap size={16} style={{ color: c.gold }} />
            <h2 className="text-[13px] font-medium tracking-[0.06em] uppercase" style={{ color: c.textTertiary }}>
              Routines
            </h2>
          </div>
          <div className="space-y-3">
            {routineOutputs.map(output => {
              const isExpanded = expandedRoutine === output.id;
              const timeStr = new Date(output.created_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });
              return (
                <div
                  key={output.id}
                  className="rounded-xl overflow-hidden"
                  style={{ border: `1px solid ${c.border}`, background: c.surface }}
                >
                  <button
                    className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
                    style={{ background: 'transparent' }}
                    onClick={() => setExpandedRoutine(isExpanded ? null : output.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: c.dawnMuted }}
                      >
                        <Zap size={13} style={{ color: c.dawn }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium truncate" style={{ color: c.text }}>
                          {output.user_routines.name}
                        </p>
                        <p className="text-[12px] mt-0.5" style={{ color: c.textMuted }}>
                          Generated at {timeStr}
                          {output.generation_ms && ` · ${(output.generation_ms / 1000).toFixed(1)}s`}
                        </p>
                      </div>
                    </div>
                    <div style={{ color: c.textMuted, flexShrink: 0 }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div
                      className="px-5 pb-5"
                      style={{ borderTop: `1px solid ${c.border}` }}
                    >
                      <div
                        className="pt-4 prose prose-sm max-w-none text-[13px] leading-relaxed"
                        style={{ color: c.textSecondary }}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(output.content) }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <CitationDrawer
        open={drawerItem !== null}
        onClose={() => setDrawerItem(null)}
        sourceRef={drawerItem?.source_ref ?? null}
        title={drawerItem?.title ?? ''}
      />
    </div>
  );
}
