'use client';

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

interface AttendeeRowProps {
  attendees: Array<{ email: string; name?: string }>;
  maxShow?: number;
}

function getInitial(attendee: { email: string; name?: string }): string {
  if (attendee.name && attendee.name.trim().length > 0) {
    return attendee.name.trim()[0].toUpperCase();
  }
  const username = attendee.email.split('@')[0];
  return username.length > 0 ? username[0].toUpperCase() : '?';
}

function getDisplayName(attendee: { email: string; name?: string }): string {
  return attendee.name && attendee.name.trim().length > 0
    ? attendee.name.trim()
    : attendee.email;
}

export default function AttendeeRow({ attendees, maxShow = 5 }: AttendeeRowProps) {
  const visible = attendees.slice(0, maxShow);
  const overflow = attendees.length - maxShow;

  return (
    <div className="flex items-center gap-[-4px]" style={{ display: 'flex', alignItems: 'center' }}>
      {visible.map((attendee, i) => (
        <div
          key={attendee.email}
          title={getDisplayName(attendee)}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: c.dawnMuted,
            marginLeft: i > 0 ? -4 : 0,
            border: `1.5px solid rgba(10,10,11,1)`,
            zIndex: maxShow - i,
            position: 'relative',
          }}
        >
          <span
            className="text-[11px] font-bold select-none"
            style={{ color: c.dawn }}
          >
            {getInitial(attendee)}
          </span>
        </div>
      ))}
      {overflow > 0 && (
        <span
          className="text-[11px] font-medium ml-2 shrink-0"
          style={{ color: c.textTertiary }}
        >
          +{overflow} more
        </span>
      )}
    </div>
  );
}
