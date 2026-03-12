import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../constants-v3';
import { DesktopFrame } from '../../components/DesktopFrame';
import { Sidebar } from '../../components/Sidebar';

const SCENE = { start: 750, duration: 6 * 30 };

const commitments = [
  { text: 'Send Q4 revenue slide to David', due: 'Today', daysLeft: 0, confidence: 'high', source: 'Slack — David Park' },
  { text: 'Respond to Lina about Dubai timeline', due: 'Overdue', daysLeft: -2, confidence: 'high', source: 'Gmail — Lina Khoury' },
  { text: 'Share investor talking points with Raj', due: 'Wed', daysLeft: 2, confidence: 'medium', source: 'Google Calendar' },
  { text: 'Review onboarding mockups and leave feedback', due: 'Thu', daysLeft: 3, confidence: 'medium', source: 'Slack — #product' },
];

export const CommitmentsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - SCENE.start;
  if (rel < 0 || rel >= SCENE.duration) return null;

  const opacity = interpolate(rel, [0, 3, SCENE.duration - 3, SCENE.duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ position: 'absolute', inset: 0, background: COLORS.parchment, opacity }}>
      {/* Kinetic overlay */}
      <div style={{ position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 200, display: 'flex', gap: 10, alignItems: 'baseline' }}>
        <div style={{ fontSize: 22, fontFamily: '"DM Sans", sans-serif', fontWeight: 400, color: COLORS.textMuted, opacity: interpolate(rel, [10, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          Every promise,
        </div>
        <div style={{ fontSize: 26, fontFamily: '"Playfair Display", serif', fontWeight: 700, fontStyle: 'italic', color: COLORS.dawn, opacity: interpolate(rel, [18, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), transform: `scale(${interpolate(rel, [18, 24], [1.3, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})` }}>
          tracked.
        </div>
      </div>

      <DesktopFrame scale={0.82}>
        <Sidebar activeKey="commitments" />
        <div style={{ flex: 1, padding: '28px 36px', background: COLORS.parchment, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.dawn} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
            <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>Commitments</span>
          </div>
          <div style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: '"DM Sans", sans-serif', marginBottom: 16 }}>
            {"Promises you've made, extracted from your conversations"}
          </div>

          {/* Confidence filter */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {['All', 'High confidence', 'Medium'].map((f, i) => (
              <div key={i} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 500, fontFamily: '"DM Sans", sans-serif', border: i === 0 ? `1px solid ${COLORS.dawn}` : `1px solid ${COLORS.border}`, background: i === 0 ? COLORS.dawnSubtle : COLORS.surface, color: i === 0 ? COLORS.dawn : COLORS.textTertiary }}>
                {f}
              </div>
            ))}
          </div>

          {/* Commitment cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {commitments.map((c, i) => {
              const s = spring({ frame: rel - (18 + i * 7), fps, config: { damping: 10, stiffness: 250 } });
              const isOverdue = c.daysLeft < 0;
              const isDueToday = c.daysLeft === 0;
              return (
                <div key={i} style={{
                  opacity: s, transform: `translateX(${interpolate(s, [0, 1], [50, 0])}px)`,
                  padding: '14px 16px', borderRadius: 10,
                  border: `1px solid ${isOverdue ? 'rgba(214,75,42,0.2)' : COLORS.border}`,
                  borderLeft: `3px solid ${isOverdue ? COLORS.red : isDueToday ? COLORS.dawn : COLORS.steel}`,
                  background: COLORS.surface,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif', marginBottom: 4 }}>{c.text}</div>
                      <div style={{ fontSize: 10, color: COLORS.textGhost, fontFamily: '"JetBrains Mono", monospace' }}>Source: {c.source}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0, marginLeft: 16 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: isOverdue ? 'rgba(214,75,42,0.1)' : isDueToday ? COLORS.dawnMuted : 'rgba(69,123,157,0.1)', color: isOverdue ? COLORS.red : isDueToday ? COLORS.dawn : COLORS.steel, fontFamily: '"JetBrains Mono", monospace' }}>
                        {c.due}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 3, background: c.confidence === 'high' ? COLORS.sageMuted : COLORS.goldMuted, color: c.confidence === 'high' ? COLORS.sage : COLORS.gold, fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase' }}>
                        {c.confidence}
                      </span>
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {['Resolve', 'Snooze', 'Dismiss'].map((action, j) => (
                      <div key={j} style={{ fontSize: 10, fontWeight: 500, padding: '4px 10px', borderRadius: 6, border: `1px solid ${j === 0 ? COLORS.dawnBorder : COLORS.border}`, background: j === 0 ? COLORS.dawnMuted : COLORS.surface, color: j === 0 ? COLORS.dawn : COLORS.textMuted, fontFamily: '"DM Sans", sans-serif' }}>
                        {action}
                      </div>
                    ))}
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
