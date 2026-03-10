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

interface CollaboratorsCardProps {
  collaborators: Array<{ email: string; interaction_count: number; channels: string[] }>;
}

function getInitials(email: string): string {
  const username = email.split('@')[0] ?? '';
  const parts = username.split(/[._-]/);
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  return (username.slice(0, 2) ?? '').toUpperCase();
}

function ChannelIcon({ channel }: { channel: string }) {
  const iconProps = { size: 12, style: { color: c.textTertiary } };
  switch (channel.toLowerCase()) {
    case 'email':
      return <Mail {...iconProps} />;
    case 'slack':
      return <MessageSquare {...iconProps} />;
    case 'calendar':
      return <Calendar {...iconProps} />;
    default:
      return null;
  }
}

export default function CollaboratorsCard({ collaborators }: CollaboratorsCardProps) {
  if (collaborators.length === 0) return null;

  const displayed = collaborators.slice(0, 10);

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
        Top Collaborators
      </h3>

      <div className="flex flex-col gap-2">
        {displayed.map((collab) => (
          <div
            key={collab.email}
            className="flex items-center gap-3 py-1.5"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: c.dawnMuted }}
            >
              <span className="text-[11px] font-bold" style={{ color: c.dawn }}>
                {getInitials(collab.email)}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p
                className="text-[13px] truncate"
                style={{ color: c.textSecondary }}
              >
                {collab.email}
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {collab.channels.map((ch) => (
                <ChannelIcon key={ch} channel={ch} />
              ))}
            </div>

            <span
              className="text-[12px] font-medium flex-shrink-0 ml-1"
              style={{ color: c.textTertiary }}
            >
              {collab.interaction_count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
