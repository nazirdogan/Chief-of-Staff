import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS, FAKE_DATA } from '../../constants-v4';
import { DesktopFrame } from '../../components/DesktopFrame';
import { Sidebar } from '../../components/Sidebar';

const SCENE = { start: 300, duration: 6 * 30 };

// 3 rapid panels: inbox (0-60), commitments (60-120), people (120-180)
const PANEL_DUR = 60; // 2s each

export const MontageScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 2, SCENE.duration - 2, SCENE.duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Which panel is active
  const panelIndex = Math.min(2, Math.floor(rel / PANEL_DUR));
  const panelRel = rel - panelIndex * PANEL_DUR;

  const getScoreColor = (score: number) => {
    if (score >= 70) return COLORS.sage;
    if (score >= 40) return '#92400E';
    return COLORS.red;
  };

  // Cross-fade between panels
  const panelOpacity = (idx: number) => {
    const pStart = idx * PANEL_DUR;
    const pEnd = pStart + PANEL_DUR;
    return interpolate(rel, [pStart, pStart + 3, pEnd - 3, pEnd], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  };

  const activeKey = panelIndex === 0 ? 'inbox' : panelIndex === 1 ? 'commitments' : 'people';

  // Kinetic text per panel
  const kineticTexts = [
    { pre: 'Inbox,', em: 'triaged.' },
    { pre: 'Every promise,', em: 'tracked.' },
    { pre: 'Relationships,', em: 'scored.' },
  ];
  const kt = kineticTexts[panelIndex];

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity }}>
      {/* Kinetic overlay — switches per panel */}
      <div style={{ position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 200, display: 'flex', gap: 10, alignItems: 'baseline' }}>
        <div style={{ fontSize: 22, fontFamily: '"DM Sans", sans-serif', fontWeight: 400, color: COLORS.textMuted, opacity: interpolate(panelRel, [3, 7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          {kt.pre}
        </div>
        <div style={{ fontSize: 26, fontFamily: '"Playfair Display", serif', fontWeight: 700, fontStyle: 'italic', color: COLORS.dawn, opacity: interpolate(panelRel, [8, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), transform: `scale(${interpolate(panelRel, [8, 12], [1.3, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})` }}>
          {kt.em}
        </div>
      </div>

      <DesktopFrame scale={0.82}>
        <Sidebar activeKey={activeKey} />
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

          {/* Panel 0: Inbox */}
          <div style={{ position: 'absolute', inset: 0, padding: '28px 36px', background: COLORS.parchment, opacity: panelOpacity(0) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.dawn} strokeWidth="2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>
              <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>Inbox</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {FAKE_DATA.inboxItems.slice(0, 4).map((item, i) => {
                const s = spring({ frame: panelRel - (4 + i * 3), fps, config: { damping: 8, stiffness: 400 } });
                return (
                  <div key={i} style={{ opacity: s, transform: `translateX(${interpolate(s, [0, 1], [60, 0])}px)`, padding: '10px 14px', borderRadius: 10, border: `1px solid ${COLORS.border}`, background: item.unread ? 'rgba(45,45,45,0.02)' : COLORS.surface }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {item.unread && <div style={{ width: 5, height: 5, borderRadius: '50%', background: COLORS.steel }} />}
                        <span style={{ fontSize: 12, fontWeight: item.unread ? 600 : 500, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>{item.from}</span>
                      </div>
                      {item.priority && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: item.priority === 'P1' ? 'rgba(214,75,42,0.12)' : 'rgba(201,134,42,0.12)', color: item.priority === 'P1' ? COLORS.red : COLORS.gold, fontFamily: '"JetBrains Mono", monospace' }}>{item.priority}</span>}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.textSecondary, fontFamily: '"DM Sans", sans-serif' }}>{item.subject}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel 1: Commitments */}
          <div style={{ position: 'absolute', inset: 0, padding: '28px 36px', background: COLORS.parchment, opacity: panelOpacity(1) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.dawn} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
              <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>Commitments</span>
            </div>
            {[
              { text: 'Send Q4 revenue slide to David', due: 'Today', overdue: false },
              { text: 'Respond to Lina about Dubai timeline', due: 'Overdue', overdue: true },
              { text: 'Share investor talking points with Raj', due: 'Wed', overdue: false },
              { text: 'Review onboarding mockups', due: 'Thu', overdue: false },
            ].map((c, i) => {
              const localRel = rel - 1 * PANEL_DUR;
              const s = spring({ frame: localRel - (4 + i * 3), fps, config: { damping: 8, stiffness: 400 } });
              return (
                <div key={i} style={{ opacity: s, transform: `translateX(${interpolate(s, [0, 1], [60, 0])}px)`, padding: '12px 16px', borderRadius: 10, border: `1px solid ${c.overdue ? 'rgba(214,75,42,0.2)' : COLORS.border}`, borderLeft: `3px solid ${c.overdue ? COLORS.red : COLORS.dawn}`, background: COLORS.surface, marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>{c.text}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: c.overdue ? 'rgba(214,75,42,0.1)' : COLORS.dawnMuted, color: c.overdue ? COLORS.red : COLORS.dawn, fontFamily: '"JetBrains Mono", monospace' }}>{c.due}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Panel 2: People */}
          <div style={{ position: 'absolute', inset: 0, padding: '28px 36px', background: COLORS.parchment, opacity: panelOpacity(2) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.dawn} strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>People</span>
            </div>
            {FAKE_DATA.contacts.slice(0, 4).map((c, i) => {
              const localRel = rel - 2 * PANEL_DUR;
              const s = spring({ frame: localRel - (4 + i * 3), fps, config: { damping: 8, stiffness: 400 } });
              return (
                <div key={i} style={{ opacity: s, transform: `translateX(${interpolate(s, [0, 1], [60, 0])}px)`, padding: '12px 14px', borderRadius: 10, border: `1px solid ${c.cold ? 'rgba(192,57,43,0.15)' : COLORS.border}`, background: COLORS.surface, marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: COLORS.dawnMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: COLORS.dawn, fontFamily: '"DM Sans", sans-serif' }}>
                        {c.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>{c.name}</span>
                          {c.vip && <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'rgba(107,33,168,0.10)', color: COLORS.purple, fontFamily: '"JetBrains Mono", monospace' }}>VIP</span>}
                          {c.cold && <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'rgba(214,75,42,0.10)', color: COLORS.red, fontFamily: '"JetBrains Mono", monospace' }}>COLD</span>}
                        </div>
                        <div style={{ fontSize: 10, color: COLORS.textGhost, fontFamily: '"DM Sans", sans-serif' }}>{c.org}</div>
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
