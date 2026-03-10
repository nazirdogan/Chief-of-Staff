import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../constants-v3';

const SCENE = { start: 1470, duration: 5 * 30 };

export const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 3, SCENE.duration - 3, SCENE.duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const seeSpring = spring({ frame: rel - 5, fps, config: { damping: 10, stiffness: 300 } });
  const seeX = interpolate(seeSpring, [0, 1], [-120, 0]);

  const missSpring = spring({ frame: rel - 18, fps, config: { damping: 10, stiffness: 300 } });
  const missX = interpolate(missSpring, [0, 1], [120, 0]);

  const lineWidth = interpolate(rel, [35, 70], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const logoOp = interpolate(rel, [5, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute', inset: 0, background: COLORS.charcoal,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, opacity,
    }}>
      <div style={{ fontSize: 24, fontFamily: '"Playfair Display", serif', fontWeight: 700, color: COLORS.white, opacity: logoOp, marginBottom: 12 }}>
        Donna<span style={{ color: COLORS.dawn }}>.</span>
      </div>

      <div style={{
        fontSize: 72, fontFamily: '"Playfair Display", serif', fontWeight: 700, color: COLORS.white,
        opacity: seeSpring, transform: `translateX(${seeX}px)`, letterSpacing: '-0.02em', lineHeight: 1,
      }}>
        See everything.
      </div>

      <div style={{
        fontSize: 72, fontFamily: '"Playfair Display", serif', fontWeight: 700, color: COLORS.dawn,
        opacity: missSpring, transform: `translateX(${missX}px)`, letterSpacing: '-0.02em', lineHeight: 1,
      }}>
        Miss nothing.
      </div>

      <div style={{
        width: `${lineWidth}%`, maxWidth: 300, height: 2,
        background: `linear-gradient(90deg, transparent, ${COLORS.dawn}, transparent)`, marginTop: 16,
      }} />
    </div>
  );
};
