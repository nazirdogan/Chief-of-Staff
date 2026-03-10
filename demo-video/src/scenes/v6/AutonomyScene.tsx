import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../constants-v6';

const SCENE = { start: 480, duration: 4 * 30 };

export const AutonomyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 5, SCENE.duration - 4, SCENE.duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const labelP = spring({ frame: rel - 3, fps, config: { damping: 22, stiffness: 100 } });

  // Card floats in
  const cardP = spring({ frame: rel - 8, fps, config: { damping: 18, stiffness: 100 } });

  // Confirm press animation
  const confirmPress = rel >= 50;
  const showSuccess = rel >= 60;
  const successP = spring({ frame: rel - 60, fps, config: { damping: 18, stiffness: 100 } });

  // The card subtly lifts and shrinks on "press"
  const pressScale = confirmPress && !showSuccess ? 0.97 : 1;

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: 440 }}>
        <div style={{
          fontSize: 11, fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: COLORS.dawn,
          textTransform: 'uppercase', letterSpacing: '0.12em',
          opacity: labelP,
        }}>
          Suggested Action
        </div>

        {/* Floating action card — minimal, no window chrome */}
        {!showSuccess && (
          <div style={{
            opacity: cardP,
            transform: `translateY(${interpolate(cardP, [0, 1], [30, 0])}px) scale(${pressScale})`,
            width: '100%', padding: '28px 28px 24px', borderRadius: 16,
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            boxShadow: '0 8px 40px rgba(0,0,0,0.06)',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            {/* Dawn accent line */}
            <div style={{ width: 40, height: 3, borderRadius: 2, background: COLORS.dawn }} />

            <div style={{ fontSize: 18, fontWeight: 600, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>
              Send revenue slide to David
            </div>
            <div style={{ fontSize: 14, color: COLORS.textTertiary, fontFamily: '"DM Sans", sans-serif', lineHeight: 1.5 }}>
              You promised this by today. Meeting is at 2pm.
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <div style={{
                flex: 1, padding: '12px 0', borderRadius: 10,
                background: confirmPress ? COLORS.dawn : 'transparent',
                border: `1.5px solid ${COLORS.dawn}`,
                color: confirmPress ? COLORS.white : COLORS.dawn,
                fontSize: 14, fontWeight: 600, fontFamily: '"DM Sans", sans-serif', textAlign: 'center',
              }}>
                Confirm
              </div>
              <div style={{
                padding: '12px 24px', borderRadius: 10,
                background: 'transparent', border: `1.5px solid ${COLORS.border}`,
                color: COLORS.textMuted, fontSize: 14, fontWeight: 500, fontFamily: '"DM Sans", sans-serif', textAlign: 'center',
              }}>
                Dismiss
              </div>
            </div>
          </div>
        )}

        {/* Success state — minimal */}
        {showSuccess && (
          <div style={{
            opacity: successP,
            transform: `translateY(${interpolate(successP, [0, 1], [15, 0])}px) scale(${interpolate(successP, [0, 1], [0.95, 1])})`,
            width: '100%', padding: '28px', borderRadius: 16,
            background: COLORS.white,
            border: '1.5px solid rgba(82,183,136,0.3)',
            boxShadow: '0 8px 40px rgba(82,183,136,0.08)',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: COLORS.sageMuted,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.sage} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>Done.</div>
              <div style={{ fontSize: 13, color: COLORS.sage, fontFamily: '"DM Sans", sans-serif', marginTop: 2 }}>Calendar reminder set for 11:00 AM</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
