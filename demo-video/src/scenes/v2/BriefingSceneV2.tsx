import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS, SCENES, FAKE_DATA } from '../../constants-v2';
import { DesktopFrame } from '../../components/DesktopFrame';
import { Sidebar } from '../../components/Sidebar';

export const BriefingSceneV2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { start, duration } = SCENES.briefing;
  const rel = frame - start;

  if (rel < 0 || rel >= duration) return null;

  // Hard cut in, fast cut out
  const opacity = interpolate(rel, [0, 3, duration - 3, duration], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Desktop frame scales up from slightly small
  const frameScale = spring({ frame: rel, fps, config: { damping: 15, stiffness: 200 } });
  const scale = interpolate(frameScale, [0, 1], [0.92, 0.82]);

  const items = FAKE_DATA.briefingItems.slice(0, 4);

  const getPriorityColor = (priority: string) => {
    if (priority === 'critical') return COLORS.red;
    if (priority === 'high') return COLORS.dawn;
    return 'transparent';
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity }}>
      {/* Kinetic text overlay */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 200,
          display: 'flex',
          gap: 10,
          alignItems: 'baseline',
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontFamily: '"DM Sans", sans-serif',
            fontWeight: 400,
            color: COLORS.textMuted,
            opacity: interpolate(rel, [12, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            transform: `translateY(${interpolate(rel, [12, 18], [10, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`,
          }}
        >
          Donna already
        </div>
        <div
          style={{
            fontSize: 26,
            fontFamily: '"Playfair Display", serif',
            fontWeight: 700,
            fontStyle: 'italic',
            color: COLORS.dawn,
            opacity: interpolate(rel, [18, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            transform: `scale(${interpolate(rel, [18, 24], [1.3, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})`,
          }}
        >
          read everything.
        </div>
      </div>

      <div style={{ transform: `scale(${scale})`, position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 1440, height: 900, borderRadius: 12, overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.25)', border: '1px solid rgba(0,0,0,0.12)', background: COLORS.parchment }}>
          <div style={{ height: 36, background: COLORS.linen, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', paddingLeft: 14, gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFBD2E' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
          </div>
          <div style={{ display: 'flex', height: 'calc(100% - 36px)' }}>
            <Sidebar activeKey="today" />
            <div style={{ flex: 1, padding: '28px 36px', background: COLORS.parchment, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 26, fontFamily: '"Playfair Display", serif', fontWeight: 300, color: COLORS.charcoal, letterSpacing: '-0.02em' }}>
                  Good morning, Sarah
                </div>
                <div style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: '"DM Sans", sans-serif', marginTop: 4 }}>
                  5 priorities · 2 meetings · 1 commitment due
                </div>
              </div>

              {/* Items slam in one by one */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map((item, i) => {
                  const itemSpring = spring({ frame: rel - (20 + i * 8), fps, config: { damping: 10, stiffness: 250 } });
                  const itemX = interpolate(itemSpring, [0, 1], [60, 0]);
                  const itemOp = itemSpring;

                  return (
                    <div
                      key={i}
                      style={{
                        opacity: itemOp,
                        transform: `translateX(${itemX}px)`,
                        padding: '14px 18px',
                        borderRadius: 10,
                        border: `1px solid ${COLORS.border}`,
                        borderLeft: `3px solid ${getPriorityColor(item.priority)}`,
                        background: COLORS.surface,
                      }}
                    >
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
          </div>
        </div>
      </div>
    </div>
  );
};
