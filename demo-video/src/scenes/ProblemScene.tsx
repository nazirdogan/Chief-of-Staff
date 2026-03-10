import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { COLORS, SCENES, FPS } from '../constants';

const stats = [
  { number: 847, label: 'unread emails', color: COLORS.dawn },
  { number: 12, label: 'meetings today', color: COLORS.steel },
  { number: 3, label: 'forgotten promises', color: COLORS.red },
];

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { start, duration } = SCENES.problem;
  const rel = frame - start;

  if (rel < 0 || rel >= duration) return null;

  const containerOpacity = interpolate(
    rel,
    [0, 8, duration - 10, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

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
        gap: 40,
        opacity: containerOpacity,
      }}
    >
      {/* Stats */}
      <div style={{ display: 'flex', gap: 80, alignItems: 'center' }}>
        {stats.map((stat, i) => {
          const stagger = i * 12;
          const statOpacity = interpolate(
            rel,
            [stagger + 5, stagger + 15],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          const statY = interpolate(
            rel,
            [stagger + 5, stagger + 15],
            [25, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );

          // Count up animation
          const countProgress = interpolate(
            rel,
            [stagger + 8, stagger + 30],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          const displayNumber = Math.round(stat.number * countProgress);

          return (
            <div
              key={i}
              style={{
                opacity: statOpacity,
                transform: `translateY(${statY}px)`,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 72,
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 700,
                  color: stat.color,
                  lineHeight: 1,
                }}
              >
                {displayNumber}
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontFamily: '"DM Sans", sans-serif',
                  fontWeight: 400,
                  color: 'rgba(255,255,255,0.6)',
                  marginTop: 8,
                  letterSpacing: '0.02em',
                }}
              >
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Separator dots */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </div>

      {/* Subtitle */}
      <div
        style={{
          opacity: interpolate(rel, [50, 65], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          transform: `translateY(${interpolate(rel, [50, 65], [15, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })}px)`,
          fontSize: 20,
          fontFamily: '"DM Sans", sans-serif',
          fontWeight: 400,
          color: 'rgba(255,255,255,0.5)',
          textAlign: 'center',
          maxWidth: 600,
          lineHeight: 1.5,
        }}
      >
        Sound familiar?
      </div>
    </div>
  );
};
