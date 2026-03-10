import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { COLORS, SCENES, FAKE_DATA } from '../constants';
import { DesktopFrame } from '../components/DesktopFrame';
import { Sidebar } from '../components/Sidebar';
import { TextOverlay } from '../components/TextOverlay';

export const ChatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { start, duration } = SCENES.chat;
  const rel = frame - start;

  if (rel < 0 || rel >= duration) return null;

  const containerOpacity = interpolate(
    rel,
    [0, 12, duration - 12, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Typing animation for user message
  const userMsg = FAKE_DATA.chatMessages[0].text;
  const typingProgress = interpolate(
    rel,
    [20, 55],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const displayedChars = Math.floor(userMsg.length * typingProgress);
  const typedText = userMsg.slice(0, displayedChars);
  const showCursor = rel >= 20 && rel < 60;

  // Assistant response appears after typing
  const assistantOpacity = interpolate(
    rel,
    [70, 85],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const assistantY = interpolate(
    rel,
    [70, 85],
    [15, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Thinking indicator
  const showThinking = rel >= 58 && rel < 75;
  const thinkingOpacity = interpolate(
    rel,
    [58, 62, 72, 75],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Render markdown-like bold text
  const renderMarkdown = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <span key={i} style={{ fontWeight: 600, color: COLORS.charcoal }}>
            {part.slice(2, -2)}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const assistantText = FAKE_DATA.chatMessages[1].text;
  // Reveal assistant text progressively
  const textRevealProgress = interpolate(
    rel,
    [75, 200],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const revealChars = Math.floor(assistantText.length * textRevealProgress);
  const revealedText = assistantText.slice(0, revealChars);

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity: containerOpacity }}>
      <TextOverlay
        text="Just ask. Donna knows your entire day."
        startFrame={start}
        durationFrames={70}
        fontSize={28}
        fontFamily='"DM Sans", sans-serif'
        fontWeight={500}
        color={COLORS.charcoal}
        position="top"
        maxWidth={550}
      />

      <DesktopFrame>
        <Sidebar activeKey="chat" />

        {/* Chat area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: COLORS.parchment,
            padding: '32px 40px',
            maxWidth: 800,
            margin: '0 auto',
          }}
        >
          {/* Messages */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* User message */}
            {rel >= 20 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div
                  style={{
                    maxWidth: '66%',
                    padding: '12px 16px',
                    borderRadius: '12px 12px 4px 12px',
                    background: COLORS.dawnMuted,
                    border: `1px solid ${COLORS.dawnBorderActive}`,
                    fontSize: 15,
                    fontFamily: '"DM Sans", sans-serif',
                    color: COLORS.charcoal,
                    lineHeight: 1.6,
                  }}
                >
                  {typedText}
                  {showCursor && (
                    <span
                      style={{
                        display: 'inline-block',
                        width: 2,
                        height: 18,
                        background: COLORS.dawn,
                        marginLeft: 1,
                        verticalAlign: 'text-bottom',
                      }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Thinking indicator */}
            {showThinking && (
              <div
                style={{
                  opacity: thinkingOpacity,
                  paddingLeft: 16,
                  borderLeft: `2px solid ${COLORS.dawnBorder}`,
                  fontSize: 14,
                  fontFamily: '"DM Sans", sans-serif',
                  fontWeight: 500,
                  color: COLORS.textMuted,
                  fontStyle: 'italic',
                }}
              >
                Reading your context...
              </div>
            )}

            {/* Assistant response */}
            {rel >= 75 && (
              <div
                style={{
                  opacity: assistantOpacity,
                  transform: `translateY(${assistantY}px)`,
                  paddingLeft: 16,
                  borderLeft: `2px solid ${COLORS.dawnBorderActive}`,
                  fontSize: 14,
                  fontFamily: '"DM Sans", sans-serif',
                  color: COLORS.textSecondary,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {renderMarkdown(revealedText)}
              </div>
            )}
          </div>

          {/* Input bar */}
          <div
            style={{
              marginTop: 20,
              borderRadius: 12,
              background: COLORS.surfaceElevated,
              border: `1px solid ${rel >= 20 && rel < 60 ? COLORS.dawnBorderActive : COLORS.border}`,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'border 150ms',
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontFamily: '"DM Sans", sans-serif',
                color: rel < 20 ? COLORS.textGhost : 'transparent',
              }}
            >
              {rel < 20 ? 'Ask Donna anything...' : ''}
            </div>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: rel >= 20 ? COLORS.dawn : COLORS.surface,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={rel >= 20 ? '#fff' : COLORS.textGhost} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12 7-7 7 7" />
                <path d="M12 19V5" />
              </svg>
            </div>
          </div>
        </div>
      </DesktopFrame>
    </div>
  );
};
