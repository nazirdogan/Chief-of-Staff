'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Clock, MapPin, Video } from 'lucide-react';
import Link from 'next/link';
import AttendeeRow from './AttendeeRow';
import MeetingPrepTab from './MeetingPrepTab';
import MeetingSummaryTab from './MeetingSummaryTab';
import MeetingActionsTab from './MeetingActionsTab';

const c = {
  surface: 'rgba(255,255,255,0.04)',
  surfaceHover: 'rgba(255,255,255,0.06)',
  surfaceElevated: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.14)',
  dawn: '#E8845C',
  dawnMuted: 'rgba(232,132,92,0.15)',
  dawnBorder: 'rgba(232,132,92,0.25)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.85)',
  textTertiary: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.35)',
  textGhost: 'rgba(255,255,255,0.2)',
  critical: '#D64B2A',
  success: '#52B788',
  info: '#4E7DAA',
};

type TabKey = 'prep' | 'summary' | 'actions';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'prep', label: 'Prep' },
  { key: 'summary', label: 'Summary' },
  { key: 'actions', label: 'Actions' },
];

interface MeetingEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  meeting_link?: string;
  attendees: Array<{ email: string; name?: string }>;
  organizer?: { email: string; name?: string };
}

interface AttendeeContext {
  email: string;
  name?: string;
  recent_interactions: string;
  open_commitments: string[];
  current_focus?: string;
}

interface RelatedContext {
  title: string;
  provider: string;
  content_summary: string;
  source_ref: Record<string, unknown>;
}

interface MeetingPrep {
  attendee_context: AttendeeContext[];
  related_context: RelatedContext[];
}

interface MeetingSummary {
  narrative: string;
  key_decisions: Array<{ decision: string; context: string }>;
  open_questions: string[];
  source_provider?: string;
}

interface ActionItem {
  id: string;
  description: string;
  assignee?: string;
  assignee_is_user: boolean;
  deadline?: string;
  status: 'open' | 'completed';
}

interface MeetingContextData {
  event: MeetingEvent;
  prep?: MeetingPrep;
  summary?: MeetingSummary;
  action_items?: ActionItem[];
}

interface MeetingDetailPageProps {
  eventId: string;
}

function formatTimeRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const dateStr = startDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const startTime = startDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTime = endDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dateStr} · ${startTime} — ${endTime}`;
}

export default function MeetingDetailPage({ eventId }: MeetingDetailPageProps) {
  const [data, setData] = useState<MeetingContextData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('prep');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meetings/${eventId}/context`);
      if (!res.ok) throw new Error('Failed to load meeting context');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleAction = useCallback(
    (id: string) => {
      if (!data?.action_items) return;
      setData({
        ...data,
        action_items: data.action_items.map((item) =>
          item.id === id
            ? { ...item, status: item.status === 'open' ? 'completed' : 'open' }
            : item
        ),
      });
    },
    [data]
  );

  // Loading skeleton
  if (loading) {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif" }}>
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1.5 text-[13px] mb-6"
          style={{ color: c.textTertiary, textDecoration: 'none' }}
        >
          <ArrowLeft size={14} />
          Back to Calendar
        </Link>
        <div className="flex flex-col gap-3">
          <div
            className="h-6 w-2/3 rounded-md animate-pulse"
            style={{ background: c.dawnMuted }}
          />
          <div
            className="h-4 w-1/2 rounded-md animate-pulse"
            style={{ background: c.surface }}
          />
          <div
            className="h-8 w-40 rounded-md animate-pulse mt-2"
            style={{ background: c.surface }}
          />
          <div
            className="h-10 w-full rounded-md animate-pulse mt-4"
            style={{ background: c.surface }}
          />
          <div
            className="h-40 w-full rounded-md animate-pulse mt-2"
            style={{ background: c.surface }}
          />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif" }}>
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1.5 text-[13px] mb-6"
          style={{ color: c.textTertiary, textDecoration: 'none' }}
        >
          <ArrowLeft size={14} />
          Back to Calendar
        </Link>
        <div
          className="rounded-xl py-12 text-center"
          style={{
            border: `1px dashed ${c.borderHover}`,
            background: c.surface,
          }}
        >
          <p className="text-[14px] font-medium" style={{ color: c.critical }}>
            {error || 'Meeting not found'}
          </p>
        </div>
      </div>
    );
  }

  const { event, prep, summary, action_items } = data;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Back link */}
      <Link
        href="/calendar"
        className="inline-flex items-center gap-1.5 text-[13px] mb-6"
        style={{ color: c.textTertiary, textDecoration: 'none' }}
      >
        <ArrowLeft size={14} />
        Back to Calendar
      </Link>

      {/* Header */}
      <div className="mb-5">
        <h1
          className="text-[20px] font-semibold mb-1"
          style={{ color: c.text }}
        >
          {event.title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 mt-2">
          <span
            className="inline-flex items-center gap-1.5 text-[13px]"
            style={{ color: c.textTertiary }}
          >
            <Clock size={13} />
            {formatTimeRange(event.start_time, event.end_time)}
          </span>
          {event.location && (
            <span
              className="inline-flex items-center gap-1.5 text-[13px]"
              style={{ color: c.textTertiary }}
            >
              <MapPin size={13} />
              {event.location}
            </span>
          )}
          {event.meeting_link && (
            <a
              href={event.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-medium"
              style={{ color: c.info, textDecoration: 'none' }}
            >
              <Video size={13} />
              Join meeting
            </a>
          )}
        </div>
      </div>

      {/* Attendee row */}
      {event.attendees.length > 0 && (
        <div className="mb-6">
          <AttendeeRow attendees={event.attendees} />
        </div>
      )}

      {/* Tabs */}
      <div
        className="flex mb-5"
        style={{ borderBottom: `1px solid ${c.border}` }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="text-[13px] font-medium py-3 px-4"
            style={{
              background: 'none',
              border: 'none',
              borderBottom:
                activeTab === tab.key
                  ? `2px solid ${c.dawn}`
                  : '2px solid transparent',
              color: activeTab === tab.key ? c.text : c.textTertiary,
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'prep' && <MeetingPrepTab prep={prep} />}
      {activeTab === 'summary' && <MeetingSummaryTab summary={summary} />}
      {activeTab === 'actions' && (
        <MeetingActionsTab
          items={action_items ?? []}
          onToggle={handleToggleAction}
        />
      )}
    </div>
  );
}
