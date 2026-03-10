import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS, FAKE_DATA } from '../../constants-v3';
import { DesktopFrame } from '../../components/DesktopFrame';
import { Sidebar } from '../../components/Sidebar';

const SCENE = { start: 930, duration: 6 * 30 };

export const PeopleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 3, SCENE.duration - 3, SCENE.duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const contacts = FAKE_DATA.contacts;

  const getScoreColor = (score: number) => {
    if (score >= 70) return COLORS.sage;
    if (score >= 40) return '#92400E';
    return COLORS.red;
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity }}>
      {/* Kinetic overlay */}
      <div style={{ position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 200, display: 'flex', gap: 10, alignItems: 'baseline' }}>
        <div style={{ fontSize: 22, fontFamily: '"DM Sans", sans-serif', fontWeight: 400, color: COLORS.textMuted, opacity: interpolate(rel, [10, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          Every relationship,
        </div>
        <div style={{ fontSize: 26, fontFamily: '"Playfair Display", serif', fontWeight: 700, fontStyle: 'italic', color: COLORS.dawn, opacity: interpolate(rel, [18, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), transform: `scale(${interpolate(rel, [18, 24], [1.3, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})` }}>
          scored.
        </div>
      </div>

      <DesktopFrame scale={0.82}>
        <Sidebar activeKey="people" />
        <div style={{ flex: 1, padding: '28px 36px', background: COLORS.parchment, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.dawn} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>People</span>
          </div>
          <div style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: '"DM Sans", sans-serif', marginBottom: 12 }}>
            Relationship scores and interaction history
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {['All', 'VIP', 'Cold'].map((f, i) => (
              <div key={i} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 500, fontFamily: '"DM Sans", sans-serif', border: i === 0 ? `1px solid ${COLORS.dawn}` : `1px solid ${COLORS.border}`, background: i === 0 ? COLORS.dawnSubtle : COLORS.surface, color: i === 0 ? COLORS.dawn : COLORS.textTertiary }}>
                {f}
              </div>
            ))}
          </div>

          {/* Contact cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {contacts.map((c, i) => {
              const s = spring({ frame: rel - (15 + i * 6), fps, config: { damping: 10, stiffness: 250 } });
              return (
                <div key={i} style={{
                  opacity: s, transform: `translateX(${interpolate(s, [0, 1], [50, 0])}px)`,
                  padding: '12px 14px', borderRadius: 10,
                  border: `1px solid ${c.cold ? 'rgba(192,57,43,0.15)' : COLORS.border}`,
                  background: COLORS.surface,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: COLORS.dawnMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: COLORS.dawn, fontFamily: '"DM Sans", sans-serif' }}>
                        {c.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>{c.name}</span>
                          {c.vip && <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'rgba(107,33,168,0.10)', color: COLORS.purple, fontFamily: '"JetBrains Mono", monospace' }}>VIP</span>}
                          {c.cold && <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'rgba(214,75,42,0.10)', color: COLORS.red, fontFamily: '"JetBrains Mono", monospace' }}>COLD</span>}
                        </div>
                        <div style={{ fontSize: 10, color: COLORS.textGhost, fontFamily: '"DM Sans", sans-serif' }}>{c.org} · Last: {c.lastInteraction}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: getScoreColor(c.score), fontFamily: '"DM Sans", sans-serif' }}>{c.score}</div>
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
