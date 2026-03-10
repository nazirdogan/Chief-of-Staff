import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../constants-v6';

const SCENE = { start: 60, duration: 4 * 30 };

const items = [
  'Follow up on Meridian partnership',
  'Q1 board deck review with David',
  'Respond to Lina — Dubai timeline',
  'Review onboarding mockups',
  'Prepare investor talking points',
];

export const BriefingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 5, SCENE.duration - 4, SCENE.duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Section label
  const labelP = spring({ frame: rel - 3, fps, config: { damping: 22, stiffness: 100 } });

  // Heading
  const headP = spring({ frame: rel - 8, fps, config: { damping: 20, stiffness: 90 } });

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 700, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Section label */}
        <div style={{
          fontSize: 11, fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: COLORS.dawn,
          textTransform: 'uppercase', letterSpacing: '0.12em',
          opacity: labelP, transform: `translateY(${interpolate(labelP, [0, 1], [10, 0])}px)`,
        }}>
          Daily Briefing
        </div>

        {/* Hero heading */}
        <div style={{
          fontSize: 38, fontFamily: '"Playfair Display", serif', fontWeight: 300, color: COLORS.charcoal,
          lineHeight: 1.2, letterSpacing: '-0.02em',
          opacity: headP, transform: `translateY(${interpolate(headP, [0, 1], [20, 0])}px)`,
        }}>
          Good morning, Sarah.<br />
          <span style={{ fontWeight: 700, fontStyle: 'italic', color: COLORS.dawn }}>5 things</span> need your attention.
        </div>

        {/* Floating priority cards — minimal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((item, i) => {
            const cardP = spring({ frame: rel - (16 + i * 5), fps, config: { damping: 20, stiffness: 100 } });
            return (
              <div key={i} style={{
                opacity: cardP,
                transform: `translateX(${interpolate(cardP, [0, 1], [40, 0])}px)`,
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0',
                borderBottom: i < items.length - 1 ? `1px solid ${COLORS.border}` : 'none',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  border: `1.5px solid ${i < 2 ? COLORS.dawn : COLORS.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 600, color: i < 2 ? COLORS.dawn : COLORS.textMuted,
                  fontFamily: '"DM Sans", sans-serif',
                }}>
                  {i + 1}
                </div>
                <div style={{
                  fontSize: 15, fontFamily: '"DM Sans", sans-serif', fontWeight: i < 2 ? 600 : 400,
                  color: i < 2 ? COLORS.charcoal : COLORS.textSecondary,
                }}>
                  {item}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
