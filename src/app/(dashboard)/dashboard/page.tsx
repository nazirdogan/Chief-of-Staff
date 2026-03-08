'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BriefingItem as BriefingItemComponent } from '@/components/briefing/BriefingItem';
import { CitationDrawer } from '@/components/briefing/CitationDrawer';
import { MeetingPrepCard } from '@/components/people/MeetingPrepCard';
import { YesterdayRecap } from '@/components/briefing/YesterdayRecap';
import { AMSweepPanel } from '@/components/operations/AMSweepPanel';
import { TimeBlockPanel } from '@/components/operations/TimeBlockPanel';
import { decodeEntities } from '@/lib/utils/decode-entities';
import type { Briefing, BriefingItem, BriefingItemSection, MeetingPrepData, SourceRef } from '@/lib/db/types';
import {
  Loader2,
  Zap,
  RefreshCw,
  ShieldAlert,
  Reply,
  Eye,
  Info,
  ChevronDown,
  MailCheck,
  Clock,
  Users,
  LayoutDashboard,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface BriefingResponse {
  briefing: (Briefing & { items: BriefingItem[] }) | null;
}

type IntentSection = 'reply_now' | 'follow_up' | 'review' | 'fyi';

const SECTION_TO_INTENT: Record<BriefingItemSection, IntentSection> = {
  action_required: 'reply_now',
  vip_inbox: 'reply_now',
  quick_wins: 'reply_now',
  awaiting_reply: 'follow_up',
  commitment_queue: 'review',
  decision_queue: 'review',
  at_risk: 'review',
  todays_schedule: 'review',
  priority_inbox: 'fyi',
  after_hours: 'fyi',
  people_context: 'fyi',
};

const INTENT_META: Record<IntentSection, { label: string; icon: typeof Reply; accent: string; accentBg: string }> = {
  reply_now: {
    label: 'Reply Now',
    icon: MailCheck,
    accent: '#D64B2A',
    accentBg: 'rgba(214,75,42,0.08)',
  },
  follow_up: {
    label: 'Follow Up',
    icon: Reply,
    accent: '#F4C896',
    accentBg: 'rgba(244,200,150,0.08)',
  },
  review: {
    label: 'Review',
    icon: Eye,
    accent: '#4E7DAA',
    accentBg: 'rgba(78,125,170,0.08)',
  },
  fyi: {
    label: 'FYI',
    icon: Info,
    accent: 'rgba(155,175,196,0.7)',
    accentBg: 'rgba(155,175,196,0.06)',
  },
};

const INTENT_ORDER: IntentSection[] = ['reply_now', 'follow_up', 'review', 'fyi'];

const SECURITY_KEYWORDS_RE = /\b(security|unauthori[sz]ed|login|breach|suspicious|compromised|password|2fa|mfa|phishing|malware|attack)\b/i;

/* Donna brand tokens */
const c = {
  surface: 'rgba(255,255,255,0.05)',
  surfaceElevated: 'rgba(255,255,255,0.07)',
  border: 'rgba(251,247,244,0.08)',
  borderHover: 'rgba(251,247,244,0.16)',
  dawn: '#E8845C',
  dawnMuted: 'rgba(232,132,92,0.15)',
  text: '#FBF7F4',
  textSecondary: 'rgba(251,247,244,0.85)',
  textTertiary: 'rgba(155,175,196,0.85)',
  textMuted: 'rgba(155,175,196,0.55)',
  textGhost: 'rgba(155,175,196,0.3)',
  sage: '#52B788',
  alert: '#D64B2A',
  dusk: '#4E7DAA',
  gold: '#F4C896',
  mist: '#9BAFC4',
};

export default function BriefingPage() {
  const [briefing, setBriefing] = useState<BriefingResponse['briefing']>(null);
  const [meetingPreps, setMeetingPreps] = useState<MeetingPrepData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerItem, setDrawerItem] = useState<BriefingItem | null>(null);
  const [integrations, setIntegrations] = useState<Array<{ provider: string; status: string }>>([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [fyiExpanded, setFyiExpanded] = useState(false);
  const [checkedActions, setCheckedActions] = useState<Set<string>>(new Set());
  const [opsExpanded, setOpsExpanded] = useState(false);

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

  async function handleFeedback(itemId: string, feedback: 1 | -1) {
    try {
      const res = await fetch('/api/briefing/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, feedback }),
      });
      if (!res.ok) throw new Error('Failed to save feedback');
      toast.success(feedback === 1 ? 'Marked as helpful' : 'Feedback recorded');
    } catch {
      toast.error('Failed to save feedback');
    }
  }

  function handleCitationClick(item: BriefingItem) {
    setDrawerItem(item);
  }

  function handlePrepCitationClick(sourceRef: SourceRef, title: string) {
    setDrawerItem({ source_ref: sourceRef, title } as BriefingItem);
  }

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
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
              fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
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
            fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
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

  /* ── Empty state ── */
  if (!briefing || briefing.items.length === 0) {
    const connectedIntegrations = integrations.filter(i => i.status === 'connected');
    const hasConnectedIntegrations = connectedIntegrations.length > 0;

    const PROVIDER_LABELS: Record<string, string> = {
      gmail: 'Gmail', google_calendar: 'Google Calendar', outlook: 'Outlook',
      slack: 'Slack', notion: 'Notion', google_drive: 'Google Drive',
      microsoft_calendar: 'Outlook Calendar', linear: 'Linear', github: 'GitHub',
      hubspot: 'HubSpot', salesforce: 'Salesforce',
    };

    return (
      <div className="space-y-6">
        <h1
          className="text-[28px] tracking-[-0.02em]"
          style={{
            color: c.text,
            fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
            fontWeight: 300,
          }}
        >
          {getGreeting()}
        </h1>

        {hasConnectedIntegrations && (
          <div
            className="rounded-xl p-4"
            style={{ background: c.surface, border: `1px solid ${c.border}` }}
          >
            <p
              className="text-[11px] font-semibold tracking-[0.06em] uppercase mb-2.5"
              style={{ color: c.textMuted, fontFamily: "'JetBrains Mono', monospace" }}
            >
              Connected Sources
            </p>
            <div className="flex flex-wrap gap-2">
              {connectedIntegrations.map(i => (
                <span
                  key={i.provider}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium"
                  style={{ background: 'rgba(82,183,136,0.1)', color: c.sage, border: '1px solid rgba(82,183,136,0.2)' }}
                >
                  <CheckCircle2 size={11} />
                  {PROVIDER_LABELS[i.provider] ?? i.provider}
                </span>
              ))}
            </div>
          </div>
        )}

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
            {hasConnectedIntegrations ? "Ready to generate your first briefing" : 'Connect your tools to get started'}
          </p>
          <p
            className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed"
            style={{ color: c.textTertiary }}
          >
            {hasConnectedIntegrations
              ? 'Your integrations are connected. Generate your briefing to see what needs your attention today.'
              : 'Connect your email, calendar, and other tools to get your daily briefing.'}
          </p>

          {hasConnectedIntegrations ? (
            <button
              onClick={handleGenerateBriefing}
              disabled={generating}
              className="mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-semibold transition-all duration-200"
              style={{
                background: c.dawn,
                color: '#FBF7F4',
                opacity: generating ? 0.7 : 1,
                cursor: generating ? 'not-allowed' : 'pointer',
              }}
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              {generating ? 'Syncing & generating...' : 'Generate briefing'}
            </button>
          ) : (
            <Link
              href="/settings/integrations"
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-[13px] font-semibold"
              style={{ background: c.dawn, color: '#FBF7F4' }}
            >
              Connect integrations
            </Link>
          )}

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
     BRIEFING CONTENT — 3 zones
     ═══════════════════════════════════════════════════════════ */

  const grouped: Partial<Record<BriefingItemSection, BriefingItem[]>> = {};
  for (const item of briefing.items) {
    if (!grouped[item.section]) grouped[item.section] = [];
    grouped[item.section]!.push(item);
  }

  const dateStr = new Date(briefing.briefing_date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const scheduleCount = grouped['todays_schedule']?.length ?? 0;
  const actionCount = grouped['action_required']?.length ?? 0;
  const vipCount = grouped['vip_inbox']?.length ?? 0;
  const awaitingCount = grouped['awaiting_reply']?.length ?? 0;
  // Urgent items
  const urgentItems = briefing.items.filter(item =>
    (item.urgency_score !== null && item.urgency_score >= 9) ||
    SECURITY_KEYWORDS_RE.test(item.title) ||
    SECURITY_KEYWORDS_RE.test(item.summary)
  );
  const urgentItemIds = new Set(urgentItems.map(i => i.id));

  // Sentiment flags
  const negativeItems = briefing.items.filter(i => i.sentiment === 'negative');

  // Build concise context line for greeting
  const contextParts: string[] = [];
  if (urgentItems.length > 0) contextParts.push(`${urgentItems.length} urgent`);
  if (negativeItems.length > 0) contextParts.push(`${negativeItems.length} unhappy`);
  if (actionCount + vipCount > 0) contextParts.push(`${actionCount + vipCount} to reply`);
  if (awaitingCount > 0) contextParts.push(`${awaitingCount} awaiting reply`);
  if (scheduleCount > 0) contextParts.push(`${scheduleCount} meeting${scheduleCount > 1 ? 's' : ''}`);
  const contextLine = contextParts.length === 0
    ? 'All clear today.'
    : contextParts.join(' · ');

  // Build action plan from top-ranked items
  function buildActionText(item: BriefingItem): string {
    const title = decodeEntities(item.title || '').trim();
    const summary = decodeEntities(item.summary || '').trim();
    const suggestion = item.action_suggestion ? decodeEntities(item.action_suggestion).trim() : '';
    const from = item.source_ref?.from_name ? decodeEntities(item.source_ref.from_name).trim() : '';
    const descriptor = title || summary || 'this item';
    const context = from ? ` from ${from}` : '';

    if (suggestion && descriptor) return `${suggestion} — ${descriptor}${context}`;
    if (item.section === 'awaiting_reply') return `Follow up on ${descriptor}${context}`;
    if (item.section === 'action_required' || item.section === 'vip_inbox') return `Reply to ${descriptor}${context}`;
    if (item.section === 'commitment_queue') return `Resolve: ${descriptor}${context}`;
    if (item.section === 'at_risk') return `Address: ${descriptor}${context}`;
    return `Review ${descriptor}${context}`;
  }

  const actionPlan: Array<{ id: string; action: string; section: string; isUrgent: boolean }> = [];
  for (const item of urgentItems) {
    actionPlan.push({ id: item.id, action: buildActionText(item), section: item.section, isUrgent: true });
  }
  const nonUrgentForPlan = briefing.items
    .filter(i => !urgentItemIds.has(i.id) && i.section !== 'todays_schedule')
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5 - urgentItems.length);
  for (const item of nonUrgentForPlan) {
    actionPlan.push({ id: item.id, action: buildActionText(item), section: item.section, isUrgent: false });
  }

  function toggleAction(id: string) {
    setCheckedActions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Intent groups for the feed
  const intentGroups: Record<IntentSection, BriefingItem[]> = {
    reply_now: [], follow_up: [], review: [], fyi: [],
  };
  for (const item of briefing.items) {
    if (urgentItemIds.has(item.id)) continue;
    if (item.section === 'todays_schedule') continue;
    const intent = SECTION_TO_INTENT[item.section] ?? 'fyi';
    intentGroups[intent].push(item);
  }
  for (const key of INTENT_ORDER) {
    intentGroups[key].sort((a, b) => a.rank - b.rank);
  }

  return (
    <div className="space-y-8">

      {/* ═══════════════════════════════════════════════════════
          ZONE 1: COMMAND CENTER
          ═══════════════════════════════════════════════════════ */}

      {/* Header — greeting + context + refresh */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-[28px] tracking-[-0.02em] leading-tight"
            style={{
              color: c.text,
              fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
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

      {/* Urgent alerts — prominent, above action plan */}
      {urgentItems.length > 0 && (
        <div
          id="section-urgent"
          className="rounded-xl overflow-hidden"
          style={{
            background: 'rgba(214,75,42,0.05)',
            border: '1px solid rgba(214,75,42,0.15)',
            borderLeft: `3px solid ${c.alert}`,
          }}
        >
          <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
            <ShieldAlert size={13} style={{ color: c.alert }} />
            <span className="text-[12px] font-semibold" style={{ color: c.alert }}>
              Urgent — {urgentItems.length} item{urgentItems.length > 1 ? 's' : ''} need immediate attention
            </span>
          </div>
          <div className="px-3 pb-3 space-y-2">
            {urgentItems.map(item => (
              <BriefingItemComponent
                key={item.id}
                item={item}
                onFeedback={handleFeedback}
                onCitationClick={handleCitationClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Action Plan — the hero of the page */}
      {actionPlan.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: c.surfaceElevated,
            border: `1px solid ${c.border}`,
          }}
        >
          <div className="px-5 pt-4 pb-1">
            <p
              className="text-[11px] font-semibold tracking-[0.08em] uppercase"
              style={{ color: c.dawn, fontFamily: "'JetBrains Mono', monospace" }}
            >
              Your action plan
            </p>
          </div>
          <ol className="px-5 pb-4 pt-2 space-y-1">
            {actionPlan.map((item, i) => {
              const checked = checkedActions.has(item.id);
              const intentSection = SECTION_TO_INTENT[item.section as BriefingItemSection] ?? 'review';
              return (
                <li
                  key={item.id}
                  className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-all duration-150"
                  style={{
                    background: checked ? 'rgba(82,183,136,0.04)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!checked) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }}
                  onMouseLeave={(e) => {
                    if (!checked) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleAction(item.id)}
                    className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded transition-all duration-150 cursor-pointer"
                    style={{
                      background: checked ? 'rgba(82,183,136,0.15)' : 'transparent',
                      border: `1.5px solid ${checked ? c.sage : 'rgba(155,175,196,0.25)'}`,
                    }}
                  >
                    {checked && <CheckCircle2 size={11} style={{ color: c.sage }} />}
                  </button>

                  {/* Number + text */}
                  <button
                    onClick={() => {
                      const el = document.getElementById(`section-${urgentItemIds.has(item.id) ? 'urgent' : intentSection}`);
                      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="flex-1 text-left text-[13px] leading-snug transition-all duration-150"
                    style={{
                      color: checked ? c.textMuted : c.textSecondary,
                      textDecoration: checked ? 'line-through' : 'none',
                    }}
                  >
                    <span
                      className="font-bold tabular-nums mr-1.5"
                      style={{ color: checked ? c.textMuted : (item.isUrgent ? c.alert : c.dawn) }}
                    >
                      {i + 1}.
                    </span>
                    {item.action}
                  </button>

                  {/* Quick-complete */}
                  <button
                    onClick={() => toggleAction(item.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      color: checked ? c.sage : c.textMuted,
                      background: checked ? 'rgba(82,183,136,0.08)' : 'rgba(255,255,255,0.05)',
                    }}
                  >
                    {checked ? 'Done' : 'Complete'}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          ZONE 2: TODAY'S TIMELINE
          ═══════════════════════════════════════════════════════ */}

      {scheduleCount > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock size={14} style={{ color: c.dusk }} />
              <h2 className="text-[14px] font-semibold" style={{ color: c.text }}>
                Today&apos;s Schedule
              </h2>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums"
                style={{ background: 'rgba(78,125,170,0.1)', color: c.dusk }}
              >
                {scheduleCount}
              </span>
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

          {/* Vertical timeline */}
          <div className="relative">
            <div
              className="absolute left-[7px] top-0 bottom-0 w-px"
              style={{ background: `linear-gradient(to bottom, ${c.dusk}, transparent)` }}
            />
            <div className="space-y-1">
              {(grouped['todays_schedule'] ?? [])
                .filter(i => !urgentItemIds.has(i.id))
                .map(item => {
                  const time = item.source_ref?.sent_at
                    ? new Date(item.source_ref.sent_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                    : null;
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
                        {item.source_ref?.from_name && (
                          <p className="mt-0.5 flex items-center gap-1 text-[12px]" style={{ color: c.textMuted }}>
                            <Users size={10} />
                            {decodeEntities(item.source_ref.from_name)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Meeting preps */}
          {meetingPreps.length > 0 && (
            <div className="mt-3 space-y-2">
              {meetingPreps.map(prep => (
                <MeetingPrepCard
                  key={prep.event_id}
                  prep={prep}
                  onCitationClick={handlePrepCitationClick}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          OPERATIONS — AM Sweep + Time Blocker
          ═══════════════════════════════════════════════════════ */}

      <div>
        <button
          onClick={() => setOpsExpanded(!opsExpanded)}
          className="flex w-full items-center justify-between rounded-xl px-5 py-3.5 transition-all duration-150"
          style={{
            background: c.surfaceElevated,
            border: `1px solid ${c.border}`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.borderHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; }}
        >
          <div className="flex items-center gap-2.5">
            <Zap size={14} style={{ color: c.dawn }} />
            <span className="text-[13px] font-semibold" style={{ color: c.text }}>
              Operations
            </span>
            <span
              className="rounded-md px-2 py-0.5 text-[10px] font-medium"
              style={{ background: c.dawnMuted, color: c.dawn }}
            >
              Sweep & Schedule
            </span>
          </div>
          <ChevronDown
            size={14}
            className="transition-transform duration-200"
            style={{
              color: c.textMuted,
              transform: opsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>

        {opsExpanded && (
          <div className="mt-3 space-y-4">
            <AMSweepPanel />
            <TimeBlockPanel />
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          ZONE 3: INTELLIGENCE FEED
          ═══════════════════════════════════════════════════════ */}

      <div className="space-y-6">
        {INTENT_ORDER.map(intentKey => {
          const items = intentGroups[intentKey];
          if (items.length === 0) return null;

          const meta = INTENT_META[intentKey];
          const Icon = meta.icon;
          const isFyi = intentKey === 'fyi';
          const showItems = isFyi ? fyiExpanded : true;

          // 2-column layout
          const columns: BriefingItem[][] = [[], []];
          items.forEach((item, i) => {
            columns[i % 2].push(item);
          });

          return (
            <section key={intentKey} id={`section-${intentKey}`}>
              {/* Section header */}
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="flex h-5 w-5 items-center justify-center rounded"
                  style={{ background: meta.accentBg }}
                >
                  <Icon size={12} style={{ color: meta.accent }} />
                </div>
                <h2
                  className="text-[13px] font-semibold"
                  style={{ color: c.text }}
                >
                  {meta.label}
                </h2>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
                  style={{ background: meta.accentBg, color: meta.accent }}
                >
                  {items.length}
                </span>
                {isFyi && (
                  <button
                    onClick={() => setFyiExpanded(!fyiExpanded)}
                    className="ml-auto flex items-center gap-1 text-[12px] font-medium transition-colors duration-150"
                    style={{ color: c.textTertiary }}
                  >
                    {fyiExpanded ? 'Collapse' : 'Expand'}
                    <ChevronDown
                      size={12}
                      className="transition-transform duration-200"
                      style={{ transform: fyiExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    />
                  </button>
                )}
              </div>

              {/* FYI collapsed preview */}
              {isFyi && !showItems && (
                <div
                  className="rounded-lg px-4 py-2.5 cursor-pointer transition-all duration-150"
                  style={{ background: c.surface, border: `1px solid ${c.border}` }}
                  onClick={() => setFyiExpanded(true)}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.borderHover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; }}
                >
                  <p className="text-[12px]" style={{ color: c.textMuted }}>
                    {items.length} informational item{items.length !== 1 ? 's' : ''} — click to expand
                  </p>
                </div>
              )}

              {/* 2-column grid */}
              {showItems && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
                  {columns.map((colItems, colIdx) => (
                    <div key={colIdx} className="space-y-3">
                      {colItems.map(item => (
                        <BriefingItemComponent
                          key={item.id}
                          item={item}
                          onFeedback={handleFeedback}
                          onCitationClick={handleCitationClick}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Yesterday's Recap — minimal footer */}
      <YesterdayRecap />

      <CitationDrawer
        open={drawerItem !== null}
        onClose={() => setDrawerItem(null)}
        sourceRef={drawerItem?.source_ref ?? null}
        title={drawerItem?.title ?? ''}
      />
    </div>
  );
}
