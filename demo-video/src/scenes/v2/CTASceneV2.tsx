import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS, SCENES } from '../../constants-v2';

export const CTASceneV2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { start, duration } = SCENES.cta;
  const rel = frame - start;

  if (rel < 0 || rel >= duration) return null;

  const opacity = interpolate(rel, [0, 3, duration - 2, duration], [0, 1, 1, 0.9], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Button slams in
  const btnSpring = spring({ frame: rel - 10, fps, config: { damping: 10, stiffness: 250 } });
  const btnScale = interpolate(btnSpring, [0, 1], [0.5, 1]);

  // URL slides up
  const urlSpring = spring({ frame: rel - 25, fps, config: { damping: 14, stiffness: 180 } });

  // Pulse
  const pulse = 1 + 0.02 * Math.sin((rel - 30) * 0.12);
  const showPulse = rel >= 30;

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
        gap: 24,
        opacity,
      }}
    >
      {/* Logo */}
      <div style={{
        fontSize: 36,
        fontFamily: '"Playfair Display", serif',
        fontWeight: 700,
        color: COLORS.white,
      }}>
        Donna<span style={{ color: COLORS.dawn }}>.</span>
      </div>

      {/* CTA */}
      <div style={{
        transform: `scale(${showPulse ? btnScale * pulse : btnScale})`,
        opacity: btnSpring,
        padding: '18px 52px',
        borderRadius: 12,
        background: COLORS.dawn,
        color: COLORS.white,
        fontSize: 20,
        fontFamily: '"DM Sans", sans-serif',
        fontWeight: 600,
        boxShadow: '0 4px 30px rgba(232,132,92,0.5)',
      }}>
        Request early access
      </div>

      {/* URL */}
      <div style={{
        opacity: urlSpring,
        transform: `translateY(${interpolate(urlSpring, [0, 1], [15, 0])}px)`,
        fontSize: 18,
        fontFamily: '"JetBrains Mono", monospace',
        fontWeight: 400,
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: '0.03em',
      }}>
        imdonna.app
      </div>
    </div>
  );
};
