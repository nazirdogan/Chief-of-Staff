import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../constants-v6';

const SCENE = { start: 0, duration: 2 * 30 };

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const cutOut = interpolate(rel, [SCENE.duration - 4, SCENE.duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const logoP = spring({ frame: rel, fps, config: { damping: 20, stiffness: 100 } });
  const subP = spring({ frame: rel - 12, fps, config: { damping: 22, stiffness: 90 } });

  // Subtle accent line draws under logo
  const lineW = interpolate(rel, [15, 40], [0, 120], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.charcoal, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: cutOut }}>
      <div style={{
        fontSize: 80, fontFamily: '"Playfair Display", serif', fontWeight: 700, color: COLORS.white,
        opacity: logoP, transform: `translateY(${interpolate(logoP, [0, 1], [30, 0])}px)`,
      }}>
        Donna<span style={{ color: COLORS.dawn }}>.</span>
      </div>
      <div style={{ width: lineW, height: 2, background: COLORS.dawn, borderRadius: 1, opacity: 0.6 }} />
      <div style={{
        fontSize: 20, fontFamily: '"DM Sans", sans-serif', fontWeight: 300, color: 'rgba(255,255,255,0.4)',
        opacity: subP, transform: `translateY(${interpolate(subP, [0, 1], [15, 0])}px)`,
        letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 4,
      }}>
        Your personal chief of staff
      </div>
    </div>
  );
};
