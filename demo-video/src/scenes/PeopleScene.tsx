import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { COLORS, SCENES, FAKE_DATA } from '../constants';
import { DesktopFrame } from '../components/DesktopFrame';
import { Sidebar } from '../components/Sidebar';
import { TextOverlay } from '../components/TextOverlay';

const filters = ['All', 'VIP', 'Cold'];

export const PeopleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { start, duration } = SCENES.people;
  const rel = frame - start;

  if (rel < 0 || rel >= duration) return null;

  const containerOpacity = interpolate(
    rel,
    [0, 12, duration - 12, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const contacts = FAKE_DATA.contacts;

  const getScoreColor = (score: number) => {
    if (score >= 70) return COLORS.sage;
    if (score >= 40) return '#92400E';
    return COLORS.red;
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity: containerOpacity }}>
      <TextOverlay
        text="Never let a relationship go cold."
        startFrame={start}
        durationFrames={60}
        fontSize={28}
        fontFamily='"DM Sans", sans-serif'
        fontWeight={500}
        color={COLORS.charcoal}
        position="top"
        maxWidth={500}
      />

      <DesktopFrame>
        <Sidebar activeKey="people" />

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
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span style={{
                fontSize: 22,
                fontWeight: 700,
                color: COLORS.charcoal,
                fontFamily: '"DM Sans", sans-serif',
              }}>
                People
              </span>
            </div>
            <div style={{
              fontSize: 13,
              color: COLORS.textTertiary,
              fontFamily: '"DM Sans", sans-serif',
            }}>
              Your contacts with relationship scores and interaction history
            </div>
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

          {/* Contact cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {contacts.map((contact, i) => {
              const itemDelay = 12 + i * 8;
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
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: `1px solid ${contact.cold ? 'rgba(192,57,43,0.15)' : COLORS.border}`,
                    background: COLORS.surface,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* Avatar circle */}
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: COLORS.dawnMuted,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                          fontWeight: 600,
                          color: COLORS.dawn,
                          fontFamily: '"DM Sans", sans-serif',
                        }}
                      >
                        {contact.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: COLORS.charcoal,
                            fontFamily: '"DM Sans", sans-serif',
                          }}>
                            {contact.name}
                          </span>
                          {contact.vip && (
                            <span style={{
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: 'rgba(107,33,168,0.10)',
                              color: COLORS.purple,
                              fontFamily: '"JetBrains Mono", monospace',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}>
                              VIP
                            </span>
                          )}
                          {contact.cold && (
                            <span style={{
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: 'rgba(214,75,42,0.10)',
                              color: COLORS.red,
                              fontFamily: '"JetBrains Mono", monospace',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}>
                              COLD
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: 11,
                          color: COLORS.textGhost,
                          fontFamily: '"DM Sans", sans-serif',
                          marginTop: 1,
                        }}>
                          {contact.email}
                        </div>
                      </div>
                    </div>

                    {/* Score */}
                    <div style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: getScoreColor(contact.score),
                      fontFamily: '"DM Sans", sans-serif',
                    }}>
                      {contact.score}
                    </div>
                  </div>

                  {/* Meta row */}
                  <div style={{
                    display: 'flex',
                    gap: 16,
                    marginTop: 8,
                    marginLeft: 48,
                    fontSize: 11,
                    color: COLORS.textGhost,
                    fontFamily: '"DM Sans", sans-serif',
                  }}>
                    <span>{contact.org}</span>
                    <span>Last: {contact.lastInteraction}</span>
                    <span>{contact.interactions30d} interactions (30d)</span>
                    {contact.commitments > 0 && (
                      <span style={{ color: COLORS.dawn }}>{contact.commitments} open commitment{contact.commitments > 1 ? 's' : ''}</span>
                    )}
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
