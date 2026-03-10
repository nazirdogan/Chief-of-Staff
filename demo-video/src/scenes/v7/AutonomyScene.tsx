import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../constants-v7';

const SCENE = { start: 480, duration: 4 * 30 };

export const AutonomyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 5, SCENE.duration - 4, SCENE.duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const labelP = spring({ frame: rel - 3, fps, config: { damping: 22, stiffness: 100 } });
  const cardP = spring({ frame: rel - 8, fps, config: { damping: 18, stiffness: 100 } });

  const confirmPress = rel >= 50;
  const showSuccess = rel >= 60;
  const successP = spring({ frame: rel - 60, fps, config: { damping: 18, stiffness: 100 } });
  const pressScale = confirmPress && !showSuccess ? 0.97 : 1;

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, width: 480, padding: '0 40px' }}>
        <div style={{
          fontSize: 12, fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: COLORS.dawn,
          textTransform: 'uppercase', letterSpacing: '0.12em', opacity: labelP,
        }}>
          Suggested Action
        </div>

        {!showSuccess && (
          <div style={{
            opacity: cardP,
            transform: `translateY(${interpolate(cardP, [0, 1], [30, 0])}px) scale(${pressScale})`,
            width: '100%', padding: '32px 28px 28px', borderRadius: 18,
            background: COLORS.white, border: `1px solid ${COLORS.border}`,
            boxShadow: '0 8px 40px rgba(0,0,0,0.06)',
            display: 'flex', flexDirection: 'column', gap: 18,
          }}>
            <div style={{ width: 40, height: 3, borderRadius: 2, background: COLORS.dawn }} />
            <div style={{ fontSize: 20, fontWeight: 600, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>
              Send revenue slide to David
            </div>
            <div style={{ fontSize: 16, color: COLORS.textTertiary, fontFamily: '"DM Sans", sans-serif', lineHeight: 1.5 }}>
              You promised this by today. Meeting is at 2pm.
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <div style={{
                flex: 1, padding: '14px 0', borderRadius: 12,
                background: confirmPress ? COLORS.dawn : 'transparent',
                border: `1.5px solid ${COLORS.dawn}`,
                color: confirmPress ? COLORS.white : COLORS.dawn,
                fontSize: 16, fontWeight: 600, fontFamily: '"DM Sans", sans-serif', textAlign: 'center',
              }}>
                Confirm
              </div>
              <div style={{
                padding: '14px 28px', borderRadius: 12,
                background: 'transparent', border: `1.5px solid ${COLORS.border}`,
                color: COLORS.textMuted, fontSize: 16, fontWeight: 500, fontFamily: '"DM Sans", sans-serif', textAlign: 'center',
              }}>
                Dismiss
              </div>
            </div>
          </div>
        )}

        {showSuccess && (
          <div style={{
            opacity: successP,
            transform: `translateY(${interpolate(successP, [0, 1], [15, 0])}px) scale(${interpolate(successP, [0, 1], [0.95, 1])})`,
            width: '100%', padding: '28px 28px', borderRadius: 18,
            background: COLORS.white, border: '1.5px solid rgba(82,183,136,0.3)',
            boxShadow: '0 8px 40px rgba(82,183,136,0.08)',
            display: 'flex', alignItems: 'center', gap: 18,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: COLORS.sageMuted,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={COLORS.sage} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>Done.</div>
              <div style={{ fontSize: 14, color: COLORS.sage, fontFamily: '"DM Sans", sans-serif', marginTop: 3 }}>Calendar reminder set for 11:00 AM</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
