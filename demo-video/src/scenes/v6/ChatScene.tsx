import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../constants-v6';

const SCENE = { start: 180, duration: 4 * 30 };

export const ChatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 5, SCENE.duration - 4, SCENE.duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Typing
  const userMsg = "What do I have going on today?";
  const typingProgress = interpolate(rel, [12, 28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const typedText = userMsg.slice(0, Math.floor(userMsg.length * typingProgress));
  const showCursor = rel >= 12 && rel < 32;

  // User bubble float in
  const userBubbleP = spring({ frame: rel - 10, fps, config: { damping: 20, stiffness: 100 } });

  // Response
  const responseP = spring({ frame: rel - 36, fps, config: { damping: 20, stiffness: 90 } });

  // Response lines appear one by one
  const lines = [
    { bold: true, text: '3 priorities before noon' },
    { bold: false, text: '1. Meridian partnership — James waiting' },
    { bold: false, text: '2. Q1 board deck — 2pm with David' },
    { bold: false, text: '3. Lina Khoury — 9 days cold' },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 600, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Section label */}
        <div style={{
          fontSize: 11, fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: COLORS.dawn,
          textTransform: 'uppercase', letterSpacing: '0.12em',
          opacity: spring({ frame: rel - 3, fps, config: { damping: 22, stiffness: 100 } }),
        }}>
          Ask Donna
        </div>

        {/* User message — right-aligned bubble */}
        {rel >= 10 && (
          <div style={{
            alignSelf: 'flex-end', opacity: userBubbleP,
            transform: `translateY(${interpolate(userBubbleP, [0, 1], [15, 0])}px)`,
          }}>
            <div style={{
              padding: '14px 20px', borderRadius: '20px 20px 6px 20px',
              background: COLORS.dawn, color: COLORS.white,
              fontSize: 16, fontFamily: '"DM Sans", sans-serif', fontWeight: 500,
            }}>
              {typedText}
              {showCursor && <span style={{ display: 'inline-block', width: 2, height: 18, background: 'rgba(255,255,255,0.7)', marginLeft: 2, verticalAlign: 'text-bottom' }} />}
            </div>
          </div>
        )}

        {/* Response — left aligned, clean lines */}
        {rel >= 36 && (
          <div style={{
            opacity: responseP,
            transform: `translateY(${interpolate(responseP, [0, 1], [20, 0])}px)`,
            display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 4,
          }}>
            {/* Dawn accent dot */}
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.dawn, marginBottom: 4 }} />

            {lines.map((line, i) => {
              const lineP = spring({ frame: rel - (38 + i * 5), fps, config: { damping: 22, stiffness: 100 } });
              return (
                <div key={i} style={{
                  opacity: lineP,
                  transform: `translateX(${interpolate(lineP, [0, 1], [20, 0])}px)`,
                  fontSize: line.bold ? 17 : 15,
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
