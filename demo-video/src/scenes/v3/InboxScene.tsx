import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS, FAKE_DATA } from '../../constants-v3';
import { DesktopFrame } from '../../components/DesktopFrame';
import { Sidebar } from '../../components/Sidebar';

const SCENE = { start: 540, duration: 7 * 30 };

export const InboxScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 3, SCENE.duration - 3, SCENE.duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const items = FAKE_DATA.inboxItems;

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity }}>
      {/* Kinetic overlay */}
      <div style={{ position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 200, display: 'flex', gap: 10, alignItems: 'baseline' }}>
        <div style={{ fontSize: 22, fontFamily: '"DM Sans", sans-serif', fontWeight: 400, color: COLORS.textMuted, opacity: interpolate(rel, [10, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          Your inbox,
        </div>
        <div style={{ fontSize: 26, fontFamily: '"Playfair Display", serif', fontWeight: 700, fontStyle: 'italic', color: COLORS.dawn, opacity: interpolate(rel, [18, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), transform: `scale(${interpolate(rel, [18, 24], [1.3, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})` }}>
          unified.
        </div>
      </div>

      <DesktopFrame scale={0.82}>
        <Sidebar activeKey="inbox" />
        <div style={{ flex: 1, padding: '28px 36px', background: COLORS.parchment, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.dawn} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>
            <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>Inbox</span>
          </div>
          <div style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: '"DM Sans", sans-serif', marginBottom: 12 }}>
            Unified view across all connected channels
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[
              { count: 5, label: 'total', color: COLORS.dawn },
              { count: 2, label: 'unread', color: COLORS.steel },
              { count: 2, label: 'needs reply', color: COLORS.red },
            ].map((stat, i) => (
              <div key={i} style={{ padding: '4px 10px', border: '1px solid rgba(232,132,92,0.15)', background: COLORS.dawnMuted, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: stat.color, fontFamily: '"DM Sans", sans-serif' }}>{stat.count}</span>
                <span style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: '"DM Sans", sans-serif' }}>{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Inbox items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {items.map((item, i) => {
              const s = spring({ frame: rel - (15 + i * 6), fps, config: { damping: 10, stiffness: 250 } });
              return (
                <div key={i} style={{
                  opacity: s, transform: `translateX(${interpolate(s, [0, 1], [50, 0])}px)`,
                  padding: '10px 14px', borderRadius: 10,
                  border: `1px solid ${COLORS.border}`,
                  background: item.unread ? 'rgba(45,45,45,0.02)' : COLORS.surface,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {item.unread && <div style={{ width: 5, height: 5, borderRadius: '50%', background: COLORS.steel }} />}
                      <span style={{ fontSize: 12, fontWeight: item.unread ? 600 : 500, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>{item.from}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {item.priority && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: item.priority === 'P1' ? 'rgba(214,75,42,0.12)' : 'rgba(201,134,42,0.12)', color: item.priority === 'P1' ? COLORS.red : COLORS.gold, fontFamily: '"JetBrains Mono", monospace' }}>{item.priority}</span>}
                      <span style={{ fontSize: 9, color: COLORS.textGhost, fontFamily: '"JetBrains Mono", monospace' }}>{item.time}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.textSecondary, fontFamily: '"DM Sans", sans-serif' }}>{item.subject}</div>
                  <div style={{ fontSize: 10, color: COLORS.textTertiary, fontFamily: '"DM Sans", sans-serif', marginTop: 2 }}>{item.summary}</div>
                </div>
              );
            })}
          </div>
        </div>
      </DesktopFrame>
    </div>
  );
};
