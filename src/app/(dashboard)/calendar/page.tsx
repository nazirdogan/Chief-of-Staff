'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Video,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const c = {
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.14)',
  dawn: '#E8845C',
  dawnMuted: 'rgba(232,132,92,0.15)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.85)',
  textTertiary: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.35)',
  blue: '#4E7DAA',
  green: '#52B788',
};

interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  start: string;
  end: string;
  location: string;
  meetingLink: string;
  attendees: Array<{ email: string; name: string; responseStatus: string }>;
  organizer: { email: string; name: string };
  isAllDay: boolean;
  provider: string;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date());
  const [integrations, setIntegrations] = useState<Array<{ provider: string; status: string }>>([]);

  const dateStr = date.toISOString().split('T')[0];

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar?date=${dateStr}`);
      if (!res.ok) throw new Error('Failed to fetch calendar');
      const data = await res.json();
      setEvents(data.events ?? []);
    } catch {
      toast.error('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetch('/api/integrations')
      .then((r) => r.json())
      .then((data) => setIntegrations(data.integrations ?? []))
      .catch(() => {});
  }, []);

  function prevDay() {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d);
  }

  function nextDay() {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    setDate(d);
  }

  function goToday() {
    setDate(new Date());
  }

  const isToday = dateStr === new Date().toISOString().split('T')[0];

  const hasCalendarIntegration = integrations.some(
    (i) => ['google_calendar', 'microsoft_calendar'].includes(i.provider) && i.status === 'connected'
  );

  const allDayEvents = events.filter((e) => e.isAllDay);
  const timedEvents = events.filter((e) => !e.isAllDay);

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function getDuration(start: string, end: string): string {
    const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
  }

  function isNow(start: string, end: string): boolean {
    const now = Date.now();
    return now >= new Date(start).getTime() && now <= new Date(end).getTime();
  }

  const dayLabel = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <CalendarIcon size={20} color={c.dawn} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: c.text, margin: 0 }}>Calendar</h1>
        </div>
        <p style={{ fontSize: 13, color: c.textTertiary, margin: 0 }}>
          Your schedule from connected calendars
        </p>
      </div>

      {/* Date navigation */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, padding: '10px 16px', borderRadius: 10,
        background: c.surface, border: `1px solid ${c.border}`,
      }}>
        <button onClick={prevDay} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textTertiary, padding: 4 }}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{dayLabel}</span>
          {!isToday && (
            <button
              onClick={goToday}
              style={{
                marginLeft: 8, fontSize: 11, color: c.dawn, background: 'none',
                border: `1px solid ${c.dawn}40`, borderRadius: 4, padding: '2px 8px',
                cursor: 'pointer', fontWeight: 500,
              }}
            >
              Today
            </button>
          )}
        </div>
        <button onClick={nextDay} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textTertiary, padding: 4 }}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 80, borderRadius: 10, background: c.dawnMuted, border: `1px solid ${c.border}` }} className="animate-pulse" />
          ))}
        </div>
      ) : !hasCalendarIntegration && events.length === 0 ? (
        <div style={{
          padding: 48, textAlign: 'center', borderRadius: 12,
          border: `1px dashed ${c.borderHover}`, background: c.surface,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            background: c.dawnMuted,
          }}>
            <CalendarIcon size={22} color={c.dawn} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: c.text }}>Connect your calendar</p>
          <p style={{ fontSize: 13, color: c.textTertiary, marginTop: 4, maxWidth: 320, margin: '4px auto 0' }}>
            Connect Google Calendar or Outlook in Settings to see your schedule here.
          </p>
          <a
            href="/settings/integrations"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16,
              padding: '8px 20px', borderRadius: 8, background: '#E8845C', color: '#1B1F3A',
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}
          >
            Connect integrations
          </a>
        </div>
      ) : events.length === 0 ? (
        <div style={{
          padding: 48, textAlign: 'center', borderRadius: 12,
          border: `1px dashed ${c.borderHover}`, background: c.surface,
        }}>
          <CalendarIcon size={22} color={c.textMuted} style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, fontWeight: 500, color: c.textTertiary }}>
            No events scheduled for {isToday ? 'today' : dayLabel}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* All-day events */}
          {allDayEvents.length > 0 && (
            <div style={{
              padding: '10px 14px', borderRadius: 10,
              background: `${c.dawn}08`, border: `1px solid ${c.dawn}20`,
              marginBottom: 4,
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: c.dawn, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                All Day
              </span>
              {allDayEvents.map((event) => (
                <div key={event.id} style={{ fontSize: 13, color: c.text, marginTop: 4 }}>
                  {event.summary}
                </div>
              ))}
            </div>
          )}

          {/* Timed events */}
          {timedEvents.map((event) => {
            const current = isNow(event.start, event.end);
            return (
              <div
                key={event.id}
                style={{
                  padding: '14px 16px', borderRadius: 10,
                  border: `1px solid ${current ? `${c.blue}40` : c.border}`,
                  background: current ? `${c.blue}05` : c.surface,
                  position: 'relative',
                }}
              >
                {current && (
                  <div style={{
                    position: 'absolute', left: 0, top: 12, bottom: 12,
                    width: 3, borderRadius: 2, background: c.blue,
                  }} />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>
                      {event.summary}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: c.textTertiary }}>
                        <Clock size={11} />
                        {formatTime(event.start)} — {formatTime(event.end)}
                      </span>
                      <span style={{ fontSize: 11, color: c.textMuted }}>
                        ({getDuration(event.start, event.end)})
                      </span>
                    </div>
                    {event.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: c.textTertiary, marginTop: 4 }}>
                        <MapPin size={11} />
                        {event.location}
                      </div>
                    )}
                    {event.meetingLink && (
                      <a
                        href={event.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11,
                          color: c.blue, marginTop: 4, textDecoration: 'none',
                        }}
                      >
                        <Video size={11} />
                        Join meeting
                      </a>
                    )}
                  </div>
                  {event.attendees.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: 12 }}>
                      <Users size={12} color={c.textMuted} />
                      <span style={{ fontSize: 11, color: c.textMuted }}>
                        {event.attendees.length}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
