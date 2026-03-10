import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { COLORS, SCENES, FAKE_DATA } from '../constants';
import { DesktopFrame } from '../components/DesktopFrame';
import { Sidebar } from '../components/Sidebar';
import { TextOverlay } from '../components/TextOverlay';

export const BriefingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { start, duration } = SCENES.briefing;
  const rel = frame - start;

  if (rel < 0 || rel >= duration) return null;

  const containerOpacity = interpolate(
    rel,
    [0, 15, duration - 12, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Scroll effect for briefing items
  const scrollY = interpolate(
    rel,
    [60, 200],
    [0, -80],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const items = FAKE_DATA.briefingItems;

  const getPriorityColor = (priority: string) => {
    if (priority === 'critical') return COLORS.red;
    if (priority === 'high') return COLORS.dawn;
    return 'transparent';
  };

  const getSentimentBadge = (sentiment: string | null) => {
    if (sentiment === 'urgent') return { label: 'URGENT', bg: COLORS.goldMuted, border: 'rgba(244,200,150,0.2)', color: '#D4A054' };
    if (sentiment === 'action') return { label: 'ACTION NEEDED', bg: COLORS.dawnMuted, border: COLORS.dawnBorder, color: COLORS.dawn };
    if (sentiment === 'cold') return { label: 'GOING COLD', bg: 'rgba(214,75,42,0.08)', border: 'rgba(214,75,42,0.2)', color: COLORS.red };
    return null;
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity: containerOpacity }}>
      {/* Text overlay */}
      <TextOverlay
        text="Your morning briefing. Everything that matters."
        startFrame={start}
        durationFrames={80}
        fontSize={28}
        fontFamily='"DM Sans", sans-serif'
        fontWeight={500}
        color={COLORS.charcoal}
        position="top"
        maxWidth={600}
      />

      <DesktopFrame>
        <Sidebar activeKey="today" />

        {/* Main content */}
        <div
          style={{
            flex: 1,
            padding: '32px 40px',
            overflow: 'hidden',
            background: COLORS.parchment,
          }}
        >
          {/* Greeting header */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 12,
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 600,
                color: 'rgba(141,153,174,0.6)',
                marginBottom: 6,
                letterSpacing: '0.02em',
              }}
            >
              {FAKE_DATA.date.toUpperCase()}
            </div>
            <div
              style={{
                fontSize: 28,
                fontFamily: '"Playfair Display", serif',
                fontWeight: 300,
                color: COLORS.charcoal,
                letterSpacing: '-0.02em',
              }}
            >
              Good morning, {FAKE_DATA.userName}
            </div>
            <div
              style={{
                fontSize: 13,
                fontFamily: '"DM Sans", sans-serif',
                color: COLORS.textTertiary,
                marginTop: 4,
              }}
            >
              5 priorities · 2 meetings · 1 commitment due
            </div>
          </div>

          {/* Briefing items */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              transform: `translateY(${scrollY}px)`,
            }}
          >
            {items.map((item, i) => {
              const itemDelay = 20 + i * 15;
              const itemOpacity = interpolate(
                rel,
                [itemDelay, itemDelay + 12],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              );
              const itemX = interpolate(
                rel,
                [itemDelay, itemDelay + 12],
                [20, 0],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              );

              const badge = getSentimentBadge(item.sentiment);

              return (
                <div
                  key={i}
                  style={{
                    opacity: itemOpacity,
                    transform: `translateX(${itemX}px)`,
                    padding: '16px 20px',
                    borderRadius: 12,
                    border: `1px solid ${COLORS.border}`,
                    borderLeft: `3px solid ${getPriorityColor(item.priority)}`,
                    background: COLORS.surface,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    {/* Rank badge */}
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: COLORS.dawnMuted,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 600,
                        color: COLORS.dawn,
                        fontFamily: '"DM Sans", sans-serif',
                        flexShrink: 0,
                      }}
                    >
                      {item.rank}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: COLORS.charcoal,
                        fontFamily: '"DM Sans", sans-serif',
                        flex: 1,
                      }}
                    >
                      {item.title}
                    </div>
                    {badge && (
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: badge.bg,
                          border: `1px solid ${badge.border}`,
                          color: badge.color,
                          fontFamily: '"JetBrains Mono", monospace',
                          letterSpacing: '0.03em',
                          flexShrink: 0,
                        }}
                      >
                        {badge.label}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: COLORS.textSecondary,
                      fontFamily: '"DM Sans", sans-serif',
                      lineHeight: 1.5,
                      marginLeft: 32,
                    }}
                  >
                    {item.summary}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: COLORS.textGhost,
                      fontFamily: '"JetBrains Mono", monospace',
                      marginTop: 6,
                      marginLeft: 32,
                    }}
                  >
                    Source: {item.source}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DesktopFrame>
    </div>
  );
};
