import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../constants-v6';

const SCENE = { start: 300, duration: 6 * 30 };
const PANEL_DUR = 90; // 3s each, 2 panels

export const MontageScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 4, SCENE.duration - 4, SCENE.duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const panelIndex = Math.min(1, Math.floor(rel / PANEL_DUR));
  const panelRel = rel - panelIndex * PANEL_DUR;

  const panelOpacity = (idx: number) => {
    const pStart = idx * PANEL_DUR;
    const pEnd = pStart + PANEL_DUR;
    return interpolate(rel, [pStart, pStart + 5, pEnd - 5, pEnd], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

      {/* Panel 0: Inbox — abstract envelopes */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: panelOpacity(0) }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
          <div style={{
            fontSize: 11, fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: COLORS.dawn,
            textTransform: 'uppercase', letterSpacing: '0.12em',
            opacity: spring({ frame: panelRel - 2, fps, config: { damping: 22, stiffness: 100 } }),
          }}>
            Unified Inbox
          </div>

          {/* Three floating envelope abstractions */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end' }}>
            {[
              { label: 'Gmail', count: 3, color: '#EA4335' },
              { label: 'Slack', count: 7, color: '#4A154B' },
              { label: 'Notion', count: 2, color: '#000000' },
            ].map((src, i) => {
              const cardP = spring({ frame: panelRel - (6 + i * 4), fps, config: { damping: 18, stiffness: 100 } });
              return (
                <div key={i} style={{
                  opacity: cardP,
                  transform: `translateY(${interpolate(cardP, [0, 1], [30, 0])}px)`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: 72, height: 72, borderRadius: 18, background: COLORS.surface,
                      border: `1.5px solid ${COLORS.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={src.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                    </div>
                    {/* Count badge */}
                    <div style={{
                      position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%',
                      background: COLORS.dawn, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: COLORS.white, fontFamily: '"DM Sans", sans-serif',
                    }}>
                      {src.count}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontFamily: '"DM Sans", sans-serif', color: COLORS.textMuted, fontWeight: 500 }}>
                    {src.label}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{
            fontSize: 24, fontFamily: '"Playfair Display", serif', fontWeight: 300, color: COLORS.charcoal,
            opacity: spring({ frame: panelRel - 14, fps, config: { damping: 22, stiffness: 90 } }),
            textAlign: 'center',
          }}>
            Every message, <span style={{ fontWeight: 700, fontStyle: 'italic', color: COLORS.dawn }}>triaged.</span>
          </div>
        </div>
      </div>

      {/* Panel 1: Commitments — abstract checklist */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: panelOpacity(1) }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
          <div style={{
            fontSize: 11, fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: COLORS.dawn,
            textTransform: 'uppercase', letterSpacing: '0.12em',
            opacity: spring({ frame: panelRel - 2, fps, config: { damping: 22, stiffness: 100 } }),
          }}>
            Commitments
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 400 }}>
            {[
              { text: 'Send revenue slide to David', done: false, overdue: false },
              { text: 'Respond to Lina — Dubai', done: false, overdue: true },
              { text: 'Share talking points with Raj', done: true, overdue: false },
            ].map((c, i) => {
              const localRel = rel - 1 * PANEL_DUR;
              const cardP = spring({ frame: localRel - (5 + i * 5), fps, config: { damping: 18, stiffness: 100 } });
              return (
                <div key={i} style={{
                  opacity: cardP,
                  transform: `translateX(${interpolate(cardP, [0, 1], [30, 0])}px)`,
                  display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0',
                  borderBottom: i < 2 ? `1px solid ${COLORS.border}` : 'none',
                }}>
                  {/* Checkbox circle */}
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: `2px solid ${c.overdue ? COLORS.red : c.done ? COLORS.sage : COLORS.border}`,
                    background: c.done ? COLORS.sageMuted : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {c.done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={COLORS.sage} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                  </div>
                  <div style={{
                    fontSize: 15, fontFamily: '"DM Sans", sans-serif', fontWeight: 400,
                    color: c.done ? COLORS.textGhost : COLORS.charcoal,
                    textDecoration: c.done ? 'line-through' : 'none',
                  }}>
                    {c.text}
                  </div>
                  {c.overdue && <div style={{ fontSize: 10, fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: COLORS.red, marginLeft: 'auto' }}>OVERDUE</div>}
                </div>
              );
            })}
          </div>

          <div style={{
            fontSize: 24, fontFamily: '"Playfair Display", serif', fontWeight: 300, color: COLORS.charcoal,
            opacity: spring({ frame: panelRel - 14, fps, config: { damping: 22, stiffness: 90 } }),
            textAlign: 'center',
          }}>
            Every promise, <span style={{ fontWeight: 700, fontStyle: 'italic', color: COLORS.dawn }}>tracked.</span>
          </div>
        </div>
      </div>

    </div>
  );
};
