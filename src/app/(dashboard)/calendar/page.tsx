'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Users } from 'lucide-react';

const c = {
  surface: 'var(--surface)',
  surfaceHover: 'var(--surface-hover)',
  border: 'var(--border)',
  borderHover: 'var(--border)',
  dawn: '#E8845C',
  dawnMuted: 'rgba(232,132,92,0.15)',
  text: 'var(--foreground)',
  textSecondary: 'var(--foreground-secondary)',
  textTertiary: 'var(--foreground-tertiary)',
  textMuted: 'var(--foreground-quaternary)',
};

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string | null;
  attendees?: Array<{ email: string; name: string; responseStatus: string }>;
  isAllDay?: boolean;
  provider?: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateHeader(date: Date) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function toDateParam(date: Date) {
  return date.toISOString().split('T')[0];
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const fetchEvents = useCallback(async (date: Date) => {
    setLoading(true);
    setEvents([]);
    setError(null);
    try {
      const res = await fetch(`/api/calendar?date=${toDateParam(date)}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data.events ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(selectedDate);
  }, [fetchEvents, selectedDate]);

  function goDay(delta: number) {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + delta);
    setSelectedDate(next);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold" style={{ color: c.text }}>
            Calendar
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: c.textMuted }}>
            {formatDateHeader(selectedDate)}
          </p>
        </div>

        {/* Day navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => goDay(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-all"
            style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textTertiary }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.borderHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all"
            style={{ background: c.dawnMuted, color: c.dawn, border: `1px solid rgba(232,132,92,0.25)` }}
          >
            Today
          </button>
          <button
            onClick={() => goDay(1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-all"
            style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textTertiary }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.borderHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl" style={{ background: c.surface }} />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div
          className="rounded-xl p-6 text-center"
          style={{ background: 'rgba(214,75,42,0.08)', border: '1px solid rgba(214,75,42,0.2)' }}
        >
          <p className="text-[14px]" style={{ color: '#D64B2A' }}>{error}</p>
          <button
            onClick={() => fetchEvents(selectedDate)}
            className="mt-3 text-[13px] underline"
            style={{ color: c.textTertiary }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && events.length === 0 && (
        <div
          className="rounded-xl p-10 text-center"
          style={{ background: c.surface, border: `1px dashed ${c.border}` }}
        >
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: c.dawnMuted }}
          >
            <Calendar size={22} style={{ color: c.dawn }} />
          </div>
          <p className="text-[14px] font-semibold" style={{ color: c.text }}>
            No events {formatDateHeader(selectedDate).toLowerCase()}
          </p>
          <p className="mt-2 text-[13px]" style={{ color: c.textMuted }}>
            Connect your Google Calendar or Outlook in{' '}
            <Link href="/settings/integrations" className="underline" style={{ color: c.dawn }}>
              Settings
            </Link>
            .
          </p>
        </div>
      )}

      {/* Events list */}
      {!loading && !error && events.length > 0 && (
        <div className="space-y-2">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/calendar/${event.id}`}
              className="group flex items-center gap-4 rounded-xl px-4 py-3 transition-all"
              style={{ background: c.surface, border: `1px solid ${c.border}` }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = c.surfaceHover;
                e.currentTarget.style.borderColor = c.borderHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = c.surface;
                e.currentTarget.style.borderColor = c.border;
              }}
            >
              {/* Time */}
              {event.isAllDay ? (
                <div className="shrink-0 text-right" style={{ minWidth: 72 }}>
                  <p className="text-[12px] font-medium" style={{ color: c.dawn }}>All day</p>
                </div>
              ) : (
                <div className="shrink-0 text-right" style={{ minWidth: 72 }}>
                  <p className="text-[13px] font-medium" style={{ color: c.dawn }}>
                    {formatTime(event.start)}
                  </p>
                  <p className="text-[11px]" style={{ color: c.textMuted }}>
                    {formatTime(event.end)}
                  </p>
                </div>
              )}

              <div className="h-8 w-px shrink-0" style={{ background: c.border }} />

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-[14px] font-medium" style={{ color: c.text }}>
                  {event.summary}
                </p>
                <div className="mt-0.5 flex items-center gap-3">
                  {event.location && (
                    <span className="flex items-center gap-1 text-[12px]" style={{ color: c.textMuted }}>
                      <MapPin size={11} />
                      <span className="truncate max-w-[160px]">{event.location}</span>
                    </span>
                  )}
                  {event.attendees && event.attendees.length > 0 && (
                    <span className="flex items-center gap-1 text-[12px]" style={{ color: c.textMuted }}>
                      <Users size={11} />
                      {event.attendees.length}
                    </span>
                  )}
                  {!event.isAllDay && (
                    <span className="flex items-center gap-1 text-[12px]" style={{ color: c.textMuted }}>
                      <Clock size={11} />
                      {Math.round(
                        (new Date(event.end).getTime() - new Date(event.start).getTime()) / 60000
                      )}m
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight
                size={16}
                className="shrink-0 opacity-0 group-hover:opacity-40 transition-opacity"
                style={{ color: c.textMuted }}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
