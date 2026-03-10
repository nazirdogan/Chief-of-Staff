import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { COLORS, SCENES, FAKE_DATA } from '../constants';
import { DesktopFrame } from '../components/DesktopFrame';
import { Sidebar } from '../components/Sidebar';
import { TextOverlay } from '../components/TextOverlay';

const filters = ['All', 'Unread', 'Needs Reply', 'Starred', 'Archived by Donna'];

export const InboxScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { start, duration } = SCENES.inbox;
  const rel = frame - start;

  if (rel < 0 || rel >= duration) return null;

  const containerOpacity = interpolate(
    rel,
    [0, 12, duration - 12, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const items = FAKE_DATA.inboxItems;

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity: containerOpacity }}>
      <TextOverlay
        text="Every message. Triaged and summarised."
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
        <Sidebar activeKey="inbox" />

        <div
          style={{
            flex: 1,
            padding: '32px 40px',
            background: COLORS.parchment,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.dawn} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
              </svg>
              <span style={{
                fontSize: 22,
                fontWeight: 700,
                color: COLORS.charcoal,
                fontFamily: '"DM Sans", sans-serif',
              }}>
                Inbox
              </span>
            </div>
            <div style={{
              fontSize: 13,
              color: COLORS.textTertiary,
              fontFamily: '"DM Sans", sans-serif',
            }}>
              Unified view of messages across all connected channels
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {[
              { count: 5, label: 'total', color: COLORS.dawn },
              { count: 2, label: 'unread', color: COLORS.steel },
              { count: 2, label: 'needs reply', color: COLORS.red },
            ].map((stat, i) => (
              <div
                key={i}
                style={{
                  padding: '6px 12px',
                  border: `1px solid rgba(232,132,92,0.15)`,
                  background: COLORS.dawnMuted,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: stat.color,
                  fontFamily: '"DM Sans", sans-serif',
                }}>
                  {stat.count}
                </span>
                <span style={{
                  fontSize: 11,
                  color: COLORS.textMuted,
                  fontFamily: '"DM Sans", sans-serif',
                }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {filters.map((f, i) => (
              <div
                key={i}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: '"DM Sans", sans-serif',
                  border: i === 0 ? `1px solid ${COLORS.dawn}` : `1px solid ${COLORS.border}`,
                  background: i === 0 ? COLORS.dawnSubtle : COLORS.surface,
                  color: i === 0 ? COLORS.dawn : COLORS.textTertiary,
                }}
              >
                {f}
              </div>
            ))}
          </div>

          {/* Inbox items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {items.map((item, i) => {
              const itemDelay = 15 + i * 10;
              const itemOpacity = interpolate(
                rel,
                [itemDelay, itemDelay + 10],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              );

              return (
                <div
                  key={i}
                  style={{
                    opacity: itemOpacity,
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: `1px solid ${COLORS.border}`,
                    background: item.unread ? 'rgba(45,45,45,0.02)' : COLORS.surface,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {item.unread && (
                        <div style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: COLORS.steel,
                        }} />
                      )}
                      <span style={{
                        fontSize: 13,
                        fontWeight: item.unread ? 600 : 500,
                        color: COLORS.charcoal,
                        fontFamily: '"DM Sans", sans-serif',
                      }}>
                        {item.from}
                      </span>
                      <span style={{
                        fontSize: 11,
                        color: COLORS.textGhost,
                        fontFamily: '"DM Sans", sans-serif',
                      }}>
                        {item.email}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {item.priority && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: item.priority === 'P1' ? 'rgba(214,75,42,0.12)' : 'rgba(201,134,42,0.12)',
                          color: item.priority === 'P1' ? COLORS.red : COLORS.gold,
                          fontFamily: '"JetBrains Mono", monospace',
                        }}>
                          {item.priority}
                        </span>
                      )}
                      <span style={{
                        fontSize: 10,
                        color: COLORS.textGhost,
                        fontFamily: '"JetBrains Mono", monospace',
                      }}>
                        {item.time}
                      </span>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: item.unread ? 500 : 400,
                    color: COLORS.textSecondary,
                    fontFamily: '"DM Sans", sans-serif',
                    marginBottom: 3,
                    marginLeft: item.unread ? 14 : 0,
                  }}>
                    {item.subject}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: COLORS.textTertiary,
                    fontFamily: '"DM Sans", sans-serif',
                    marginLeft: item.unread ? 14 : 0,
                  }}>
                    {item.summary}
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
