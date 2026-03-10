'use client';

import {
  Mail,
  MessageSquare,
  CalendarDays,
  CheckCircle,
  Circle,
} from 'lucide-react';

const c = {
  bg: '#1B1F3A',
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
  critical: '#D64B2A',
  success: '#52B788',
  info: '#4E7DAA',
};

export interface MemorySnapshot {
  snapshot_date: string;
  emails_received: number;
  emails_sent: number;
  slack_messages: number;
  meetings_attended: number;
  tasks_completed: number;
  documents_edited: number;
  code_prs_opened: number;
  day_narrative: string;
  key_decisions: string[];
  open_loops: string[];
  notable_interactions: string[];
}

interface MemoryDaySnapshotProps {
  snapshot: MemorySnapshot;
}

export function MemoryDaySnapshot({ snapshot }: MemoryDaySnapshotProps) {
  const stats = [
    { icon: Mail, label: 'Emails', value: snapshot.emails_received },
    { icon: MessageSquare, label: 'Slack', value: snapshot.slack_messages },
    { icon: CalendarDays, label: 'Meetings', value: snapshot.meetings_attended },
    { icon: CheckCircle, label: 'Tasks', value: snapshot.tasks_completed },
  ];

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: c.surfaceElevated,
        border: `1px solid ${c.border}`,
        borderLeft: `3px solid ${c.dawn}`,
      }}
    >
      <p
        className="text-[14px] leading-relaxed"
        style={{ color: c.textSecondary }}
      >
        {snapshot.day_narrative}
      </p>

      <div className="mt-4 flex flex-wrap gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-1.5">
            <stat.icon size={14} style={{ color: c.textMuted }} />
            <span className="text-[13px] font-medium" style={{ color: c.text }}>
              {stat.value}
            </span>
            <span className="text-[11px]" style={{ color: c.textMuted }}>
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {snapshot.key_decisions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {snapshot.key_decisions.map((decision) => (
            <span
              key={decision}
              className="rounded-full text-[10px] font-medium px-2.5 py-1"
              style={{
                backgroundColor: c.dawnMuted,
                color: c.dawn,
                border: `1px solid ${c.dawnBorder}`,
              }}
            >
              {decision}
            </span>
          ))}
        </div>
      )}

      {snapshot.open_loops.length > 0 && (
        <div className="mt-4">
          <p
            className="text-[11px] font-medium tracking-wide uppercase mb-2"
            style={{ color: c.textMuted }}
          >
            Open Loops
          </p>
          <ul className="flex flex-col gap-1.5">
            {snapshot.open_loops.map((loop) => (
              <li key={loop} className="flex items-start gap-2">
                <Circle
                  size={6}
                  style={{
                    color: c.textGhost,
                    marginTop: 6,
                    flexShrink: 0,
                  }}
                />
                <span className="text-[12px]" style={{ color: c.textTertiary }}>
                  {loop}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
