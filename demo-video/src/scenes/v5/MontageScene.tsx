import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS, FAKE_DATA } from '../../constants-v5';
import { Sidebar } from '../../components/Sidebar';

const SCENE = { start: 300, duration: 6 * 30 };
const PANEL_DUR = 60; // 2s each

export const MontageScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 3, SCENE.duration - 3, SCENE.duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const panelIndex = Math.min(2, Math.floor(rel / PANEL_DUR));
  const panelRel = rel - panelIndex * PANEL_DUR;

  const getScoreColor = (score: number) => {
    if (score >= 70) return COLORS.sage;
    if (score >= 40) return '#92400E';
    return COLORS.red;
  };

  const panelOpacity = (idx: number) => {
    const pStart = idx * PANEL_DUR;
    const pEnd = pStart + PANEL_DUR;
    return interpolate(rel, [pStart, pStart + 4, pEnd - 4, pEnd], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  };

  const activeKey = panelIndex === 0 ? 'inbox' : panelIndex === 1 ? 'commitments' : 'people';

  const kineticTexts = [
    { pre: 'Inbox,', em: 'triaged.' },
    { pre: 'Every promise,', em: 'tracked.' },
    { pre: 'Relationships,', em: 'scored.' },
  ];
  const kt = kineticTexts[panelIndex];

  // Each panel has a different 3D tilt direction
  const tiltAngles = [
    { rotY: 3, rotX: -1 },   // inbox: slight right tilt
    { rotY: -2, rotX: 1 },   // commitments: slight left tilt
    { rotY: 4, rotX: -1.5 }, // people: more right tilt
  ];
  const tilt = tiltAngles[panelIndex];

  // Smooth drift within each panel
  const panelDriftY = interpolate(panelRel, [0, PANEL_DUR], [tilt.rotY, tilt.rotY * -0.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const panelDriftX = interpolate(panelRel, [0, PANEL_DUR], [tilt.rotX, tilt.rotX * -0.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const frameScale = 0.78;

  const textOp = interpolate(panelRel, [2, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity, perspective: 1400 }}>
      {/* Floating text overlay */}
      <div style={{
        position: 'absolute', top: 46, left: '50%', zIndex: 200,
        transform: `translateX(-50%) translateZ(70px)`,
        display: 'flex', gap: 10, alignItems: 'baseline', opacity: textOp,
      }}>
        <div style={{ fontSize: 22, fontFamily: '"DM Sans", sans-serif', fontWeight: 400, color: COLORS.textMuted, transform: `translateY(${interpolate(textOp, [0, 1], [15, 0])}px)` }}>
          {kt.pre}
        </div>
        <div style={{ fontSize: 26, fontFamily: '"Playfair Display", serif', fontWeight: 700, fontStyle: 'italic', color: COLORS.dawn, opacity: interpolate(panelRel, [8, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), transform: `translateY(${interpolate(panelRel, [8, 14], [12, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)` }}>
          {kt.em}
        </div>
      </div>

      {/* 3D floating frame with drift */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: `scale(${frameScale}) rotateY(${panelDriftY}deg) rotateX(${panelDriftX}deg)`,
        transformStyle: 'preserve-3d',
      }}>
        <div style={{
          width: 1440, height: 900, borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 30px 100px rgba(0,0,0,0.2), 0 10px 40px rgba(0,0,0,0.1)',
          border: '1px solid rgba(0,0,0,0.08)', background: COLORS.parchment,
        }}>
          <div style={{ height: 36, background: COLORS.linen, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', paddingLeft: 14, gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFBD2E' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 12, fontFamily: '"DM Sans", sans-serif', color: COLORS.textGhost, paddingRight: 14 }}>Donna</div>
          </div>
          <div style={{ display: 'flex', height: 'calc(100% - 36px)' }}>
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
                    const cardP = spring({ frame: panelRel - (5 + i * 4), fps, config: { damping: 18, stiffness: 120 } });
                    const cardY = interpolate(cardP, [0, 1], [35, 0]);
                    return (
                      <div key={i} style={{ opacity: cardP, transform: `translateY(${cardY}px) rotateX(${interpolate(cardP, [0, 1], [6, 0])}deg)`, transformOrigin: 'center bottom', padding: '10px 14px', borderRadius: 10, border: `1px solid ${COLORS.border}`, background: item.unread ? 'rgba(45,45,45,0.02)' : COLORS.surface, boxShadow: `0 ${interpolate(cardP, [0, 1], [0, 3])}px ${interpolate(cardP, [0, 1], [0, 12])}px rgba(0,0,0,0.03)` }}>
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
                  const cardP = spring({ frame: localRel - (5 + i * 4), fps, config: { damping: 18, stiffness: 120 } });
                  const cardY = interpolate(cardP, [0, 1], [35, 0]);
                  return (
                    <div key={i} style={{ opacity: cardP, transform: `translateY(${cardY}px) rotateX(${interpolate(cardP, [0, 1], [6, 0])}deg)`, transformOrigin: 'center bottom', padding: '12px 16px', borderRadius: 10, border: `1px solid ${c.overdue ? 'rgba(214,75,42,0.2)' : COLORS.border}`, borderLeft: `3px solid ${c.overdue ? COLORS.red : COLORS.dawn}`, background: COLORS.surface, marginBottom: 4, boxShadow: `0 ${interpolate(cardP, [0, 1], [0, 3])}px ${interpolate(cardP, [0, 1], [0, 12])}px rgba(0,0,0,0.03)` }}>
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
                  const cardP = spring({ frame: localRel - (5 + i * 4), fps, config: { damping: 18, stiffness: 120 } });
                  const cardY = interpolate(cardP, [0, 1], [35, 0]);
                  return (
                    <div key={i} style={{ opacity: cardP, transform: `translateY(${cardY}px) rotateX(${interpolate(cardP, [0, 1], [6, 0])}deg)`, transformOrigin: 'center bottom', padding: '12px 14px', borderRadius: 10, border: `1px solid ${c.cold ? 'rgba(192,57,43,0.15)' : COLORS.border}`, background: COLORS.surface, marginBottom: 4, boxShadow: `0 ${interpolate(cardP, [0, 1], [0, 3])}px ${interpolate(cardP, [0, 1], [0, 12])}px rgba(0,0,0,0.03)` }}>
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
          </div>
        </div>
      </div>
    </div>
  );
};
