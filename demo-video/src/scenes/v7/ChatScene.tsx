import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../constants-v7';

const SCENE = { start: 180, duration: 4 * 30 };

export const ChatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 5, SCENE.duration - 4, SCENE.duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const userMsg = "What do I have going on today?";
  const typingProgress = interpolate(rel, [12, 28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const typedText = userMsg.slice(0, Math.floor(userMsg.length * typingProgress));
  const showCursor = rel >= 12 && rel < 32;

  const userBubbleP = spring({ frame: rel - 10, fps, config: { damping: 20, stiffness: 100 } });
  const responseP = spring({ frame: rel - 36, fps, config: { damping: 20, stiffness: 90 } });

  const lines = [
    { bold: true, text: '3 priorities before noon' },
    { bold: false, text: '1. Meridian partnership — James waiting' },
    { bold: false, text: '2. Q1 board deck — 2pm with David' },
    { bold: false, text: '3. Lina Khoury — 9 days cold' },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 520, display: 'flex', flexDirection: 'column', gap: 28, padding: '0 40px' }}>
        <div style={{
          fontSize: 12, fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: COLORS.dawn,
          textTransform: 'uppercase', letterSpacing: '0.12em',
          opacity: spring({ frame: rel - 3, fps, config: { damping: 22, stiffness: 100 } }),
        }}>
          Ask Donna
        </div>

        {rel >= 10 && (
          <div style={{
            alignSelf: 'flex-end', opacity: userBubbleP,
            transform: `translateY(${interpolate(userBubbleP, [0, 1], [15, 0])}px)`,
          }}>
            <div style={{
              padding: '16px 22px', borderRadius: '22px 22px 6px 22px',
              background: COLORS.dawn, color: COLORS.white,
              fontSize: 18, fontFamily: '"DM Sans", sans-serif', fontWeight: 500,
            }}>
              {typedText}
              {showCursor && <span style={{ display: 'inline-block', width: 2, height: 20, background: 'rgba(255,255,255,0.7)', marginLeft: 2, verticalAlign: 'text-bottom' }} />}
            </div>
          </div>
        )}

        {rel >= 36 && (
          <div style={{
            opacity: responseP,
            transform: `translateY(${interpolate(responseP, [0, 1], [20, 0])}px)`,
            display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 4,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.dawn, marginBottom: 6 }} />
            {lines.map((line, i) => {
              const lineP = spring({ frame: rel - (38 + i * 5), fps, config: { damping: 22, stiffness: 100 } });
              return (
                <div key={i} style={{
                  opacity: lineP,
                  transform: `translateX(${interpolate(lineP, [0, 1], [20, 0])}px)`,
                  fontSize: line.bold ? 19 : 17,
                  fontWeight: line.bold ? 600 : 400,
                  fontFamily: '"DM Sans", sans-serif',
                  color: line.bold ? COLORS.charcoal : COLORS.textSecondary,
                  lineHeight: 1.5,
                }}>
                  {line.text}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
