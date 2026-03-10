import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS, SCENES } from '../../constants-v2';

export const TaglineSceneV2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { start, duration } = SCENES.tagline;
  const rel = frame - start;

  if (rel < 0 || rel >= duration) return null;

  const opacity = interpolate(rel, [0, 3, duration - 3, duration], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // "See everything." slams in from left
  const seeSpring = spring({ frame: rel - 5, fps, config: { damping: 10, stiffness: 300 } });
  const seeX = interpolate(seeSpring, [0, 1], [-120, 0]);

  // "Miss nothing." slams in from right
  const missSpring = spring({ frame: rel - 18, fps, config: { damping: 10, stiffness: 300 } });
  const missX = interpolate(missSpring, [0, 1], [120, 0]);

  // Dawn accent line draws across
  const lineWidth = interpolate(rel, [35, 70], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Logo
  const logoOp = interpolate(rel, [5, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: COLORS.charcoal,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity,
      }}
    >
      {/* Logo */}
      <div style={{
        fontSize: 24,
        fontFamily: '"Playfair Display", serif',
        fontWeight: 700,
        color: COLORS.white,
        opacity: logoOp,
        marginBottom: 12,
      }}>
        Donna<span style={{ color: COLORS.dawn }}>.</span>
      </div>

      {/* "See everything." */}
      <div style={{
        fontSize: 72,
        fontFamily: '"Playfair Display", serif',
        fontWeight: 700,
        color: COLORS.white,
        opacity: seeSpring,
        transform: `translateX(${seeX}px)`,
        letterSpacing: '-0.02em',
        lineHeight: 1,
      }}>
        See everything.
      </div>

      {/* "Miss nothing." */}
      <div style={{
        fontSize: 72,
        fontFamily: '"Playfair Display", serif',
        fontWeight: 700,
        color: COLORS.dawn,
        opacity: missSpring,
        transform: `translateX(${missX}px)`,
        letterSpacing: '-0.02em',
        lineHeight: 1,
        position: 'relative',
      }}>
        Miss nothing.
      </div>

      {/* Accent line */}
      <div style={{
        width: `${lineWidth}%`,
        maxWidth: 300,
        height: 2,
        background: `linear-gradient(90deg, transparent, ${COLORS.dawn}, transparent)`,
        marginTop: 16,
      }} />
    </div>
  );
};
