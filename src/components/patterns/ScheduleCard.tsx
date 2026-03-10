'use client';

import { Clock, Sun, Moon } from 'lucide-react';

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

function dayName(day: number): string {
  return DAY_NAMES[(day - 1) % 7] ?? `Day ${day}`;
}

function formatTime12h(time: string): string {
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr ?? '0', 10);
  const m = mStr ?? '00';
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m} ${period}`;
}

interface ScheduleCardProps {
  startTime: string | null;
  endTime: string | null;
  peakHours: Array<{ hour: number; activity_score: number }>;
  deepWorkWindows: Array<{ start: string; end: string; day: number }>;
}

export default function ScheduleCard({
  startTime,
  endTime,
  peakHours,
  deepWorkWindows,
}: ScheduleCardProps) {
  const topPeakHours = [...peakHours]
    .sort((a, b) => b.activity_score - a.activity_score)
    .slice(0, 3);

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
        Typical Schedule
      </h3>

      <div className="flex items-center gap-6 mb-5">
        {startTime && (
          <div className="flex items-center gap-2">
            <Sun size={14} style={{ color: c.dawn }} />
            <div>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: c.textMuted }}>
                Start
              </p>
              <p className="text-[18px] font-bold" style={{ color: c.dawn }}>
                {formatTime12h(startTime)}
              </p>
            </div>
          </div>
        )}
        {endTime && (
          <div className="flex items-center gap-2">
            <Moon size={14} style={{ color: c.textTertiary }} />
            <div>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: c.textMuted }}>
                End
              </p>
              <p className="text-[18px] font-bold" style={{ color: c.textSecondary }}>
                {formatTime12h(endTime)}
              </p>
            </div>
          </div>
        )}
      </div>

      {topPeakHours.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-wide mb-2" style={{ color: c.textMuted }}>
            Peak Hours
          </p>
          <div className="flex flex-wrap gap-2">
            {topPeakHours.map((ph) => (
              <span
                key={ph.hour}
                className="px-2.5 py-1 rounded-md text-[12px] font-medium"
                style={{
                  backgroundColor: c.dawnMuted,
                  color: c.dawn,
                  border: `1px solid ${c.dawnBorder}`,
                }}
              >
                {formatTime12h(`${ph.hour}:00`)}
              </span>
            ))}
          </div>
        </div>
      )}

      {deepWorkWindows.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wide mb-2" style={{ color: c.textMuted }}>
            Deep Work Windows
          </p>
          <div className="flex flex-col gap-1.5">
            {deepWorkWindows.map((dw, i) => (
              <div key={i} className="flex items-center gap-2">
                <Clock size={12} style={{ color: c.textTertiary }} />
                <span className="text-[13px]" style={{ color: c.textSecondary }}>
                  {dayName(dw.day)} {formatTime12h(dw.start)} – {formatTime12h(dw.end)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
