import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS, FAKE_DATA } from '../../constants-v3';
import { DesktopFrame } from '../../components/DesktopFrame';
import { Sidebar } from '../../components/Sidebar';

const SCENE = { start: 120, duration: 7 * 30 };

export const BriefingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 3, SCENE.duration - 3, SCENE.duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const items = FAKE_DATA.briefingItems.slice(0, 5);

  const getPriorityColor = (priority: string) => {
    if (priority === 'critical') return COLORS.red;
    if (priority === 'high') return COLORS.dawn;
    return 'transparent';
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity }}>
      {/* Kinetic overlay */}
      <div style={{ position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 200, display: 'flex', gap: 10, alignItems: 'baseline' }}>
        <div style={{ fontSize: 22, fontFamily: '"DM Sans", sans-serif', fontWeight: 400, color: COLORS.textMuted, opacity: interpolate(rel, [10, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          One briefing.
        </div>
        <div style={{ fontSize: 26, fontFamily: '"Playfair Display", serif', fontWeight: 700, fontStyle: 'italic', color: COLORS.dawn, opacity: interpolate(rel, [18, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), transform: `scale(${interpolate(rel, [18, 24], [1.3, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})` }}>
          Everything ranked.
        </div>
      </div>

      <DesktopFrame scale={0.82}>
        <Sidebar activeKey="today" />
        <div style={{ flex: 1, padding: '28px 36px', background: COLORS.parchment, overflow: 'hidden' }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 26, fontFamily: '"Playfair Display", serif', fontWeight: 300, color: COLORS.charcoal, letterSpacing: '-0.02em' }}>
              Good morning, Sarah
            </div>
            <div style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: '"DM Sans", sans-serif', marginTop: 4 }}>
              5 priorities · 2 meetings · 1 commitment due
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map((item, i) => {
              const s = spring({ frame: rel - (20 + i * 7), fps, config: { damping: 10, stiffness: 250 } });
              return (
                <div key={i} style={{
                  opacity: s, transform: `translateX(${interpolate(s, [0, 1], [60, 0])}px)`,
                  padding: '14px 18px', borderRadius: 10,
                  border: `1px solid ${COLORS.border}`,
                  borderLeft: `3px solid ${getPriorityColor(item.priority)}`,
                  background: COLORS.surface,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: COLORS.dawnMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: COLORS.dawn, fontFamily: '"DM Sans", sans-serif', flexShrink: 0 }}>
                      {item.rank}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>
                      {item.title}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.textSecondary, fontFamily: '"DM Sans", sans-serif', lineHeight: 1.4, marginTop: 4, marginLeft: 30 }}>
                    {item.summary}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DesktopFrame>
    </div>
  );
};
