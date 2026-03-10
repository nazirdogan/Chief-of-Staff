import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../constants-v7';

const SCENE = { start: 720, duration: 6 * 30 };

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 4, SCENE.duration - 2, SCENE.duration], [0, 1, 1, 0.9], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const logoP = spring({ frame: rel - 5, fps, config: { damping: 20, stiffness: 100 } });
  const btnP = spring({ frame: rel - 14, fps, config: { damping: 18, stiffness: 100 } });
  const urlP = spring({ frame: rel - 24, fps, config: { damping: 20, stiffness: 90 } });

  const hoverY = rel >= 35 ? 1.5 * Math.sin((rel - 35) * 0.07) : 0;

  return (
    <div style={{
      position: 'absolute', inset: 0, background: COLORS.charcoal,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, opacity,
    }}>
      <div style={{
        fontSize: 48, fontFamily: '"Playfair Display", serif', fontWeight: 700, color: COLORS.white,
        opacity: logoP, transform: `translateY(${interpolate(logoP, [0, 1], [20, 0])}px)`,
      }}>
        Donna<span style={{ color: COLORS.dawn }}>.</span>
      </div>

      <div style={{
        opacity: btnP, transform: `translateY(${interpolate(btnP, [0, 1], [20, 0]) + hoverY}px)`,
        padding: '18px 52px', borderRadius: 50,
        background: 'transparent', border: `1.5px solid ${COLORS.dawn}`, color: COLORS.dawn,
        fontSize: 20, fontFamily: '"DM Sans", sans-serif', fontWeight: 500,
        letterSpacing: '0.02em',
      }}>
        Request early access
      </div>

      <div style={{
        opacity: urlP, transform: `translateY(${interpolate(urlP, [0, 1], [12, 0])}px)`,
        fontSize: 17, fontFamily: '"JetBrains Mono", monospace', fontWeight: 400,
        color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em',
      }}>
        imdonna.app
      </div>
    </div>
  );
};
