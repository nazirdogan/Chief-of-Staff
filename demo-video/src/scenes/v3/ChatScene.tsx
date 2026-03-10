import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../constants-v3';
import { DesktopFrame } from '../../components/DesktopFrame';
import { Sidebar } from '../../components/Sidebar';

const SCENE = { start: 330, duration: 7 * 30 };

export const ChatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 3, SCENE.duration - 3, SCENE.duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const userMsg = "What do I have going on today?";
  const typingProgress = interpolate(rel, [12, 35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const typedText = userMsg.slice(0, Math.floor(userMsg.length * typingProgress));
  const showCursor = rel >= 12 && rel < 40;

  const responseSpring = spring({ frame: rel - 45, fps, config: { damping: 12, stiffness: 200 } });

  const renderBold = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <span key={i} style={{ fontWeight: 600, color: COLORS.charcoal }}>{part.slice(2, -2)}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const shortResponse = `**Here's your day, Sarah:**\n\n**3 priorities** need attention before noon:\n1. **Meridian partnership** — James is waiting on your response\n2. **Q1 board deck** — 2pm review with David\n3. **Lina Khoury** — 9 days since your last reply\n\n**2 meetings** · **1 commitment due today**`;
  const revealChars = Math.floor(shortResponse.length * interpolate(rel, [48, 140], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity }}>
      {/* Kinetic overlay */}
      <div style={{ position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 200, display: 'flex', gap: 10, alignItems: 'baseline' }}>
        <div style={{ fontSize: 22, fontFamily: '"DM Sans", sans-serif', fontWeight: 400, color: COLORS.textMuted, opacity: interpolate(rel, [10, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          Ask anything.
        </div>
        <div style={{ fontSize: 26, fontFamily: '"Playfair Display", serif', fontWeight: 700, fontStyle: 'italic', color: COLORS.dawn, opacity: interpolate(rel, [18, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), transform: `scale(${interpolate(rel, [18, 24], [1.3, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})` }}>
          She knows.
        </div>
      </div>

      <DesktopFrame scale={0.82}>
        <Sidebar activeKey="chat" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: COLORS.parchment, padding: '28px 36px' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 700 }}>
            {/* User message */}
            {rel >= 12 && (
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

            {/* Response */}
            {rel >= 45 && (
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

          {/* Input */}
          <div style={{
            marginTop: 16, borderRadius: 12, background: COLORS.surfaceElevated,
            border: `1px solid ${rel >= 12 && rel < 40 ? COLORS.dawnBorderActive : COLORS.border}`,
            padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 14, fontFamily: '"DM Sans", sans-serif', color: COLORS.textGhost }}>
              {rel < 12 ? 'Ask Donna anything...' : ''}
            </div>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: rel >= 12 ? COLORS.dawn : COLORS.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={rel >= 12 ? '#fff' : COLORS.textGhost} strokeWidth="2"><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></svg>
            </div>
          </div>
        </div>
      </DesktopFrame>
    </div>
  );
};
