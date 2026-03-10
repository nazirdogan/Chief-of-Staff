'use client';

import { Activity } from 'lucide-react';
import { HeartbeatMonitor } from '@/components/heartbeat/HeartbeatMonitor';

const c = {
  text: '#2D2D2D',
  textTertiary: 'rgba(45,45,45,0.6)',
  dawn: '#E8845C',
};

export default function HeartbeatPage() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Activity size={20} color={c.dawn} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: c.text, margin: 0 }}>Heartbeat Monitor</h1>
        </div>
        <p style={{ fontSize: 13, color: c.textTertiary, margin: 0 }}>
          Configure how often your integrations sync and view recent run history
        </p>
      </div>
      <HeartbeatMonitor />
    </div>
  );
}
