'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BriefingItem as BriefingItemComponent } from '@/components/briefing/BriefingItem';
import { CitationDrawer } from '@/components/briefing/CitationDrawer';
import { MeetingPrepCard } from '@/components/people/MeetingPrepCard';
import { LayoutDashboard, CheckCircle2, Loader2, Zap, RefreshCw, Calendar, ShieldAlert, Reply, Eye, Info, ChevronDown, MailCheck, Clock, Coffee, Users } from 'lucide-react';
import { DayGlanceCard } from '@/components/briefing/DayGlanceCard';
import { YesterdayRecap } from '@/components/briefing/YesterdayRecap';
import { decodeEntities } from '@/lib/utils/decode-entities';
import type { Briefing, BriefingItem, BriefingItemSection, MeetingPrepData, SourceRef } from '@/lib/db/types';

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

const INTENT_META: Record<IntentSection, { label: string; description: string; icon: typeof Reply; accent: string; accentBg: string }> = {
  reply_now: {
    label: 'Reply Now',
    description: 'Items requiring your active response',
    icon: MailCheck,
    accent: '#D64B2A',
    accentBg: 'rgba(214,75,42,0.08)',
  },
  follow_up: {
    label: 'Follow Up',
    description: 'Sent messages with no response — consider nudging',
    icon: Reply,
    accent: '#F4C896',
    accentBg: 'rgba(244,200,150,0.08)',
  },
  review: {
    label: 'Review',
    description: 'Decisions, commitments, and items needing acknowledgement',
    icon: Eye,
    accent: '#4E7DAA',
    accentBg: 'rgba(78,125,170,0.08)',
  },
  fyi: {
    label: 'FYI',
    description: 'Informational items — no action needed',
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
    // Fetch connected integrations to show context in empty state
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

      const res = await fetch('/api/briefing/generate', {
        method: 'POST',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Generation failed');
      }
      toast.success('Briefing generated!');
      await fetchBriefing();
    } catch (err) {
      const message = err instanceof Error
        ? err.name === 'AbortError'
          ? 'Generation timed out. Please try again.'
          : err.message
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
    setDrawerItem({
      source_ref: sourceRef,
      title,
    } as BriefingItem);
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
      <div className="space-y-8">
        <div>
          <h1
            className="text-[32px] tracking-[-0.02em]"
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
              className="h-20 animate-pulse rounded-xl"
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
      <div className="space-y-8">
        <h1
          className="text-[32px] tracking-[-0.02em]"
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
      <div className="space-y-8">
        <h1
          className="text-[32px] tracking-[-0.02em]"
          style={{
            color: c.text,
            fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
            fontWeight: 300,
          }}
        >
          {getGreeting()}
        </h1>

        {/* Connected integrations status */}
        {hasConnectedIntegrations && (
          <div
            className="rounded-xl p-5"
            style={{ background: c.surface, border: `1px solid ${c.border}` }}
          >
            <p
              className="text-[12px] font-semibold tracking-[0.06em] uppercase mb-3"
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
          className="rounded-xl p-12 text-center"
          style={{
            background: c.surface,
            border: `1px dashed ${c.borderHover}`,
          }}
        >
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: c.dawnMuted }}
          >
            <LayoutDashboard size={22} style={{ color: c.dawn }} />
          </div>
          <p className="text-[14px] font-semibold" style={{ color: c.text }}>
            {hasConnectedIntegrations ? "Today's briefing hasn't been generated yet" : 'No briefing yet'}
          </p>
          <p
            className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed"
            style={{ color: c.textTertiary }}
          >
            {hasConnectedIntegrations
              ? 'Your integrations are connected. Generate your first briefing to see prioritized insights from your email, calendar, and connected tools.'
              : 'Connect your email, calendar, and other tools to get started with your daily briefing.'}
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
                border: 'none',
              }}
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              {generating ? 'Syncing & generating...' : 'Sync & generate briefing'}
            </button>
          ) : (
            <a
              href="/settings/integrations"
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-[13px] font-semibold transition-all duration-200"
              style={{
                background: c.dawn,
                color: '#FBF7F4',
              }}
            >
              Connect integrations
            </a>
          )}

          {generateError && (
            <div
              className="mx-auto mt-4 max-w-md rounded-lg px-4 py-3 text-[12px] leading-relaxed"
              style={{
                background: 'rgba(214,75,42,0.08)',
                border: '1px solid rgba(214,75,42,0.2)',
                color: c.alert,
              }}
            >
              {generateError}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Briefing content ── */
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
  const commitmentCount = grouped['commitment_queue']?.length ?? 0;
  const vipCount = grouped['vip_inbox']?.length ?? 0;
  const actionCount = grouped['action_required']?.length ?? 0;
  const awaitingCount = grouped['awaiting_reply']?.length ?? 0;

  // Urgent items: high urgency score OR security-related keywords
  const urgentItems = briefing.items.filter(item =>
    (item.urgency_score !== null && item.urgency_score >= 9) ||
    SECURITY_KEYWORDS_RE.test(item.title) ||
    SECURITY_KEYWORDS_RE.test(item.summary)
  );
  const urgentItemIds = new Set(urgentItems.map(i => i.id));

  // Build greeting context line
  const greetingParts: string[] = [];
  if (urgentItems.length > 0) greetingParts.push(`${urgentItems.length} urgent item${urgentItems.length > 1 ? 's' : ''}`);
  if (actionCount + vipCount > 0) greetingParts.push(`${actionCount + vipCount} action${actionCount + vipCount > 1 ? 's' : ''} required`);
  if (awaitingCount > 0) greetingParts.push(`${awaitingCount} awaiting reply`);
  if (scheduleCount > 0) greetingParts.push(`${scheduleCount} meeting${scheduleCount > 1 ? 's' : ''}`);
  const greetingContext = greetingParts.length === 0
    ? 'your briefing is ready.'
    : `you have ${greetingParts.join(' and ')} today.`;

  // Build executive summary from item data
  const summaryParts: string[] = [];
  if (urgentItems.length > 0) {
    const urgentTitles = urgentItems.slice(0, 2).map(i => decodeEntities(i.title));
    summaryParts.push(`You have ${urgentItems.length === 1 ? 'an urgent item' : `${urgentItems.length} urgent items`} requiring immediate attention: ${urgentTitles.join(' and ')}.`);
  }
  const replyItems = briefing.items.filter(i => !urgentItemIds.has(i.id) && (i.section === 'action_required' || i.section === 'vip_inbox'));
  if (replyItems.length > 0) {
    summaryParts.push(`${replyItems.length} message${replyItems.length > 1 ? 's need' : ' needs'} a reply, including from ${decodeEntities(replyItems[0].source_ref?.from_name ?? 'a contact')}.`);
  }
  if (scheduleCount > 0) {
    summaryParts.push(`You have ${scheduleCount} meeting${scheduleCount > 1 ? 's' : ''} on today's calendar.`);
  } else {
    summaryParts.push('Your calendar is clear, giving you time for focused work and follow-ups.');
  }
  if (awaitingCount > 0) {
    summaryParts.push(`${awaitingCount} sent message${awaitingCount > 1 ? 's have' : ' has'} had no response yet.`);
  }
  const fyiCount = briefing.items.filter(i => SECTION_TO_INTENT[i.section] === 'fyi' && !urgentItemIds.has(i.id)).length;
  if (fyiCount > 0) {
    summaryParts.push(`${fyiCount} informational item${fyiCount > 1 ? 's have' : ' has'} been set aside for later.`);
  }
  const executiveSummary = summaryParts.slice(0, 4).join(' ');

  // Build action plan from top-ranked items
  function buildActionText(item: BriefingItem): string {
    const title = decodeEntities(item.title || '').trim();
    const summary = decodeEntities(item.summary || '').trim();
    const suggestion = item.action_suggestion ? decodeEntities(item.action_suggestion).trim() : '';
    const from = item.source_ref?.from_name ? decodeEntities(item.source_ref.from_name).trim() : '';

    // Use the most descriptive content available
    const descriptor = title || summary || 'this item';
    const context = from ? ` from ${from}` : '';

    if (suggestion && descriptor) {
      return `${suggestion} — ${descriptor}${context}`;
    }

    if (item.section === 'awaiting_reply') {
      return `Follow up on ${descriptor}${context} — no reply received`;
    }
    if (item.section === 'action_required' || item.section === 'vip_inbox') {
      return `Reply to ${descriptor}${context}`;
    }
    if (item.section === 'commitment_queue') {
      return `Resolve commitment: ${descriptor}${context}`;
    }
    if (item.section === 'at_risk') {
      return `Address risk: ${descriptor}${context}`;
    }
    return `Review ${descriptor}${context}`;
  }

  const actionPlan: Array<{ id: string; action: string; section: string }> = [];
  for (const item of urgentItems) {
    actionPlan.push({ id: item.id, action: buildActionText(item), section: item.section });
  }
  const nonUrgentForPlan = briefing.items
    .filter(i => !urgentItemIds.has(i.id) && i.section !== 'todays_schedule')
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5 - urgentItems.length);
  for (const item of nonUrgentForPlan) {
    actionPlan.push({ id: item.id, action: buildActionText(item), section: item.section });
  }

  function toggleAction(id: string) {
    setCheckedActions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-[32px] tracking-[-0.02em]"
            style={{
              color: c.text,
              fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
              fontWeight: 300,
            }}
          >
            {getGreeting()} <span style={{ color: c.textTertiary, fontWeight: 300, fontStyle: 'italic' }}>— {greetingContext}</span>
          </h1>
          <p
            className="mt-1 text-[12px]"
            style={{ color: c.textMuted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em' }}
          >
            {dateStr}
          </p>
        </div>
        <button
          onClick={handleGenerateBriefing}
          disabled={generating}
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-semibold transition-all duration-200"
          style={{
            background: generating ? c.dawnMuted : c.surface,
            color: generating ? c.textMuted : c.textSecondary,
            border: `1px solid ${c.border}`,
            cursor: generating ? 'not-allowed' : 'pointer',
            opacity: generating ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (!generating) e.currentTarget.style.borderColor = c.borderHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = c.border;
          }}
        >
          {generating ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <RefreshCw size={13} />
          )}
          {generating ? 'Regenerating...' : 'Refresh briefing'}
        </button>
      </div>

      {generateError && (
        <div
          className="-mt-6 rounded-lg px-4 py-3 text-[12px] leading-relaxed"
          style={{
            background: 'rgba(214,75,42,0.08)',
            border: '1px solid rgba(214,75,42,0.2)',
            color: c.alert,
          }}
        >
          {generateError}
        </div>
      )}

      {/* Day at a Glance */}
      <DayGlanceCard
        meetingsToday={scheduleCount}
        emailsNeedReply={actionCount + vipCount}
      />

      {/* Executive Summary */}
      <div
        className="rounded-xl px-6 py-5"
        style={{
          background: c.surface,
          border: `1px solid ${c.border}`,
        }}
      >
        <p
          className="text-[11px] font-semibold tracking-[0.08em] uppercase mb-3"
          style={{ color: c.textMuted, fontFamily: "'JetBrains Mono', monospace" }}
        >
          Executive Summary
        </p>
        <p
          className="text-[14px] leading-[1.7]"
          style={{ color: c.textSecondary }}
        >
          {executiveSummary}
        </p>
      </div>

      {/* Today's Action Plan */}
      {actionPlan.length > 0 && (
        <div
          className="rounded-xl px-6 py-5"
          style={{
            background: c.surface,
            border: `1px solid ${c.border}`,
          }}
        >
          <p
            className="text-[11px] font-semibold tracking-[0.08em] uppercase mb-4"
            style={{ color: c.textMuted, fontFamily: "'JetBrains Mono', monospace" }}
          >
            Today&apos;s Action Plan
          </p>
          <ol className="space-y-2.5">
            {actionPlan.map((item, i) => {
              const checked = checkedActions.has(item.id);
              // Map to intent section for scroll target
              const intentSection = SECTION_TO_INTENT[item.section as BriefingItemSection] ?? 'review';
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-3 group"
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleAction(item.id)}
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-all duration-200 cursor-pointer"
                    style={{
                      background: checked ? 'rgba(82,183,136,0.12)' : 'transparent',
                      border: `1.5px solid ${checked ? c.sage : c.border}`,
                    }}
                    title={checked ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {checked && (
                      <CheckCircle2 size={12} style={{ color: c.sage }} />
                    )}
                  </button>

                  {/* Action text — clicks scroll to the item */}
                  <button
                    onClick={() => {
                      const el = document.getElementById(`section-${urgentItemIds.has(item.id) ? 'urgent' : intentSection}`);
                      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="flex-1 text-left text-[13px] leading-snug transition-all duration-200 hover:underline"
                    style={{
                      color: checked ? c.textMuted : c.textSecondary,
                      textDecoration: checked ? 'line-through' : 'none',
                    }}
                  >
                    <span
                      className="font-bold tabular-nums mr-1.5"
                      style={{ color: checked ? c.textMuted : c.dawn }}
                    >
                      {i + 1}.
                    </span>
                    {item.action}
                  </button>

                  {/* Mark complete button */}
                  <button
                    onClick={() => toggleAction(item.id)}
                    className="shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all duration-200"
                    style={{
                      background: checked ? 'rgba(82,183,136,0.08)' : 'transparent',
                      color: checked ? c.sage : c.textMuted,
                      border: `1px solid ${checked ? 'rgba(82,183,136,0.2)' : c.border}`,
                    }}
                    onMouseEnter={(e) => {
                      if (!checked) {
                        e.currentTarget.style.borderColor = c.borderHover;
                        e.currentTarget.style.color = c.textTertiary;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!checked) {
                        e.currentTarget.style.borderColor = c.border;
                        e.currentTarget.style.color = c.textMuted;
                      }
                    }}
                  >
                    {checked ? 'Completed' : 'Mark complete'}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Urgent alerts */}
      {urgentItems.length > 0 && (
        <div
          id="section-urgent"
          className="rounded-xl overflow-hidden"
          style={{
            background: 'rgba(214,75,42,0.06)',
            border: '1px solid rgba(214,75,42,0.15)',
            borderLeft: `3px solid ${c.alert}`,
          }}
        >
          <div className="flex items-center gap-2.5 px-5 pt-4 pb-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ background: 'rgba(214,75,42,0.12)' }}
            >
              <ShieldAlert size={13} style={{ color: c.alert }} />
            </div>
            <h2
              className="text-[13px] font-semibold tracking-[-0.01em]"
              style={{ color: c.alert, fontFamily: "'Inter', sans-serif" }}
            >
              Urgent
            </h2>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums"
              style={{ background: 'rgba(214,75,42,0.12)', color: c.alert }}
            >
              {urgentItems.length}
            </span>
          </div>
          <div className="px-4 pb-4 space-y-2">
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(() => {
          const statCards: Array<{
            label: string;
            value: number;
            section: string;
            accent: string;
            accentBg: string;
            icon: typeof Calendar;
            zeroLabel?: string;
          }> = [
            {
              label: 'Meetings',
              value: scheduleCount,
              section: 'todays_schedule',
              accent: c.dusk,
              accentBg: 'rgba(78,125,170,0.08)',
              icon: Calendar,
              zeroLabel: 'Clear calendar',
            },
            {
              label: 'Reply Now',
              value: actionCount + vipCount,
              section: 'reply_now',
              accent: c.alert,
              accentBg: 'rgba(214,75,42,0.08)',
              icon: MailCheck,
            },
            {
              label: 'Follow Up',
              value: awaitingCount,
              section: 'follow_up',
              accent: c.gold,
              accentBg: 'rgba(244,200,150,0.08)',
              icon: Reply,
            },
            {
              label: 'Review',
              value: commitmentCount + (grouped['decision_queue']?.length ?? 0) + (grouped['at_risk']?.length ?? 0),
              section: 'review',
              accent: c.dusk,
              accentBg: 'rgba(78,125,170,0.08)',
              icon: Eye,
            },
          ];

          return statCards.map(({ label, value, section, accent, accentBg, icon: Icon, zeroLabel }) => (
            <button
              key={label}
              onClick={() => {
                const el = document.getElementById(`section-${section}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="group rounded-xl px-5 py-4 text-left transition-all duration-200"
              style={{
                background: value > 0 ? accentBg : c.surface,
                border: `1px solid ${value > 0 ? `${accent}25` : c.border}`,
                cursor: value > 0 ? 'pointer' : 'default',
              }}
              onMouseEnter={(e) => {
                if (value > 0) e.currentTarget.style.borderColor = `${accent}50`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = value > 0 ? `${accent}25` : c.border;
              }}
            >
              <div className="flex items-center gap-2">
                <Icon size={13} style={{ color: value > 0 ? accent : c.textMuted }} />
                <p
                  className="text-[11px] font-medium tracking-[0.08em] uppercase"
                  style={{ color: value > 0 ? accent : c.textMuted }}
                >
                  {label}
                </p>
              </div>
              {value > 0 ? (
                <p
                  className="mt-1.5 text-[22px] font-bold tracking-tight tabular-nums"
                  style={{ color: c.text }}
                >
                  {value}
                </p>
              ) : (
                <p
                  className="mt-1.5 text-[13px] font-medium"
                  style={{ color: c.textTertiary }}
                >
                  {zeroLabel ?? 'None'}
                </p>
              )}
            </button>
          ));
        })()}
      </div>

      {/* Today's Schedule */}
      <div id="section-todays_schedule">
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ background: 'rgba(78,125,170,0.1)' }}
          >
            <Calendar size={13} style={{ color: c.dusk }} />
          </div>
          <h2
            className="text-[13px] font-semibold tracking-[-0.01em]"
            style={{ color: c.text, fontFamily: "'Inter', sans-serif" }}
          >
            Today&apos;s Schedule
          </h2>
          {scheduleCount > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums"
              style={{ background: 'rgba(78,125,170,0.1)', color: c.dusk }}
            >
              {scheduleCount}
            </span>
          )}
        </div>

        {scheduleCount > 0 ? (
          <div className="space-y-2">
            {/* Schedule items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(grouped['todays_schedule'] ?? [])
                .filter(i => !urgentItemIds.has(i.id))
                .map(item => {
                  const time = item.source_ref?.sent_at
                    ? new Date(item.source_ref.sent_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                    : null;

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl px-4 py-3 transition-all duration-200"
                      style={{
                        background: c.surface,
                        border: `1px solid ${c.border}`,
                        borderLeft: `2px solid ${c.dusk}`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {time && (
                            <p
                              className="text-[11px] font-medium mb-1"
                              style={{ color: c.dusk, fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              <Clock size={10} className="inline mr-1" style={{ verticalAlign: 'middle' }} />
                              {time}
                            </p>
                          )}
                          <p
                            className="text-[13px] font-semibold leading-snug"
                            style={{ color: c.text }}
                          >
                            {decodeEntities(item.title)}
                          </p>
                          {item.source_ref?.from_name && (
                            <p className="mt-1 text-[12px] flex items-center gap-1" style={{ color: c.textMuted }}>
                              <Users size={10} />
                              {decodeEntities(item.source_ref.from_name)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Meeting preps */}
            {meetingPreps.length > 0 && (
              <div className="space-y-2 mt-3">
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
        ) : (
          <div
            className="rounded-xl px-5 py-6 text-center"
            style={{ background: c.surface, border: `1px solid ${c.border}` }}
          >
            <Coffee size={20} style={{ color: c.textMuted, margin: '0 auto 8px' }} />
            <p className="text-[13px] font-medium" style={{ color: c.textTertiary }}>
              Clear calendar today
            </p>
            <p className="text-[12px] mt-1" style={{ color: c.textMuted }}>
              Good time to focus on deep work and follow-ups.
            </p>
          </div>
        )}
      </div>

      {/* Intent-based sections */}
      {(() => {
        // Build intent groups from non-urgent items, excluding todays_schedule
        const intentGroups: Record<IntentSection, BriefingItem[]> = {
          reply_now: [],
          follow_up: [],
          review: [],
          fyi: [],
        };

        for (const item of briefing.items) {
          if (urgentItemIds.has(item.id)) continue;
          if (item.section === 'todays_schedule') continue;
          const intent = SECTION_TO_INTENT[item.section] ?? 'fyi';
          intentGroups[intent].push(item);
        }

        // Sort each group by rank (priority)
        for (const key of INTENT_ORDER) {
          intentGroups[key].sort((a, b) => a.rank - b.rank);
        }

        return (
          <div className="space-y-8">
            {INTENT_ORDER.map(intentKey => {
              const items = intentGroups[intentKey];
              if (items.length === 0) return null;

              const meta = INTENT_META[intentKey];
              const Icon = meta.icon;
              const isFyi = intentKey === 'fyi';
              const showItems = isFyi ? fyiExpanded : true;

              // Distribute items across 3 columns left-to-right by rank
              const columns: BriefingItem[][] = [[], [], []];
              items.forEach((item, i) => {
                columns[i % 3].push(item);
              });

              return (
                <section key={intentKey} id={`section-${intentKey}`}>
                  {/* Section header */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-md"
                      style={{ background: meta.accentBg, border: `1px solid ${meta.accent}20` }}
                    >
                      <Icon size={13} style={{ color: meta.accent }} />
                    </div>
                    <h2
                      className="text-[13px] font-semibold tracking-[-0.01em]"
                      style={{ color: c.text, fontFamily: "'Inter', sans-serif" }}
                    >
                      {meta.label}
                    </h2>
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums"
                      style={{ background: meta.accentBg, color: meta.accent }}
                    >
                      {items.length}
                    </span>
                    <p
                      className="text-[12px] ml-1"
                      style={{ color: c.textMuted }}
                    >
                      {meta.description}
                    </p>
                    {isFyi && (
                      <button
                        onClick={() => setFyiExpanded(!fyiExpanded)}
                        className="ml-auto flex items-center gap-1 text-[12px] font-medium transition-colors duration-200"
                        style={{ color: c.textTertiary }}
                      >
                        {fyiExpanded ? 'Collapse' : 'Expand'}
                        <ChevronDown
                          size={13}
                          className="transition-transform duration-200"
                          style={{ transform: fyiExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        />
                      </button>
                    )}
                  </div>

                  {/* FYI collapsed preview */}
                  {isFyi && !showItems && (
                    <div
                      className="rounded-xl px-5 py-3 cursor-pointer"
                      style={{ background: c.surface, border: `1px solid ${c.border}` }}
                      onClick={() => setFyiExpanded(true)}
                    >
                      <p className="text-[12px]" style={{ color: c.textMuted }}>
                        {items.length} informational item{items.length !== 1 ? 's' : ''} — click to expand
                      </p>
                    </div>
                  )}

                  {/* 3-column grid */}
                  {showItems && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
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
        );
      })()}

      {/* Yesterday's Recap */}
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
