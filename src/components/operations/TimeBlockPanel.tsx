'use client';

import { useState } from 'react';
import { Clock, CalendarPlus, Loader2, MapPin, AlertCircle } from 'lucide-react';

const c = {
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.85)',
  textTertiary: 'rgba(255,255,255,0.55)',
  border: 'rgba(255,255,255,0.07)',
  dawnSubtle: 'rgba(232,132,92,0.15)',
  dawn: '#E8845C',
  green: '#52B788',
  blue: '#4E7DAA',
  orange: '#F4C896',
};

const BLOCK_COLORS: Record<string, string> = {
  task: '#E8845C',
  errand_batch: '#F4C896',
  deep_work: '#4E7DAA',
  exercise: '#52B788',
  transit: '#6B7280',
  buffer: '#9CA3AF',
};

interface ProposedBlock {
  title: string;
  start_time: string;
  end_time: string;
  block_type: string;
  task_id: string | null;
  location: string | null;
}

interface OverflowTask {
  taskId: string;
  title: string;
  reason: string;
  recommendedDate: string;
}

interface ScheduleResult {
  runId: string;
  blocks: ProposedBlock[];
  overflow: OverflowTask[];
}

export function TimeBlockPanel() {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateSchedule() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/operations/time-block', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate schedule');
      const data = await res.json();
      setSchedule(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function confirmSchedule() {
    if (!schedule) return;
    setConfirming(true);
    try {
      const res = await fetch('/api/operations/time-block', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: schedule.runId }),
      });
      if (!res.ok) throw new Error('Failed to confirm schedule');
      setConfirmed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirmation failed');
    } finally {
      setConfirming(false);
    }
  }

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function getDurationMinutes(start: string, end: string): number {
    return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  }

  return (
    <div style={{ borderRadius: 12, border: `1px solid ${c.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: c.dawnSubtle }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: c.text, margin: 0 }}>Time Blocker</h3>
          <p style={{ fontSize: 12, color: c.textTertiary, margin: '2px 0 0' }}>Generate an optimized schedule for today</p>
        </div>
        {!schedule && (
          <button
            onClick={generateSchedule}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              borderRadius: 8, border: 'none', background: c.dawn, color: '#fff',
              fontSize: 13, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
            {loading ? 'Generating...' : 'Generate Schedule'}
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px 20px', background: 'rgba(214,75,42,0.08)', color: '#D64B2A', fontSize: 13 }}>
          {error}
        </div>
      )}

      {schedule && (
        <div style={{ padding: 20 }}>
          {/* Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {schedule.blocks.map((block, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'stretch', gap: 12,
                  padding: '10px 14px', borderRadius: 8,
                  border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.04)',
                }}
              >
                <div style={{
                  width: 4, borderRadius: 2, flexShrink: 0,
                  background: BLOCK_COLORS[block.block_type] ?? c.dawn,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: c.text }}>{block.title}</span>
                    <span style={{
                      fontSize: 10, padding: '2px 6px', borderRadius: 4,
                      background: `${BLOCK_COLORS[block.block_type] ?? c.dawn}15`,
                      color: BLOCK_COLORS[block.block_type] ?? c.dawn,
                      fontWeight: 500, textTransform: 'uppercase',
                    }}>
                      {block.block_type.replace('_', ' ')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: c.textTertiary }}>
                      {formatTime(block.start_time)} — {formatTime(block.end_time)}
                    </span>
                    <span style={{ fontSize: 11, color: c.textTertiary }}>
                      ({getDurationMinutes(block.start_time, block.end_time)} min)
                    </span>
                  </div>
                  {block.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <MapPin size={10} color={c.textTertiary} />
                      <span style={{ fontSize: 11, color: c.textTertiary }}>{block.location}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Overflow */}
          {schedule.overflow.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: c.orange, margin: '0 0 8px' }}>
                <AlertCircle size={12} />
                Doesn&apos;t fit today ({schedule.overflow.length})
              </h4>
              {schedule.overflow.map((task) => (
                <div key={task.taskId} style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(232,132,92,0.1)', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: c.text }}>{task.title}</span>
                  <span style={{ fontSize: 11, color: c.textTertiary, marginLeft: 8 }}>
                    → Recommended: {task.recommendedDate}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Confirm button */}
          {!confirmed ? (
            <button
              onClick={confirmSchedule}
              disabled={confirming}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '12px 20px', marginTop: 16,
                borderRadius: 8, border: 'none', background: c.green, color: '#1B1F3A',
                fontSize: 14, fontWeight: 600, cursor: confirming ? 'not-allowed' : 'pointer',
                opacity: confirming ? 0.7 : 1,
              }}
            >
              {confirming ? <Loader2 size={16} className="animate-spin" /> : <CalendarPlus size={16} />}
              {confirming ? 'Creating calendar events...' : `Confirm — Create ${schedule.blocks.length} calendar events`}
            </button>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 20px', marginTop: 16, borderRadius: 8,
              background: 'rgba(82,183,136,0.1)', color: c.green, fontSize: 14, fontWeight: 500,
            }}>
              Schedule confirmed — events created on your calendar
            </div>
          )}
        </div>
      )}
    </div>
  );
}
