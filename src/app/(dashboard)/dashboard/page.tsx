'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BriefingSection } from '@/components/briefing/BriefingSection';
import { CitationDrawer } from '@/components/briefing/CitationDrawer';
import { MeetingPrepCard } from '@/components/people/MeetingPrepCard';
import { LayoutDashboard, CheckCircle2, Loader2, Zap, RefreshCw } from 'lucide-react';
import type { Briefing, BriefingItem, BriefingItemSection, MeetingPrepData, SourceRef } from '@/lib/db/types';

interface BriefingResponse {
  briefing: (Briefing & { items: BriefingItem[] }) | null;
}

const SECTION_ORDER: BriefingItemSection[] = [
  'todays_schedule',
  'commitment_queue',
  'vip_inbox',
  'action_required',
  'awaiting_reply',
  'after_hours',
  'at_risk',
  'priority_inbox',
  'quick_wins',
  'decision_queue',
  'people_context',
];

/* Color tokens — dark theme */
const c = {
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.14)',
  brass: '#A89968',
  brassMuted: 'rgba(168,153,104,0.15)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.85)',
  textTertiary: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.35)',
  textGhost: 'rgba(255,255,255,0.2)',
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
            className="text-[26px] font-bold tracking-[-0.03em]"
            style={{ color: c.text }}
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
              style={{ background: c.brassMuted, border: `1px solid ${c.border}` }}
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
          className="text-[26px] font-bold tracking-[-0.03em]"
          style={{ color: c.text }}
        >
          Daily Briefing
        </h1>
        <div
          className="rounded-xl p-6 text-center"
          style={{
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.2)',
          }}
        >
          <p className="text-[13px]" style={{ color: '#F87171' }}>{error}</p>
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
          className="text-[26px] font-bold tracking-[-0.03em]"
          style={{ color: c.text }}
        >
          {getGreeting()}
        </h1>

        {/* Connected integrations status */}
        {hasConnectedIntegrations && (
          <div
            className="rounded-xl p-5"
            style={{ background: c.surface, border: `1px solid ${c.border}` }}
          >
            <p className="text-[12px] font-semibold tracking-[0.06em] uppercase mb-3" style={{ color: c.textMuted }}>
              Connected Sources
            </p>
            <div className="flex flex-wrap gap-2">
              {connectedIntegrations.map(i => (
                <span
                  key={i.provider}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium"
                  style={{ background: 'rgba(74,222,128,0.1)', color: '#4ADE80', border: '1px solid rgba(74,222,128,0.2)' }}
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
            style={{ background: c.brassMuted }}
          >
            <LayoutDashboard size={22} style={{ color: c.brass }} />
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
              className="mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-semibold transition-all duration-200 hover:shadow-[0_2px_12px_rgba(26,25,23,0.08)]"
              style={{
                background: '#A89968',
                color: '#0A0A0B',
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
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-[13px] font-semibold transition-all duration-200 hover:shadow-[0_2px_12px_rgba(26,25,23,0.08)]"
              style={{
                background: '#A89968',
                color: '#0A0A0B',
              }}
            >
              Connect integrations
            </a>
          )}

          {generateError && (
            <div
              className="mx-auto mt-4 max-w-md rounded-lg px-4 py-3 text-[12px] leading-relaxed"
              style={{
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.2)',
                color: '#F87171',
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

  const totalItems = briefing.items.length;
  const scheduleCount = grouped['todays_schedule']?.length ?? 0;
  const commitmentCount = grouped['commitment_queue']?.length ?? 0;
  const vipCount = grouped['vip_inbox']?.length ?? 0;
  const actionCount = grouped['action_required']?.length ?? 0;
  const awaitingCount = grouped['awaiting_reply']?.length ?? 0;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-[26px] font-bold tracking-[-0.03em]"
            style={{ color: c.text }}
          >
            {getGreeting()}
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: c.textMuted }}>
            {dateStr}
          </p>
        </div>
        <button
          onClick={handleGenerateBriefing}
          disabled={generating}
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-semibold transition-all duration-200"
          style={{
            background: generating ? c.brassMuted : c.surface,
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
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.2)',
            color: '#F87171',
          }}
        >
          {generateError}
        </div>
      )}

      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Meetings', value: scheduleCount },
          { label: 'VIP', value: vipCount },
          { label: 'Action', value: actionCount },
          { label: 'Awaiting', value: awaitingCount },
          { label: 'Commitments', value: commitmentCount },
          { label: 'Total', value: totalItems },
        ].filter(s => s.value > 0 || ['Meetings', 'Total'].includes(s.label)).slice(0, 4).map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl px-5 py-4"
            style={{
              background: c.surface,
              border: `1px solid ${c.border}`,
            }}
          >
            <p
              className="text-[11px] font-medium tracking-[0.08em] uppercase"
              style={{ color: c.textMuted }}
            >
              {label}
            </p>
            <p
              className="mt-1 text-[22px] font-bold tracking-tight tabular-nums"
              style={{ color: c.text }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-8 stagger-children">
        {SECTION_ORDER.map(section => {
          const items = grouped[section];
          if (!items || items.length === 0) return null;
          return (
            <div key={section}>
              <BriefingSection
                section={section}
                items={items}
                onFeedback={handleFeedback}
                onCitationClick={handleCitationClick}
              />
              {section === 'todays_schedule' && meetingPreps.length > 0 && (
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
          );
        })}
      </div>

      <CitationDrawer
        open={drawerItem !== null}
        onClose={() => setDrawerItem(null)}
        sourceRef={drawerItem?.source_ref ?? null}
        title={drawerItem?.title ?? ''}
      />
    </div>
  );
}
