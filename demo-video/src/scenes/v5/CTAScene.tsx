import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../constants-v5';

const SCENE = { start: 720, duration: 6 * 30 };

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 3, SCENE.duration - 2, SCENE.duration], [0, 1, 1, 0.9], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Button floats up with 3D rotation
  const btnProgress = spring({ frame: rel - 10, fps, config: { damping: 16, stiffness: 120 } });
  const btnY = interpolate(btnProgress, [0, 1], [40, 0]);
  const btnRotX = interpolate(btnProgress, [0, 1], [15, 0]);

  const urlProgress = spring({ frame: rel - 22, fps, config: { damping: 18, stiffness: 100 } });

  // Gentle floating hover
  const hoverY = rel >= 30 ? 2 * Math.sin((rel - 30) * 0.08) : 0;

  // Glow pulse
  const glowSize = rel >= 30 ? 0.5 + 0.15 * Math.sin((rel - 30) * 0.1) : 0.5;

  return (
    <div style={{
      position: 'absolute', inset: 0, background: COLORS.charcoal,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, opacity,
      perspective: 1200,
    }}>
      {/* Dawn glow behind button */}
      <div style={{
        position: 'absolute', width: 500, height: 300, borderRadius: '50%',
        background: `radial-gradient(ellipse, rgba(232,132,92,${glowSize * 0.15}) 0%, transparent 70%)`,
        transform: 'translateY(20px)',
      }} />

      <div style={{
        fontSize: 36, fontFamily: '"Playfair Display", serif', fontWeight: 700, color: COLORS.white,
        opacity: spring({ frame: rel - 5, fps, config: { damping: 18, stiffness: 120 } }),
        transform: `translateY(${interpolate(spring({ frame: rel - 5, fps, config: { damping: 18, stiffness: 120 } }), [0, 1], [20, 0])}px)`,
      }}>
        Donna<span style={{ color: COLORS.dawn }}>.</span>
      </div>

      <div style={{
        opacity: btnProgress,
        transform: `translateY(${btnY + hoverY}px) rotateX(${btnRotX}deg)`,
        transformOrigin: 'center bottom',
        padding: '18px 52px', borderRadius: 12, background: COLORS.dawn, color: COLORS.white,
        fontSize: 20, fontFamily: '"DM Sans", sans-serif', fontWeight: 600,
        boxShadow: `0 8px 40px rgba(232,132,92,${glowSize})`,
      }}>
        Request early access
      </div>

      <div style={{
        opacity: urlProgress, transform: `translateY(${interpolate(urlProgress, [0, 1], [20, 0])}px)`,
        fontSize: 18, fontFamily: '"JetBrains Mono", monospace', fontWeight: 400,
        color: 'rgba(255,255,255,0.45)', letterSpacing: '0.03em',
      }}>
        imdonna.app
      </div>
    </div>
  );
};
