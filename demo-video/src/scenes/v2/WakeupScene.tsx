import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS, SCENES } from '../../constants-v2';

export const WakeupScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { start, duration } = SCENES.wakeup;
  const rel = frame - start;

  if (rel < 0 || rel >= duration) return null;

  const cutOut = interpolate(rel, [duration - 4, duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Time slams in
  const timeScale = spring({ frame: rel, fps, config: { damping: 12, stiffness: 200 } });
  // Name slides in after
  const nameScale = spring({ frame: rel - 8, fps, config: { damping: 14, stiffness: 180 } });
  // "starts" fades in
  const startsOpacity = interpolate(rel, [18, 25], [0, 1], {
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
        gap: 0,
        opacity: cutOut,
      }}
    >
      {/* Time */}
      <div
        style={{
          fontSize: 110,
          fontFamily: '"Playfair Display", serif',
          fontWeight: 700,
          color: COLORS.dawn,
          transform: `scale(${timeScale})`,
          lineHeight: 1,
          letterSpacing: '-0.03em',
        }}
      >
        7:30 AM
      </div>

      {/* Name line */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 14,
          marginTop: 12,
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontFamily: '"DM Sans", sans-serif',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.7)',
            transform: `translateX(${interpolate(nameScale, [0, 1], [-40, 0])}px)`,
            opacity: nameScale,
          }}
        >
          {"Sarah's day"}
        </div>
        <div
          style={{
            fontSize: 36,
            fontFamily: '"DM Sans", sans-serif',
            fontWeight: 600,
            color: COLORS.white,
            opacity: startsOpacity,
          }}
        >
          starts.
        </div>
      </div>
    </div>
  );
};
