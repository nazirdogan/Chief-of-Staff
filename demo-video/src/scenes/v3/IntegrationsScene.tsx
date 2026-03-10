import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../constants-v3';
import { DesktopFrame } from '../../components/DesktopFrame';
import { Sidebar } from '../../components/Sidebar';

const SCENE = { start: 1290, duration: 6 * 30 };

const integrations = [
  { name: 'Gmail', desc: 'Read emails, extract commitments', icon: '✉', connected: true, color: '#EA4335' },
  { name: 'Google Calendar', desc: 'Meetings, events, scheduling', icon: '📅', connected: true, color: '#4285F4' },
  { name: 'Slack', desc: 'Messages, channels, threads', icon: '💬', connected: true, color: '#4A154B' },
  { name: 'Notion', desc: 'Documents, databases, notes', icon: '📝', connected: true, color: '#000000' },
  { name: 'Outlook', desc: 'Microsoft email and calendar', icon: '📨', connected: false, color: '#0078D4' },
  { name: 'Linear', desc: 'Issue tracking, project status', icon: '🔷', connected: false, color: '#5E6AD2' },
];

export const IntegrationsScene: React.FC = () => {
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
          Connects to
        </div>
        <div style={{ fontSize: 26, fontFamily: '"Playfair Display", serif', fontWeight: 700, fontStyle: 'italic', color: COLORS.dawn, opacity: interpolate(rel, [18, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), transform: `scale(${interpolate(rel, [18, 24], [1.3, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})` }}>
          everything.
        </div>
      </div>

      <DesktopFrame scale={0.82}>
        <Sidebar activeKey="today" />
        <div style={{ flex: 1, padding: '28px 36px', background: COLORS.parchment, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.dawn} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
            <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>Integrations</span>
          </div>
          <div style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: '"DM Sans", sans-serif', marginBottom: 16 }}>
            Connect your tools. Donna reads them all.
          </div>

          {/* Integration grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {integrations.map((intg, i) => {
              const s = spring({ frame: rel - (15 + i * 5), fps, config: { damping: 10, stiffness: 250 } });
              return (
                <div key={i} style={{
                  opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.9, 1])})`,
                  padding: '14px 16px', borderRadius: 10,
                  border: `1px solid ${intg.connected ? 'rgba(82,183,136,0.2)' : COLORS.border}`,
                  background: COLORS.surface,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ fontSize: 24, width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(45,45,45,0.04)' }}>
                    {intg.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.charcoal, fontFamily: '"DM Sans", sans-serif' }}>{intg.name}</div>
                    <div style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: '"DM Sans", sans-serif' }}>{intg.desc}</div>
                  </div>
                  <div style={{
                    fontSize: 9, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
                    background: intg.connected ? COLORS.sageMuted : COLORS.surface,
                    border: `1px solid ${intg.connected ? 'rgba(82,183,136,0.25)' : COLORS.border}`,
                    color: intg.connected ? COLORS.sage : COLORS.textGhost,
                    fontFamily: '"JetBrains Mono", monospace',
                  }}>
                    {intg.connected ? 'CONNECTED' : 'CONNECT'}
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
