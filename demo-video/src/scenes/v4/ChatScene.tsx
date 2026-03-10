import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../constants-v4';
import { DesktopFrame } from '../../components/DesktopFrame';
import { Sidebar } from '../../components/Sidebar';

const SCENE = { start: 180, duration: 4 * 30 };

export const ChatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 2, SCENE.duration - 2, SCENE.duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Fast typing
  const userMsg = "What do I have going on today?";
  const typingProgress = interpolate(rel, [6, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const typedText = userMsg.slice(0, Math.floor(userMsg.length * typingProgress));
  const showCursor = rel >= 6 && rel < 26;

  // Response slams in fast
  const responseSpring = spring({ frame: rel - 28, fps, config: { damping: 8, stiffness: 300 } });

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
  const revealChars = Math.floor(shortResponse.length * interpolate(rel, [30, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity }}>
      {/* Kinetic overlay */}
      <div style={{ position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 200, display: 'flex', gap: 10, alignItems: 'baseline' }}>
        <div style={{ fontSize: 22, fontFamily: '"DM Sans", sans-serif', fontWeight: 400, color: COLORS.textMuted, opacity: interpolate(rel, [5, 9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          Ask anything.
        </div>
        <div style={{ fontSize: 26, fontFamily: '"Playfair Display", serif', fontWeight: 700, fontStyle: 'italic', color: COLORS.dawn, opacity: interpolate(rel, [10, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), transform: `scale(${interpolate(rel, [10, 14], [1.3, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})` }}>
          She knows.
        </div>
      </div>

      <DesktopFrame scale={0.82}>
        <Sidebar activeKey="chat" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: COLORS.parchment, padding: '28px 36px' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
            {rel >= 6 && (
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

            {rel >= 28 && (
              <div style={{
                opacity: responseSpring,
                transform: `translateY(${interpolate(responseSpring, [0, 1], [20, 0])}px)`,
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
            border: `1px solid ${rel >= 6 && rel < 26 ? COLORS.dawnBorderActive : COLORS.border}`,
            padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 14, fontFamily: '"DM Sans", sans-serif', color: COLORS.textGhost }}>
              {rel < 6 ? 'Ask Donna anything...' : ''}
            </div>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: rel >= 6 ? COLORS.dawn : COLORS.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={rel >= 6 ? '#fff' : COLORS.textGhost} strokeWidth="2"><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></svg>
            </div>
          </div>
        </div>
      </DesktopFrame>
    </div>
  );
};
