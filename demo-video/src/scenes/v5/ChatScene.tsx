import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../constants-v5';
import { Sidebar } from '../../components/Sidebar';

const SCENE = { start: 180, duration: 4 * 30 };

export const ChatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 4, SCENE.duration - 3, SCENE.duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Frame tilts from the left this time
  const frameProgress = spring({ frame: rel, fps, config: { damping: 22, stiffness: 100 } });
  const frameRotY = interpolate(frameProgress, [0, 1], [-8, -1.5]);
  const frameRotX = interpolate(frameProgress, [0, 1], [4, 0.5]);
  const frameScale = interpolate(frameProgress, [0, 1], [0.88, 0.78]);

  const driftRotY = interpolate(rel, [0, SCENE.duration], [-1.5, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const userMsg = "What do I have going on today?";
  const typingProgress = interpolate(rel, [8, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const typedText = userMsg.slice(0, Math.floor(userMsg.length * typingProgress));
  const showCursor = rel >= 8 && rel < 28;

  const responseProgress = spring({ frame: rel - 30, fps, config: { damping: 20, stiffness: 100 } });

  const renderBold = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <span key={i} style={{ fontWeight: 600, color: COLORS.charcoal }}>{part.slice(2, -2)}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const shortResponse = `**3 priorities** before noon:\n1. **Meridian partnership** — James waiting\n2. **Q1 board deck** — 2pm with David\n3. **Lina Khoury** — 9 days cold\n\n**2 meetings** · **1 commitment due**`;
  const revealChars = Math.floor(shortResponse.length * interpolate(rel, [32, 95], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));

  const textProgress = spring({ frame: rel - 6, fps, config: { damping: 20, stiffness: 100 } });

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity, perspective: 1400 }}>
      {/* Floating text — parallax */}
      <div style={{
        position: 'absolute', top: 46, left: '50%', zIndex: 200,
        transform: `translateX(-50%) translateZ(60px)`,
        display: 'flex', gap: 10, alignItems: 'baseline', opacity: textProgress,
      }}>
        <div style={{ fontSize: 22, fontFamily: '"DM Sans", sans-serif', fontWeight: 400, color: COLORS.textMuted, transform: `translateY(${interpolate(textProgress, [0, 1], [20, 0])}px)` }}>
          Ask anything.
        </div>
        <div style={{ fontSize: 26, fontFamily: '"Playfair Display", serif', fontWeight: 700, fontStyle: 'italic', color: COLORS.dawn, opacity: interpolate(rel, [12, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), transform: `translateY(${interpolate(rel, [12, 18], [15, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)` }}>
          She knows.
        </div>
      </div>

      {/* 3D frame — tilts from left */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: `scale(${frameScale}) rotateY(${driftRotY + frameRotY}deg) rotateX(${frameRotX}deg)`,
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
            <Sidebar activeKey="chat" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: COLORS.parchment, padding: '28px 36px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
                {rel >= 8 && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{
                      maxWidth: '66%', padding: '10px 14px', borderRadius: '12px 12px 4px 12px',
                      background: COLORS.dawnMuted, border: `1px solid ${COLORS.dawnBorderActive}`,
                      fontSize: 14, fontFamily: '"DM Sans", sans-serif', color: COLORS.charcoal,
                    }}>
                      {typedText}
                      {showCursor && <span style={{ display: 'inline-block', width: 2, height: 16, background: COLORS.dawn, marginLeft: 1, verticalAlign: 'text-bottom' }} />}
                    </div>
                  </div>
                )}

                {rel >= 30 && (
                  <div style={{
                    opacity: responseProgress,
                    transform: `translateY(${interpolate(responseProgress, [0, 1], [25, 0])}px)`,
                    paddingLeft: 14, borderLeft: `2px solid ${COLORS.dawnBorderActive}`,
                    fontSize: 13, fontFamily: '"DM Sans", sans-serif', color: COLORS.textSecondary,
                    lineHeight: 1.7, whiteSpace: 'pre-wrap',
                  }}>
                    {renderBold(shortResponse.slice(0, revealChars))}
                  </div>
                )}
              </div>

              <div style={{
                marginTop: 16, borderRadius: 12, background: COLORS.surfaceElevated,
                border: `1px solid ${rel >= 8 && rel < 28 ? COLORS.dawnBorderActive : COLORS.border}`,
                padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ fontSize: 14, fontFamily: '"DM Sans", sans-serif', color: COLORS.textGhost }}>
                  {rel < 8 ? 'Ask Donna anything...' : ''}
                </div>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: rel >= 8 ? COLORS.dawn : COLORS.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={rel >= 8 ? '#fff' : COLORS.textGhost} strokeWidth="2"><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
