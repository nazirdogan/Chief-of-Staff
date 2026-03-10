import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../constants-v6';

const SCENE = { start: 600, duration: 4 * 30 };

export const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 4, SCENE.duration - 4, SCENE.duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const seeP = spring({ frame: rel - 6, fps, config: { damping: 20, stiffness: 90 } });
  const missP = spring({ frame: rel - 18, fps, config: { damping: 20, stiffness: 90 } });

  // Thin accent lines draw in from center
  const lineW = interpolate(rel, [28, 55], [0, 200], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute', inset: 0, background: COLORS.charcoal,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, opacity,
    }}>
      {/* Logo small */}
      <div style={{
        fontSize: 18, fontFamily: '"Playfair Display", serif', fontWeight: 700, color: 'rgba(255,255,255,0.3)',
        opacity: interpolate(rel, [4, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        marginBottom: 20, letterSpacing: '0.06em', textTransform: 'uppercase',
        fontStyle: 'normal',
      }}>
        <span style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 400, fontSize: 12 }}>Donna</span>
      </div>

      <div style={{
        fontSize: 68, fontFamily: '"Playfair Display", serif', fontWeight: 700, color: COLORS.white,
        opacity: seeP, transform: `translateY(${interpolate(seeP, [0, 1], [30, 0])}px)`,
        letterSpacing: '-0.02em', lineHeight: 1.1,
      }}>
        See everything.
      </div>

      <div style={{
        fontSize: 68, fontFamily: '"Playfair Display", serif', fontWeight: 700, color: COLORS.dawn,
        opacity: missP, transform: `translateY(${interpolate(missP, [0, 1], [30, 0])}px)`,
        letterSpacing: '-0.02em', lineHeight: 1.1,
      }}>
        Miss nothing.
      </div>

      {/* Thin accent line */}
      <div style={{
        width: lineW, height: 1, marginTop: 24,
        background: `linear-gradient(90deg, transparent, rgba(232,132,92,0.5), transparent)`,
      }} />
    </div>
  );
};
