import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS, FAKE_DATA } from '../../constants-v5';
import { Sidebar } from '../../components/Sidebar';

const SCENE = { start: 60, duration: 4 * 30 };

export const BriefingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 4, SCENE.duration - 3, SCENE.duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const items = FAKE_DATA.briefingItems.slice(0, 4);

  const getPriorityColor = (priority: string) => {
    if (priority === 'critical') return COLORS.red;
    if (priority === 'high') return COLORS.dawn;
    return 'transparent';
  };

  // Desktop frame floats in with 3D perspective — tilts from right
  const frameProgress = spring({ frame: rel, fps, config: { damping: 22, stiffness: 100 } });
  const frameRotY = interpolate(frameProgress, [0, 1], [8, 1.5]);
  const frameRotX = interpolate(frameProgress, [0, 1], [3, -0.5]);
  const frameScale = interpolate(frameProgress, [0, 1], [0.88, 0.78]);
  const frameY = interpolate(frameProgress, [0, 1], [30, 0]);

  // Slow drift during scene
  const driftRotY = interpolate(rel, [0, SCENE.duration], [1.5, -1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const driftRotX = interpolate(rel, [0, SCENE.duration], [-0.5, 0.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Overlay text — floats at different depth
  const textProgress = spring({ frame: rel - 8, fps, config: { damping: 20, stiffness: 100 } });

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity, perspective: 1400 }}>
      {/* Floating text overlay — parallax layer (closer to camera) */}
      <div style={{
        position: 'absolute', top: 46, left: '50%', zIndex: 200,
        transform: `translateX(-50%) translateZ(80px)`,
        display: 'flex', gap: 10, alignItems: 'baseline',
        opacity: textProgress,
      }}>
        <div style={{ fontSize: 22, fontFamily: '"DM Sans", sans-serif', fontWeight: 400, color: COLORS.textMuted, transform: `translateY(${interpolate(textProgress, [0, 1], [20, 0])}px)` }}>
          One briefing.
        </div>
        <div style={{ fontSize: 26, fontFamily: '"Playfair Display", serif', fontWeight: 700, fontStyle: 'italic', color: COLORS.dawn, opacity: interpolate(rel, [14, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), transform: `translateY(${interpolate(rel, [14, 20], [15, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)` }}>
          Everything ranked.
        </div>
      </div>

      {/* 3D floating desktop frame */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: `scale(${frameScale}) translateY(${frameY}px) rotateY(${driftRotY + frameRotY}deg) rotateX(${driftRotX + frameRotX}deg)`,
        transformStyle: 'preserve-3d',
      }}>
        <div style={{
          width: 1440, height: 900, borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 30px 100px rgba(0,0,0,0.2), 0 10px 40px rgba(0,0,0,0.1)',
          border: '1px solid rgba(0,0,0,0.08)', background: COLORS.parchment,
        }}>
          {/* Title bar */}
          <div style={{ height: 36, background: COLORS.linen, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', paddingLeft: 14, gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFBD2E' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 12, fontFamily: '"DM Sans", sans-serif', color: COLORS.textGhost, paddingRight: 14 }}>Donna</div>
          </div>
          <div style={{ display: 'flex', height: 'calc(100% - 36px)' }}>
            <Sidebar activeKey="today" />
            <div style={{ flex: 1, padding: '28px 36px', background: COLORS.parchment, overflow: 'hidden' }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 26, fontFamily: '"Playfair Display", serif', fontWeight: 300, color: COLORS.charcoal, letterSpacing: '-0.02em' }}>
                  Good morning, Sarah
                </div>
                <div style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: '"DM Sans", sans-serif', marginTop: 4 }}>
                  5 priorities · 2 meetings · 1 commitment due
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {items.map((item, i) => {
                  // Cards float up individually with slight Z-offset
                  const cardProgress = spring({ frame: rel - (10 + i * 6), fps, config: { damping: 18, stiffness: 120 } });
                  const cardY = interpolate(cardProgress, [0, 1], [40, 0]);
                  const cardRotX = interpolate(cardProgress, [0, 1], [8, 0]);
                  return (
                    <div key={i} style={{
                      opacity: cardProgress,
                      transform: `translateY(${cardY}px) rotateX(${cardRotX}deg)`,
                      transformOrigin: 'center bottom',
                      padding: '12px 16px', borderRadius: 10,
                      border: `1px solid ${COLORS.border}`,
                      borderLeft: `3px solid ${getPriorityColor(item.priority)}`,
                      background: COLORS.surface,
                      boxShadow: `0 ${interpolate(cardProgress, [0, 1], [0, 4])}px ${interpolate(cardProgress, [0, 1], [0, 16])}px rgba(0,0,0,0.04)`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: COLORS.dawnMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: COLORS.dawn, fontFamily: '"DM Sans", sans-serif', flexShrink: 0 }}>
                          {item.rank}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>
                          {item.title}
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: COLORS.textSecondary, fontFamily: '"DM Sans", sans-serif', lineHeight: 1.4, marginTop: 3, marginLeft: 30 }}>
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
