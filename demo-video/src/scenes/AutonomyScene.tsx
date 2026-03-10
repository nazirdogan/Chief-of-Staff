import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { COLORS, SCENES, FAKE_DATA } from '../constants';
import { DesktopFrame } from '../components/DesktopFrame';
import { Sidebar } from '../components/Sidebar';
import { TextOverlay } from '../components/TextOverlay';

export const AutonomyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { start, duration } = SCENES.autonomy;
  const rel = frame - start;

  if (rel < 0 || rel >= duration) return null;

  const containerOpacity = interpolate(
    rel,
    [0, 12, duration - 12, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Toast slides up from bottom
  const toastAppear = interpolate(
    rel,
    [30, 45],
    [80, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const toastOpacity = interpolate(
    rel,
    [30, 42],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // "Confirm" button gets highlighted/pressed
  const confirmHighlight = rel >= 90;
  const confirmPressOpacity = interpolate(
    rel,
    [90, 95, 100],
    [0, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Success state after confirm
  const showSuccess = rel >= 100;
  const successOpacity = interpolate(
    rel,
    [100, 112],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Timer bar animation (30 second countdown shown as progress)
  const timerWidth = interpolate(
    rel,
    [45, 90],
    [100, 65],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity: containerOpacity }}>
      <TextOverlay
        text="She acts for you. With your permission."
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
        <Sidebar activeKey="today" />

        {/* Main content - briefing in background, dimmed */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            background: COLORS.parchment,
            padding: '32px 40px',
          }}
        >
          {/* Dimmed briefing content in background */}
          <div style={{ opacity: 0.3 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{
                fontSize: 28,
                fontFamily: '"Playfair Display", serif',
                fontWeight: 300,
                color: COLORS.charcoal,
              }}>
                Good morning, {FAKE_DATA.userName}
              </div>
            </div>
            {FAKE_DATA.briefingItems.slice(0, 3).map((item, i) => (
              <div
                key={i}
                style={{
                  padding: '14px 20px',
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  background: COLORS.surface,
                  marginBottom: 6,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>
                  {item.title}
                </div>
              </div>
            ))}
          </div>

          {/* One-Tap Toast — bottom center */}
          {rel >= 30 && !showSuccess && (
            <div
              style={{
                position: 'absolute',
                bottom: 40,
                left: '50%',
                transform: `translateX(-50%) translateY(${toastAppear}px)`,
                opacity: toastOpacity,
                width: 480,
                background: COLORS.white,
                borderRadius: 14,
                border: `1px solid ${COLORS.border}`,
                boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
                overflow: 'hidden',
              }}
            >
              {/* Timer bar */}
              <div
                style={{
                  height: 3,
                  background: COLORS.dawnMuted,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${timerWidth}%`,
                    background: COLORS.dawn,
                    borderRadius: 2,
                  }}
                />
              </div>

              <div style={{ padding: '16px 20px' }}>
                {/* Action label */}
                <div style={{
                  fontSize: 10,
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 600,
                  color: COLORS.dawn,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 8,
                }}>
                  SUGGESTED ACTION
                </div>

                {/* Action content */}
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: COLORS.charcoal,
                  fontFamily: '"DM Sans", sans-serif',
                  marginBottom: 4,
                }}>
                  {FAKE_DATA.autonomyAction.title}
                </div>
                <div style={{
                  fontSize: 12,
                  color: COLORS.textTertiary,
                  fontFamily: '"DM Sans", sans-serif',
                  marginBottom: 14,
                }}>
                  {FAKE_DATA.autonomyAction.description}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <div
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      borderRadius: 8,
                      background: confirmHighlight ? COLORS.dawn : COLORS.dawnMuted,
                      border: `1px solid ${COLORS.dawnBorder}`,
                      color: confirmHighlight ? COLORS.white : COLORS.dawn,
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: '"DM Sans", sans-serif',
                      textAlign: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    Confirm
                  </div>
                  <div
                    style={{
                      padding: '10px 20px',
                      borderRadius: 8,
                      background: COLORS.surface,
                      border: `1px solid ${COLORS.border}`,
                      color: COLORS.textMuted,
                      fontSize: 13,
                      fontWeight: 500,
                      fontFamily: '"DM Sans", sans-serif',
                      textAlign: 'center',
                    }}
                  >
                    Dismiss
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success state */}
          {showSuccess && (
            <div
              style={{
                position: 'absolute',
                bottom: 40,
                left: '50%',
                transform: 'translateX(-50%)',
                opacity: successOpacity,
                width: 480,
                background: COLORS.white,
                borderRadius: 14,
                border: `1px solid rgba(82,183,136,0.25)`,
                boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: COLORS.sageMuted,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.sage} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: COLORS.charcoal,
                  fontFamily: '"DM Sans", sans-serif',
                }}>
                  Calendar reminder set
                </div>
                <div style={{
                  fontSize: 11,
                  color: COLORS.sage,
                  fontFamily: '"DM Sans", sans-serif',
                }}>
                  Added to your calendar for 11:00 AM
                </div>
              </div>
            </div>
          )}
        </div>
      </DesktopFrame>
    </div>
  );
};
