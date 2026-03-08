'use client';

import { useState } from 'react';
import { Cpu, Moon, History, Loader2 } from 'lucide-react';
import { AMSweepPanel } from '@/components/operations/AMSweepPanel';
import { TimeBlockPanel } from '@/components/operations/TimeBlockPanel';
import { CompletionReportPanel } from '@/components/operations/CompletionReport';

const c = {
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.85)',
  textTertiary: 'rgba(255,255,255,0.55)',
  border: 'rgba(255,255,255,0.07)',
  dawnMuted: 'rgba(232,132,92,0.15)',
  dawn: '#E8845C',
  surface: 'rgba(255,255,255,0.04)',
};

export default function OperationsPage() {
  const [runningOvernight, setRunningOvernight] = useState(false);
  const [overnightDone, setOvernightDone] = useState(false);

  async function runOvernight() {
    setRunningOvernight(true);
    try {
      // Trigger overnight automations via a simple fetch
      // In production this would call the Trigger.dev jobs
      await fetch('/api/operations/am-sweep', { method: 'GET' });
      setOvernightDone(true);
    } catch {
      // Handle error silently
    } finally {
      setRunningOvernight(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Cpu size={20} color={c.dawn} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: c.text, margin: 0 }}>
            Morning Operations
          </h1>
        </div>
        <p style={{ fontSize: 14, color: c.textTertiary, margin: 0 }}>
          Automated task triage, classification, and scheduling
        </p>
      </div>

      {/* Quick Actions Row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button
          onClick={runOvernight}
          disabled={runningOvernight || overnightDone}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 16px', borderRadius: 10, border: `1px solid ${c.border}`,
            background: overnightDone ? 'rgba(82,183,136,0.1)' : c.surface,
            color: overnightDone ? '#52B788' : c.text,
            fontSize: 13, fontWeight: 500, cursor: runningOvernight || overnightDone ? 'default' : 'pointer',
          }}
        >
          {runningOvernight ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Moon size={14} />
          )}
          {overnightDone ? 'Overnight Complete' : runningOvernight ? 'Running...' : 'Run Overnight'}
        </button>
      </div>

      {/* Main Panels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* AM Sweep */}
        <AMSweepPanel />

        {/* Time Blocker */}
        <TimeBlockPanel />

        {/* Completion Report */}
        <CompletionReportPanel />
      </div>

      {/* Run History (placeholder) */}
      <div style={{
        marginTop: 32, padding: '16px 20px', borderRadius: 12,
        border: `1px solid ${c.border}`, background: c.dawnMuted,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <History size={14} color={c.textTertiary} />
          <h3 style={{ fontSize: 13, fontWeight: 600, color: c.textTertiary, margin: 0 }}>
            Run History
          </h3>
        </div>
        <p style={{ fontSize: 12, color: c.textTertiary, margin: '4px 0 0' }}>
          Previous operation runs will appear here after your first morning sweep.
        </p>
      </div>
    </div>
  );
}
