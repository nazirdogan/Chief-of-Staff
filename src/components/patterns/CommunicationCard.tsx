'use client';

import { Mail, MessageSquare, Calendar } from 'lucide-react';

const c = {
  bg: '#1B1F3A',
  surface: 'rgba(45,45,45,0.04)',
  surfaceHover: 'rgba(45,45,45,0.06)',
  surfaceElevated: 'rgba(45,45,45,0.06)',
  border: 'rgba(45,45,45,0.08)',
  borderHover: 'rgba(45,45,45,0.16)',
  dawn: '#E8845C',
  dawnLight: '#F09D7A',
  dawnMuted: 'rgba(232,132,92,0.15)',
  dawnBorder: 'rgba(232,132,92,0.25)',
  text: '#2D2D2D',
  textSecondary: 'rgba(45,45,45,0.8)',
  textTertiary: 'rgba(45,45,45,0.6)',
  textMuted: 'rgba(45,45,45,0.5)',
  textGhost: 'rgba(45,45,45,0.4)',
  critical: '#D64B2A',
  success: '#52B788',
  info: '#4E7DAA',
};

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function dayName(day: number | null): string {
  if (day === null) return '—';
  return DAY_NAMES[(day - 1) % 7] ?? `Day ${day}`;
}

function formatResponseTime(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hrs = minutes / 60;
  if (hrs < 24) return `${hrs.toFixed(1)} hrs`;
  return `${Math.round(hrs / 24)} days`;
}

interface CommunicationCardProps {
  avgEmailsPerDay: number;
  avgSlackMessagesPerDay: number;
  avgMeetingsPerDay: number;
  responseTimeP50Minutes: number | null;
  responseTimeP90Minutes: number | null;
  busiestDayOfWeek: number | null;
  quietestDayOfWeek: number | null;
}

export default function CommunicationCard({
  avgEmailsPerDay,
  avgSlackMessagesPerDay,
  avgMeetingsPerDay,
  responseTimeP50Minutes,
  responseTimeP90Minutes,
  busiestDayOfWeek,
  quietestDayOfWeek,
}: CommunicationCardProps) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: c.surface,
        border: `1px solid ${c.border}`,
      }}
    >
      <h3
        className="text-[11px] font-semibold tracking-[0.08em] uppercase mb-4"
        style={{ color: c.textMuted }}
      >
        Communication
      </h3>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="flex flex-col items-center gap-1">
          <Mail size={16} style={{ color: c.textTertiary }} />
          <span className="text-[22px] font-bold" style={{ color: c.dawn }}>
            {Math.round(avgEmailsPerDay)}
          </span>
          <span className="text-[11px] uppercase tracking-wide" style={{ color: c.textMuted }}>
            emails/day
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <MessageSquare size={16} style={{ color: c.textTertiary }} />
          <span className="text-[22px] font-bold" style={{ color: c.dawn }}>
            {Math.round(avgSlackMessagesPerDay)}
          </span>
          <span className="text-[11px] uppercase tracking-wide" style={{ color: c.textMuted }}>
            msgs/day
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Calendar size={16} style={{ color: c.textTertiary }} />
          <span className="text-[22px] font-bold" style={{ color: c.dawn }}>
            {avgMeetingsPerDay.toFixed(1)}
          </span>
          <span className="text-[11px] uppercase tracking-wide" style={{ color: c.textMuted }}>
            mtgs/day
          </span>
        </div>
      </div>

      <div
        className="rounded-lg p-3 mb-4"
        style={{ backgroundColor: c.surfaceElevated }}
      >
        <p className="text-[11px] uppercase tracking-wide mb-2" style={{ color: c.textMuted }}>
          Response Time
        </p>
        <div className="flex gap-6">
          <div>
            <span className="text-[13px] font-medium" style={{ color: c.textSecondary }}>
              Median:{' '}
            </span>
            <span className="text-[13px] font-bold" style={{ color: c.dawn }}>
              {formatResponseTime(responseTimeP50Minutes)}
            </span>
          </div>
          <div>
            <span className="text-[13px] font-medium" style={{ color: c.textSecondary }}>
              P90:{' '}
            </span>
            <span className="text-[13px] font-bold" style={{ color: c.textTertiary }}>
              {formatResponseTime(responseTimeP90Minutes)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide" style={{ color: c.textMuted }}>
            Busiest
          </p>
          <p className="text-[14px] font-semibold" style={{ color: c.textSecondary }}>
            {dayName(busiestDayOfWeek)}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide" style={{ color: c.textMuted }}>
            Quietest
          </p>
          <p className="text-[14px] font-semibold" style={{ color: c.textSecondary }}>
            {dayName(quietestDayOfWeek)}
          </p>
        </div>
      </div>
    </div>
  );
}
