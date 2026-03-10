import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../constants-v7';

const SCENE = { start: 600, duration: 4 * 30 };

export const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 4, SCENE.duration - 4, SCENE.duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const seeP = spring({ frame: rel - 6, fps, config: { damping: 20, stiffness: 90 } });
  const missP = spring({ frame: rel - 18, fps, config: { damping: 20, stiffness: 90 } });
  const lineW = interpolate(rel, [28, 55], [0, 160], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute', inset: 0, background: COLORS.charcoal,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, opacity,
    }}>
      <div style={{
        fontSize: 14, fontFamily: '"DM Sans", sans-serif', fontWeight: 400, color: 'rgba(255,255,255,0.25)',
        opacity: interpolate(rel, [4, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        marginBottom: 28, letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>
        Donna
      </div>

      <div style={{
        fontSize: 60, fontFamily: '"Playfair Display", serif', fontWeight: 700, color: COLORS.white,
        opacity: seeP, transform: `translateY(${interpolate(seeP, [0, 1], [30, 0])}px)`,
        letterSpacing: '-0.02em', lineHeight: 1.1, textAlign: 'center',
      }}>
        See<br />everything.
      </div>

      <div style={{
        fontSize: 60, fontFamily: '"Playfair Display", serif', fontWeight: 700, color: COLORS.dawn,
        opacity: missP, transform: `translateY(${interpolate(missP, [0, 1], [30, 0])}px)`,
        letterSpacing: '-0.02em', lineHeight: 1.1, textAlign: 'center', marginTop: 8,
      }}>
        Miss<br />nothing.
      </div>

      <div style={{
        width: lineW, height: 1, marginTop: 32,
        background: `linear-gradient(90deg, transparent, rgba(232,132,92,0.5), transparent)`,
      }} />
    </div>
  );
};
