import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../constants-v3';

const SCENES_LOCAL = { intro: { start: 0, duration: 4 * 30 } };

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { start, duration } = SCENES_LOCAL.intro;
  const rel = frame - start;
  if (rel < 0 || rel >= duration) return null;

  const cutOut = interpolate(rel, [duration - 4, duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const logoSpring = spring({ frame: rel, fps, config: { damping: 12, stiffness: 200 } });
  const subSpring = spring({ frame: rel - 15, fps, config: { damping: 14, stiffness: 180 } });

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.charcoal, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, opacity: cutOut }}>
      <div style={{
        fontSize: 64, fontFamily: '"Playfair Display", serif', fontWeight: 700, color: COLORS.white,
        transform: `scale(${logoSpring})`, opacity: logoSpring,
      }}>
        Donna<span style={{ color: COLORS.dawn }}>.</span>
      </div>
      <div style={{
        fontSize: 24, fontFamily: '"DM Sans", sans-serif', fontWeight: 400, color: 'rgba(255,255,255,0.5)',
        opacity: subSpring, transform: `translateY(${interpolate(subSpring, [0, 1], [15, 0])}px)`,
      }}>
        Your personal chief of staff.
      </div>
    </div>
  );
};
