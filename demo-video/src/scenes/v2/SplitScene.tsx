import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS, SCENES, FAKE_DATA } from '../../constants-v2';
import { Sidebar } from '../../components/Sidebar';

export const SplitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { start, duration } = SCENES.split;
  const rel = frame - start;

  if (rel < 0 || rel >= duration) return null;

  const opacity = interpolate(rel, [0, 3, duration - 3, duration], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Split: first half inbox, second half people
  const showPeople = rel >= 75; // switch at 2.5s
  const inboxOp = showPeople ? interpolate(rel, [75, 82], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  const peopleOp = showPeople ? interpolate(rel, [75, 82], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;

  const inboxItems = FAKE_DATA.inboxItems.slice(0, 4);
  const contacts = FAKE_DATA.contacts.slice(0, 4);

  const getScoreColor = (score: number) => {
    if (score >= 70) return COLORS.sage;
    if (score >= 40) return '#92400E';
    return COLORS.red;
  };

  // Active sidebar key switches
  const activeKey = showPeople ? 'people' : 'inbox';

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity }}>
      {/* Kinetic overlay */}
      <div style={{ position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 200, display: 'flex', gap: 10, alignItems: 'baseline' }}>
        {!showPeople ? (
          <>
            <div style={{ fontSize: 22, fontFamily: '"DM Sans", sans-serif', fontWeight: 400, color: COLORS.textMuted, opacity: interpolate(rel, [10, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
              Inbox
            </div>
            <div style={{ fontSize: 26, fontFamily: '"Playfair Display", serif', fontWeight: 700, fontStyle: 'italic', color: COLORS.dawn, opacity: interpolate(rel, [18, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), transform: `scale(${interpolate(rel, [18, 24], [1.3, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})` }}>
              triaged.
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 22, fontFamily: '"DM Sans", sans-serif', fontWeight: 400, color: COLORS.textMuted, opacity: interpolate(rel, [78, 84], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
              Relationships
            </div>
            <div style={{ fontSize: 26, fontFamily: '"Playfair Display", serif', fontWeight: 700, fontStyle: 'italic', color: COLORS.dawn, opacity: interpolate(rel, [86, 92], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), transform: `scale(${interpolate(rel, [86, 92], [1.3, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})` }}>
              tracked.
            </div>
          </>
        )}
      </div>

      {/* Desktop frame with split content */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) scale(0.82)', width: 1440, height: 900, borderRadius: 12, overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.25)', border: '1px solid rgba(0,0,0,0.12)', background: COLORS.parchment }}>
        <div style={{ height: 36, background: COLORS.linen, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', paddingLeft: 14, gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFBD2E' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
        </div>
        <div style={{ display: 'flex', height: 'calc(100% - 36px)' }}>
          <Sidebar activeKey={activeKey} />

          {/* Inbox view */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, padding: '28px 36px', background: COLORS.parchment, opacity: inboxOp }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.dawn} strokeWidth="2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>
                <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>Inbox</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {inboxItems.map((item, i) => {
                  const s = spring({ frame: rel - (15 + i * 6), fps, config: { damping: 10, stiffness: 250 } });
                  return (
                    <div key={i} style={{ opacity: s, transform: `translateX(${interpolate(s, [0, 1], [50, 0])}px)`, padding: '10px 14px', borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.surface }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {item.unread && <div style={{ width: 5, height: 5, borderRadius: '50%', background: COLORS.steel }} />}
                          <span style={{ fontSize: 12, fontWeight: item.unread ? 600 : 500, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>{item.from}</span>
                        </div>
                        {item.priority && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: item.priority === 'P1' ? 'rgba(214,75,42,0.12)' : 'rgba(201,134,42,0.12)', color: item.priority === 'P1' ? COLORS.red : COLORS.gold, fontFamily: '"JetBrains Mono", monospace' }}>{item.priority}</span>}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.textSecondary, fontFamily: '"DM Sans", sans-serif' }}>{item.subject}</div>
                      <div style={{ fontSize: 10, color: COLORS.textTertiary, fontFamily: '"DM Sans", sans-serif', marginTop: 2 }}>{item.summary}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* People view */}
            <div style={{ position: 'absolute', inset: 0, padding: '28px 36px', background: COLORS.parchment, opacity: peopleOp }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.dawn} strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>People</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {contacts.map((c, i) => {
                  const s = spring({ frame: rel - (80 + i * 6), fps, config: { damping: 10, stiffness: 250 } });
                  return (
                    <div key={i} style={{ opacity: s, transform: `translateX(${interpolate(s, [0, 1], [50, 0])}px)`, padding: '12px 14px', borderRadius: 10, border: `1px solid ${c.cold ? 'rgba(192,57,43,0.15)' : COLORS.border}`, background: COLORS.surface }}>
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
          </div>
        </div>
      </div>
    </div>
  );
};
