import React from 'react';
import { COLORS, NAV_ITEMS, FAKE_DATA } from '../constants';

interface SidebarProps {
  activeKey: string;
}

const NavIcon: React.FC<{ icon: string; active: boolean }> = ({ icon, active }) => {
  const color = active ? COLORS.dawn : COLORS.slate;
  const opacity = active ? 1 : 0.55;

  // Simple SVG icons matching lucide-react
  const icons: Record<string, React.ReactNode> = {
    MessageCircle: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity }}>
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      </svg>
    ),
    LayoutDashboard: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity }}>
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
    Inbox: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity }}>
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
    ),
    CheckCircle2: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity }}>
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    Users: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity }}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    BookOpen: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity }}>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
    Settings: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity }}>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  };

  return <>{icons[icon] || null}</>;
};

export const Sidebar: React.FC<SidebarProps> = ({ activeKey }) => {
  return (
    <div
      style={{
        width: 220,
        minWidth: 220,
        height: '100%',
        background: COLORS.linen,
        borderRight: `1px solid ${COLORS.border}`,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      {/* Brand */}
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 20,
          paddingRight: 20,
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            fontFamily: '"Playfair Display", serif',
            color: COLORS.charcoal,
          }}
        >
          Donna<span style={{ color: COLORS.dawn }}>.</span>
        </span>
      </div>

      {/* Navigation */}
      <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <div
              key={item.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                background: isActive ? COLORS.dawnSubtle : 'transparent',
                border: isActive ? `1px solid ${COLORS.dawnBorder}` : '1px solid transparent',
                color: isActive ? COLORS.charcoal : COLORS.slate,
              }}
            >
              <NavIcon icon={item.icon} active={isActive} />
              {item.label}
            </div>
          );
        })}
      </div>

      {/* Recent Chats */}
      <div style={{ padding: '16px 8px 0', flex: 1 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color: 'rgba(141,153,174,0.5)',
            fontFamily: '"JetBrains Mono", monospace',
            padding: '0 12px',
            marginBottom: 6,
          }}
        >
          RECENT CHATS
        </div>
        {FAKE_DATA.recentChats.map((chat, i) => (
          <div
            key={i}
            style={{
              fontSize: 12,
              color: COLORS.textMuted,
              padding: '6px 12px',
              borderRadius: 6,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {chat}
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div
        style={{
          borderTop: `1px solid ${COLORS.border}`,
          padding: '10px 8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            color: COLORS.slate,
          }}
        >
          <NavIcon icon="Settings" active={false} />
          Settings
        </div>
        <div
          style={{
            fontSize: 11,
            color: COLORS.textGhost,
            padding: '6px 12px',
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          {'\u2318'}K to search anything
        </div>
      </div>
    </div>
  );
};
