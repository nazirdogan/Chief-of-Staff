import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS, FAKE_DATA } from '../../constants-v5';
import { Sidebar } from '../../components/Sidebar';

const SCENE = { start: 480, duration: 4 * 30 };

export const AutonomyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 4, SCENE.duration - 3, SCENE.duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Frame tilts from right with perspective
  const frameProgress = spring({ frame: rel, fps, config: { damping: 22, stiffness: 100 } });
  const frameRotY = interpolate(frameProgress, [0, 1], [6, 2]);
  const driftRotY = interpolate(rel, [0, SCENE.duration], [2, -1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Toast floats up from below with 3D rotation
  const toastProgress = spring({ frame: rel - 8, fps, config: { damping: 16, stiffness: 120 } });
  const toastY = interpolate(toastProgress, [0, 1], [80, 0]);
  const toastRotX = interpolate(toastProgress, [0, 1], [20, 0]);

  const confirmPress = rel >= 42;
  const showSuccess = rel >= 50;
  const successProgress = spring({ frame: rel - 50, fps, config: { damping: 16, stiffness: 120 } });

  const textProgress = spring({ frame: rel - 5, fps, config: { damping: 20, stiffness: 100 } });

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity, perspective: 1400 }}>
      {/* Floating text */}
      <div style={{
        position: 'absolute', top: 46, left: '50%', zIndex: 200,
        transform: `translateX(-50%) translateZ(70px)`,
        display: 'flex', gap: 10, alignItems: 'baseline', opacity: textProgress,
      }}>
        <div style={{ fontSize: 22, fontFamily: '"DM Sans", sans-serif', fontWeight: 400, color: COLORS.textMuted, transform: `translateY(${interpolate(textProgress, [0, 1], [20, 0])}px)` }}>
          She acts.
        </div>
        <div style={{ fontSize: 26, fontFamily: '"Playfair Display", serif', fontWeight: 700, fontStyle: 'italic', color: COLORS.dawn, opacity: interpolate(rel, [11, 17], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), transform: `translateY(${interpolate(rel, [11, 17], [15, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)` }}>
          You approve.
        </div>
      </div>

      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: `scale(0.78) rotateY(${driftRotY + frameRotY}deg) rotateX(-0.5deg)`,
        transformStyle: 'preserve-3d',
      }}>
        <div style={{
          width: 1440, height: 900, borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 30px 100px rgba(0,0,0,0.2), 0 10px 40px rgba(0,0,0,0.1)',
          border: '1px solid rgba(0,0,0,0.08)', background: COLORS.parchment,
        }}>
          <div style={{ height: 36, background: COLORS.linen, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', paddingLeft: 14, gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFBD2E' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 12, fontFamily: '"DM Sans", sans-serif', color: COLORS.textGhost, paddingRight: 14 }}>Donna</div>
          </div>
          <div style={{ display: 'flex', height: 'calc(100% - 36px)' }}>
            <Sidebar activeKey="today" />
            <div style={{ flex: 1, position: 'relative', background: COLORS.parchment, padding: '28px 36px' }}>
              <div style={{ opacity: 0.2 }}>
                <div style={{ fontSize: 26, fontFamily: '"Playfair Display", serif', fontWeight: 300, color: COLORS.charcoal, marginBottom: 14 }}>Good morning, Sarah</div>
                {FAKE_DATA.briefingItems.slice(0, 3).map((item, i) => (
                  <div key={i} style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.surface, marginBottom: 4, fontSize: 12, fontWeight: 600, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>{item.title}</div>
                ))}
              </div>

              {/* Floating toast with 3D rotation */}
              {!showSuccess && rel >= 8 && (
                <div style={{
                  position: 'absolute', bottom: 36, left: '50%',
                  transform: `translateX(-50%) translateY(${toastY}px) rotateX(${toastRotX}deg)`,
                  transformOrigin: 'center bottom',
                  opacity: toastProgress, width: 420, background: COLORS.white, borderRadius: 14,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: '0 16px 50px rgba(0,0,0,0.15), 0 6px 20px rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                }}>
                  <div style={{ height: 3, background: COLORS.dawnMuted }}><div style={{ height: '100%', width: '80%', background: COLORS.dawn, borderRadius: 2 }} /></div>
                  <div style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: COLORS.dawn, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>SUGGESTED ACTION</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif', marginBottom: 3 }}>{FAKE_DATA.autonomyAction.title}</div>
                    <div style={{ fontSize: 11, color: COLORS.textTertiary, fontFamily: '"DM Sans", sans-serif', marginBottom: 10 }}>{FAKE_DATA.autonomyAction.description}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: confirmPress ? COLORS.dawn : COLORS.dawnMuted, border: `1px solid ${COLORS.dawnBorder}`, color: confirmPress ? COLORS.white : COLORS.dawn, fontSize: 12, fontWeight: 600, fontFamily: '"DM Sans", sans-serif', textAlign: 'center' }}>Confirm</div>
                      <div style={{ padding: '7px 16px', borderRadius: 8, background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, fontSize: 12, fontWeight: 500, fontFamily: '"DM Sans", sans-serif', textAlign: 'center' }}>Dismiss</div>
                    </div>
                  </div>
                </div>
              )}

              {showSuccess && (
                <div style={{
                  position: 'absolute', bottom: 36, left: '50%', transform: `translateX(-50%) translateY(${interpolate(successProgress, [0, 1], [20, 0])}px)`,
                  opacity: successProgress, width: 420, background: COLORS.white, borderRadius: 14,
                  border: '1px solid rgba(82,183,136,0.25)',
                  boxShadow: '0 16px 50px rgba(0,0,0,0.1), 0 6px 20px rgba(0,0,0,0.05)',
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: COLORS.sageMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={COLORS.sage} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>Calendar reminder set</div>
                    <div style={{ fontSize: 10, color: COLORS.sage, fontFamily: '"DM Sans", sans-serif' }}>Added for 11:00 AM</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
