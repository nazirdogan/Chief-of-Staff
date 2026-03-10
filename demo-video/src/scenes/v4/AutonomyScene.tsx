import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS, FAKE_DATA } from '../../constants-v4';
import { DesktopFrame } from '../../components/DesktopFrame';
import { Sidebar } from '../../components/Sidebar';

const SCENE = { start: 480, duration: 4 * 30 };

export const AutonomyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 2, SCENE.duration - 2, SCENE.duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const toastSpring = spring({ frame: rel - 5, fps, config: { damping: 8, stiffness: 350 } });
  const toastY = interpolate(toastSpring, [0, 1], [80, 0]);

  const confirmPress = rel >= 40;
  const showSuccess = rel >= 48;
  const successSpring = spring({ frame: rel - 48, fps, config: { damping: 8, stiffness: 300 } });

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity }}>
      {/* Kinetic overlay */}
      <div style={{ position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 200, display: 'flex', gap: 10, alignItems: 'baseline' }}>
        <div style={{ fontSize: 22, fontFamily: '"DM Sans", sans-serif', fontWeight: 400, color: COLORS.textMuted, opacity: interpolate(rel, [5, 9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          She acts.
        </div>
        <div style={{ fontSize: 26, fontFamily: '"Playfair Display", serif', fontWeight: 700, fontStyle: 'italic', color: COLORS.dawn, opacity: interpolate(rel, [10, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), transform: `scale(${interpolate(rel, [10, 14], [1.3, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})` }}>
          You approve.
        </div>
      </div>

      <DesktopFrame scale={0.82}>
        <Sidebar activeKey="today" />
        <div style={{ flex: 1, position: 'relative', background: COLORS.parchment, padding: '28px 36px' }}>
          <div style={{ opacity: 0.2 }}>
            <div style={{ fontSize: 26, fontFamily: '"Playfair Display", serif', fontWeight: 300, color: COLORS.charcoal, marginBottom: 14 }}>Good morning, Sarah</div>
            {FAKE_DATA.briefingItems.slice(0, 3).map((item, i) => (
              <div key={i} style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.surface, marginBottom: 4, fontSize: 12, fontWeight: 600, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>{item.title}</div>
            ))}
          </div>

          {!showSuccess && rel >= 5 && (
            <div style={{
              position: 'absolute', bottom: 32, left: '50%', transform: `translateX(-50%) translateY(${toastY}px)`,
              opacity: toastSpring, width: 420, background: COLORS.white, borderRadius: 14,
              border: `1px solid ${COLORS.border}`, boxShadow: '0 12px 40px rgba(0,0,0,0.12)', overflow: 'hidden',
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
              position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
              opacity: successSpring, width: 420, background: COLORS.white, borderRadius: 14,
              border: '1px solid rgba(82,183,136,0.25)', boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
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
      </DesktopFrame>
    </div>
  );
};
