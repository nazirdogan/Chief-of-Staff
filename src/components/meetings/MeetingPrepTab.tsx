'use client';

import { FileText, Mail, MessageSquare, File } from 'lucide-react';

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
  critical: '#D64B2A',
  success: '#52B788',
  info: '#4E7DAA',
};

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

interface MeetingPrepTabProps {
  prep:
    | {
        attendee_context: AttendeeContext[];
        related_context: RelatedContext[];
      }
    | undefined;
}

function providerIcon(provider: string) {
  const size = 14;
  const color = c.textMuted;
  switch (provider.toLowerCase()) {
    case 'gmail':
    case 'email':
      return <Mail size={size} color={color} />;
    case 'slack':
      return <MessageSquare size={size} color={color} />;
    case 'notion':
      return <FileText size={size} color={color} />;
    default:
      return <File size={size} color={color} />;
  }
}

export default function MeetingPrepTab({ prep }: MeetingPrepTabProps) {
  if (!prep) {
    return (
      <div
        className="rounded-xl py-12 text-center"
        style={{
          border: `1px dashed ${c.borderHover}`,
          background: c.surface,
        }}
      >
        <p className="text-[14px] font-medium" style={{ color: c.textTertiary }}>
          Meeting prep will be generated closer to the meeting time.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Attendee context cards */}
      {prep.attendee_context.map((attendee) => (
        <div
          key={attendee.email}
          className="rounded-xl p-4"
          style={{
            background: c.surface,
            border: `1px solid ${c.border}`,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[14px] font-semibold" style={{ color: c.text }}>
                {attendee.name || attendee.email}
              </p>
              {attendee.name && (
                <p className="text-[12px] mt-0.5" style={{ color: c.textMuted }}>
                  {attendee.email}
                </p>
              )}
            </div>
            {attendee.current_focus && (
              <span
                className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                style={{
                  background: c.dawnMuted,
                  color: c.dawn,
                  border: `1px solid ${c.dawnBorder}`,
                }}
              >
                {attendee.current_focus}
              </span>
            )}
          </div>

          <p
            className="text-[13px] leading-[1.6]"
            style={{ color: c.textSecondary }}
          >
            {attendee.recent_interactions}
          </p>

          {attendee.open_commitments.length > 0 && (
            <div className="mt-3">
              <p
                className="text-[11px] font-semibold uppercase tracking-wide mb-1.5"
                style={{ color: c.textMuted }}
              >
                Open Commitments
              </p>
              <ul className="flex flex-col gap-1">
                {attendee.open_commitments.map((commitment, i) => (
                  <li
                    key={i}
                    className="text-[13px] flex items-start gap-2"
                    style={{ color: c.textTertiary }}
                  >
                    <span style={{ color: c.dawn, marginTop: 2 }}>•</span>
                    {commitment}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}

      {/* Related context */}
      {prep.related_context.length > 0 && (
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-wide mb-2"
            style={{ color: c.textMuted }}
          >
            Related Context
          </p>
          <div className="flex flex-col gap-2">
            {prep.related_context.map((item, i) => (
              <div
                key={i}
                className="rounded-lg px-3 py-2.5 flex items-start gap-2.5"
                style={{
                  background: c.surface,
                  border: `1px solid ${c.border}`,
                }}
              >
                <div className="mt-0.5 shrink-0">{providerIcon(item.provider)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium" style={{ color: c.text }}>
                    {item.title}
                  </p>
                  <p
                    className="text-[12px] mt-0.5 line-clamp-2"
                    style={{ color: c.textTertiary }}
                  >
                    {item.content_summary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
