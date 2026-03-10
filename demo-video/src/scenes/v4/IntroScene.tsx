import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../constants-v4';

const SCENE = { start: 0, duration: 2 * 30 };

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const cutOut = interpolate(rel, [SCENE.duration - 3, SCENE.duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const logoSpring = spring({ frame: rel, fps, config: { damping: 8, stiffness: 350 } });

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.charcoal, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: cutOut }}>
      <div style={{
        fontSize: 72, fontFamily: '"Playfair Display", serif', fontWeight: 700, color: COLORS.white,
        transform: `scale(${logoSpring})`, opacity: logoSpring,
      }}>
        Donna<span style={{ color: COLORS.dawn }}>.</span>
      </div>
      <div style={{
        fontSize: 22, fontFamily: '"DM Sans", sans-serif', fontWeight: 400, color: 'rgba(255,255,255,0.5)',
        opacity: spring({ frame: rel - 8, fps, config: { damping: 10, stiffness: 300 } }),
      }}>
        Your personal chief of staff.
      </div>
    </div>
  );
};
