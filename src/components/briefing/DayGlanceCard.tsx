'use client';

import { useMemo } from 'react';
import { Calendar, Mail, Zap, Clock } from 'lucide-react';
import Link from 'next/link';

const c = {
  surface: 'rgba(45,45,45,0.04)',
  surfaceHover: 'rgba(45,45,45,0.06)',
  surfaceElevated: 'rgba(45,45,45,0.06)',
  border: 'rgba(45,45,45,0.08)',
  borderHover: 'rgba(45,45,45,0.16)',
  dawn: '#E8845C',
  dawnMuted: 'rgba(232,132,92,0.15)',
  dawnBorder: 'rgba(232,132,92,0.25)',
  text: '#2D2D2D',
  textSecondary: 'rgba(45,45,45,0.8)',
  textTertiary: 'rgba(45,45,45,0.6)',
  textMuted: 'rgba(45,45,45,0.5)',
  textGhost: 'rgba(45,45,45,0.4)',
  info: '#4E7DAA',
  success: '#52B788',
  critical: '#D64B2A',
  warning: '#F4C896',
};

interface DayGlanceCardProps {
  meetingsToday?: number;
  emailsNeedReply?: number;
  topProject?: string;
  responseTimeInsight?: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function DayGlanceCard({
  meetingsToday,
  emailsNeedReply,
  topProject,
  responseTimeInsight,
}: DayGlanceCardProps) {
  const greeting = useMemo(() => getGreeting(), []);
  const dateStr = useMemo(() => formatDate(), []);

  const stats = [
    meetingsToday != null && {
      icon: Calendar,
      label: `${meetingsToday} meeting${meetingsToday === 1 ? '' : 's'} today`,
    },
    emailsNeedReply != null && {
      icon: Mail,
      label: `${emailsNeedReply} email${emailsNeedReply === 1 ? '' : 's'} need reply`,
    },
    topProject != null && {
      icon: Zap,
      label: `${topProject} is your focus today`,
    },
    responseTimeInsight != null && {
      icon: Clock,
      label: responseTimeInsight,
    },
  ].filter(Boolean) as Array<{ icon: typeof Calendar; label: string }>;

  return (
    <div
      className="w-full rounded-xl p-6"
      style={{
        background: c.surfaceElevated,
        border: `1px solid ${c.border}`,
      }}
    >
      {/* Greeting */}
      <h2
        className="text-[15px] font-semibold tracking-[-0.01em]"
        style={{ color: c.text }}
      >
        {greeting}
      </h2>
      <p
        className="mt-0.5 text-[13px]"
        style={{ color: c.textTertiary }}
      >
        {dateStr}
      </p>

      {/* Stats */}
      {stats.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-2">
              <stat.icon size={14} style={{ color: c.textTertiary }} />
              <span
                className="text-[13px]"
                style={{ color: c.textSecondary }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Open Chat link */}
      <div className="mt-4 flex justify-end">
        <Link
          href="/chat"
          className="text-[13px] font-medium transition-opacity duration-200 hover:opacity-80"
          style={{ color: c.dawn }}
        >
          Open Chat →
        </Link>
      </div>
    </div>
  );
}
