import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../constants-v4';

const SCENE = { start: 720, duration: 6 * 30 };

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 2, SCENE.duration - 2, SCENE.duration], [0, 1, 1, 0.9], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const btnSpring = spring({ frame: rel - 8, fps, config: { damping: 8, stiffness: 350 } });
  const btnScale = interpolate(btnSpring, [0, 1], [0.4, 1]);

  const urlSpring = spring({ frame: rel - 20, fps, config: { damping: 10, stiffness: 250 } });

  const pulse = 1 + 0.025 * Math.sin((rel - 25) * 0.15);
  const showPulse = rel >= 25;

  return (
    <div style={{
      position: 'absolute', inset: 0, background: COLORS.charcoal,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, opacity,
    }}>
      <div style={{ fontSize: 36, fontFamily: '"Playfair Display", serif', fontWeight: 700, color: COLORS.white }}>
        Donna<span style={{ color: COLORS.dawn }}>.</span>
      </div>

      <div style={{
        transform: `scale(${showPulse ? btnScale * pulse : btnScale})`, opacity: btnSpring,
        padding: '18px 52px', borderRadius: 12, background: COLORS.dawn, color: COLORS.white,
        fontSize: 20, fontFamily: '"DM Sans", sans-serif', fontWeight: 600,
        boxShadow: '0 4px 30px rgba(232,132,92,0.5)',
      }}>
        Request early access
      </div>

      <div style={{
        opacity: urlSpring, transform: `translateY(${interpolate(urlSpring, [0, 1], [15, 0])}px)`,
        fontSize: 18, fontFamily: '"JetBrains Mono", monospace', fontWeight: 400,
        color: 'rgba(255,255,255,0.5)', letterSpacing: '0.03em',
      }}>
        imdonna.app
      </div>
    </div>
  );
};
