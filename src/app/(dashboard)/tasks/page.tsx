'use client';

import { CheckCircle2 } from 'lucide-react';
import { TaskQueue } from '@/components/tasks/TaskQueue';

const c = {
  text: '#2D2D2D',
  textTertiary: 'rgba(45,45,45,0.6)',
  dawn: '#E8845C',
};

export default function TasksPage() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <CheckCircle2 size={20} color={c.dawn} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: c.text, margin: 0 }}>Tasks</h1>
        </div>
        <p style={{ fontSize: 13, color: c.textTertiary, margin: 0 }}>
          Promises you made and requests you received. Resolve, snooze, or dismiss.
        </p>
      </div>
      <TaskQueue />
    </div>
  );
}
