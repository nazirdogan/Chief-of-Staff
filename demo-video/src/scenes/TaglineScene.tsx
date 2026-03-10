import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { COLORS, SCENES } from '../constants';

export const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { start, duration } = SCENES.tagline;
  const rel = frame - start;

  if (rel < 0 || rel >= duration) return null;

  const opacity = interpolate(
    rel,
    [0, 18, duration - 12, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const scale = interpolate(
    rel,
    [0, 18],
    [0.92, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Underline draws in
  const underlineWidth = interpolate(
    rel,
    [25, 55],
    [0, 100],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: COLORS.parchment,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      {/* Donna logo */}
      <div
        style={{
          fontSize: 28,
          fontFamily: '"Playfair Display", serif',
          fontWeight: 700,
          color: COLORS.charcoal,
          marginBottom: 8,
        }}
      >
        Donna<span style={{ color: COLORS.dawn }}>.</span>
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 56,
          fontFamily: '"Playfair Display", serif',
          fontWeight: 600,
          color: COLORS.charcoal,
          letterSpacing: '-0.02em',
          textAlign: 'center',
          lineHeight: 1.2,
          position: 'relative',
        }}
      >
        See everything.
        <br />
        Miss nothing.
        {/* Decorative underline */}
        <div
          style={{
            position: 'absolute',
            bottom: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            height: 3,
            width: `${underlineWidth}%`,
            maxWidth: 200,
            background: `linear-gradient(90deg, transparent, ${COLORS.dawn}, transparent)`,
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
};
