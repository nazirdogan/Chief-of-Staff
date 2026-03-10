import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { COLORS, SCENES } from '../constants';

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { start, duration } = SCENES.cta;
  const rel = frame - start;

  if (rel < 0 || rel >= duration) return null;

  const opacity = interpolate(
    rel,
    [0, 15, duration - 5, duration],
    [0, 1, 1, 0.8],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const buttonY = interpolate(
    rel,
    [20, 35],
    [20, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const buttonOpacity = interpolate(
    rel,
    [20, 35],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const urlOpacity = interpolate(
    rel,
    [40, 55],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Subtle pulse on the button
  const pulseScale = 1 + 0.015 * Math.sin((rel - 35) * 0.08);
  const showPulse = rel >= 35;

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
        gap: 30,
        opacity,
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontSize: 32,
          fontFamily: '"Playfair Display", serif',
          fontWeight: 700,
          color: COLORS.white,
        }}
      >
        Donna<span style={{ color: COLORS.dawn }}>.</span>
      </div>

      {/* CTA Button */}
      <div
        style={{
          opacity: buttonOpacity,
          transform: `translateY(${buttonY}px) scale(${showPulse ? pulseScale : 1})`,
          padding: '16px 48px',
          borderRadius: 12,
          background: COLORS.dawn,
          color: COLORS.white,
          fontSize: 18,
          fontFamily: '"DM Sans", sans-serif',
          fontWeight: 600,
          letterSpacing: '0.01em',
          boxShadow: `0 4px 24px rgba(232,132,92,0.4)`,
        }}
      >
        Request early access
      </div>

      {/* URL */}
      <div
        style={{
          opacity: urlOpacity,
          fontSize: 16,
          fontFamily: '"JetBrains Mono", monospace',
          fontWeight: 400,
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '0.03em',
        }}
      >
        imdonna.app
      </div>
    </div>
  );
};
