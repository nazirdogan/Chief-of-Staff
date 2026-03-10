import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../constants-v5';

const SCENE = { start: 600, duration: 4 * 30 };

export const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 3, SCENE.duration - 3, SCENE.duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // "See everything" floats up with 3D rotation from below
  const seeProgress = spring({ frame: rel - 5, fps, config: { damping: 16, stiffness: 120 } });
  const seeY = interpolate(seeProgress, [0, 1], [60, 0]);
  const seeRotX = interpolate(seeProgress, [0, 1], [25, 0]);

  // "Miss nothing" floats up from below with offset
  const missProgress = spring({ frame: rel - 16, fps, config: { damping: 16, stiffness: 120 } });
  const missY = interpolate(missProgress, [0, 1], [50, 0]);
  const missRotX = interpolate(missProgress, [0, 1], [20, 0]);

  const lineWidth = interpolate(rel, [30, 55], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const logoOp = interpolate(rel, [3, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute', inset: 0, background: COLORS.charcoal,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, opacity,
      perspective: 1200,
    }}>
      {/* Ambient glow */}
      <div style={{ position: 'absolute', width: 800, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(232,132,92,0.06) 0%, transparent 70%)', opacity: seeProgress }} />

      <div style={{ fontSize: 24, fontFamily: '"Playfair Display", serif', fontWeight: 700, color: COLORS.white, opacity: logoOp, marginBottom: 14, transform: `translateY(${interpolate(logoOp, [0, 1], [10, 0])}px)` }}>
        Donna<span style={{ color: COLORS.dawn }}>.</span>
      </div>

      <div style={{
        fontSize: 76, fontFamily: '"Playfair Display", serif', fontWeight: 700, color: COLORS.white,
        opacity: seeProgress, transform: `translateY(${seeY}px) rotateX(${seeRotX}deg)`,
        transformOrigin: 'center bottom',
        letterSpacing: '-0.02em', lineHeight: 1,
      }}>
        See everything.
      </div>

      <div style={{
        fontSize: 76, fontFamily: '"Playfair Display", serif', fontWeight: 700, color: COLORS.dawn,
        opacity: missProgress, transform: `translateY(${missY}px) rotateX(${missRotX}deg)`,
        transformOrigin: 'center bottom',
        letterSpacing: '-0.02em', lineHeight: 1,
      }}>
        Miss nothing.
      </div>

      <div style={{
        width: `${lineWidth}%`, maxWidth: 300, height: 2, marginTop: 18,
        background: `linear-gradient(90deg, transparent, ${COLORS.dawn}, transparent)`,
      }} />
    </div>
  );
};
