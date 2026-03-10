import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../constants-v5';

const SCENE = { start: 0, duration: 2 * 30 };

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const cutOut = interpolate(rel, [SCENE.duration - 4, SCENE.duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Logo floats up from below with slight 3D tilt
  const logoProgress = spring({ frame: rel, fps, config: { damping: 18, stiffness: 120 } });
  const logoY = interpolate(logoProgress, [0, 1], [60, 0]);
  const logoRotX = interpolate(logoProgress, [0, 1], [15, 0]);

  const subProgress = spring({ frame: rel - 10, fps, config: { damping: 20, stiffness: 100 } });
  const subY = interpolate(subProgress, [0, 1], [30, 0]);

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.charcoal, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, opacity: cutOut, perspective: 1200 }}>
      {/* Subtle radial glow */}
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,132,92,0.08) 0%, transparent 70%)', opacity: logoProgress }} />

      <div style={{
        fontSize: 72, fontFamily: '"Playfair Display", serif', fontWeight: 700, color: COLORS.white,
        transform: `translateY(${logoY}px) rotateX(${logoRotX}deg)`, opacity: logoProgress,
      }}>
        Donna<span style={{ color: COLORS.dawn }}>.</span>
      </div>
      <div style={{
        fontSize: 22, fontFamily: '"DM Sans", sans-serif', fontWeight: 400, color: 'rgba(255,255,255,0.45)',
        transform: `translateY(${subY}px)`, opacity: subProgress,
      }}>
        Your personal chief of staff.
      </div>
    </div>
  );
};
