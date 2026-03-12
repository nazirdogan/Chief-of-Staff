import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { COLORS, SCENES } from '../constants';

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { start, duration } = SCENES.hook;
  const rel = frame - start;

  if (rel < 0 || rel >= duration) return null;

  const opacity = interpolate(
    rel,
    [0, 15, duration - 10, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const translateY = interpolate(
    rel,
    [0, 15],
    [30, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Subtle background glow
  const glowOpacity = interpolate(
    rel,
    [0, duration / 2, duration],
    [0, 0.3, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: COLORS.parchment,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
      }}
    >
      {/* Subtle dawn glow behind text */}
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.dawn}22 0%, transparent 70%)`,
          opacity: glowOpacity,
        }}
      />

      {/* Main question */}
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          textAlign: 'center',
          maxWidth: 800,
          padding: '0 40px',
        }}
      >
        <div
          style={{
            fontSize: 52,
            fontFamily: '"Playfair Display", serif',
            fontWeight: 400,
            fontStyle: 'italic',
            color: COLORS.charcoal,
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
          }}
        >
          What if you never missed{'\n'}a commitment again?
        </div>
      </div>

      {/* Donna branding - subtle at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          opacity: interpolate(rel, [20, 40], [0, 0.5], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          fontSize: 18,
          fontFamily: '"Playfair Display", serif',
          fontWeight: 700,
          color: COLORS.charcoal,
        }}
      >
        Donna<span style={{ color: COLORS.dawn }}>.</span>
      </div>
    </div>
  );
};
