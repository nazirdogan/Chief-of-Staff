'use client';

import { useState } from 'react';
import { Play, Loader2, Clock, ArrowRight } from 'lucide-react';

const c = {
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.85)',
  textTertiary: 'rgba(255,255,255,0.55)',
  border: 'rgba(255,255,255,0.07)',
  brassSubtle: 'rgba(168,153,104,0.15)',
  brass: '#A89968',
  green: '#4ADE80',
  yellow: '#B68D40',
  red: '#F87171',
  gray: '#95A5A6',
};

interface ClassifiedTask {
  id: string;
  category: string;
  reasoning: string;
  agentAssignment: string | null;
  title: string;
  from: string;
  duration: number | null;
  tags: string[];
  priority: string | null;
}

interface SweepResult {
  runId: string;
  summary: { green: number; yellow: number; red: number; gray: number };
  tasks: {
    green: ClassifiedTask[];
    yellow: ClassifiedTask[];
    red: ClassifiedTask[];
    gray: ClassifiedTask[];
  };
}

export function AMSweepPanel() {
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [result, setResult] = useState<SweepResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSweep() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/operations/am-sweep', { method: 'POST' });
      if (!res.ok) throw new Error('AM Sweep failed');
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function dispatchAgents() {
    if (!result) return;
    setDispatching(true);
    try {
      const res = await fetch('/api/operations/am-sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispatch', runId: result.runId }),
      });
      if (!res.ok) throw new Error('Dispatch failed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dispatch failed');
    } finally {
      setDispatching(false);
    }
  }

  return (
    <div style={{ borderRadius: 12, border: `1px solid ${c.border}`, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: c.brassSubtle }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: c.text, margin: 0 }}>AM Sweep</h3>
          <p style={{ fontSize: 12, color: c.textTertiary, margin: '2px 0 0' }}>Classify and dispatch today&apos;s tasks</p>
        </div>
        {!result && (
          <button
            onClick={runSweep}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              borderRadius: 8, border: 'none', background: c.brass, color: '#fff',
              fontSize: 13, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {loading ? 'Classifying...' : 'Run Sweep'}
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px 20px', background: 'rgba(248,113,113,0.08)', color: c.red, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div style={{ padding: 20 }}>
          {/* Summary badges */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <Badge color={c.green} count={result.summary.green} label="Dispatch" />
            <Badge color={c.yellow} count={result.summary.yellow} label="Prep" />
            <Badge color={c.red} count={result.summary.red} label="Yours" />
            <Badge color={c.gray} count={result.summary.gray} label="Skip" />
          </div>

          {/* Task sections */}
          <TaskSection label="AI Handles" color={c.green} tasks={result.tasks.green} />
          <TaskSection label="AI Preps, You Decide" color={c.yellow} tasks={result.tasks.yellow} />
          <TaskSection label="Needs Your Brain" color={c.red} tasks={result.tasks.red} />
          <TaskSection label="Skip Today" color={c.gray} tasks={result.tasks.gray} />

          {/* Dispatch button */}
          {(result.summary.green > 0 || result.summary.yellow > 0) && (
            <button
              onClick={dispatchAgents}
              disabled={dispatching}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '12px 20px', marginTop: 16,
                borderRadius: 8, border: 'none', background: c.green, color: '#0A0A0B',
                fontSize: 14, fontWeight: 600, cursor: dispatching ? 'not-allowed' : 'pointer',
                opacity: dispatching ? 0.7 : 1,
              }}
            >
              {dispatching ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {dispatching ? 'Dispatching agents...' : `Go — Dispatch ${result.summary.green + result.summary.yellow} tasks`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Badge({ color, count, label }: { color: string; count: number; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
      borderRadius: 20, background: `${color}10`, border: `1px solid ${color}30`,
    }}>
      <span style={{ fontSize: 15, fontWeight: 700, color }}>{count}</span>
      <span style={{ fontSize: 11, color, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
    </div>
  );
}

function TaskSection({ label, color, tasks }: { label: string; color: string; tasks: ClassifiedTask[] }) {
  if (tasks.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <h4 style={{ fontSize: 12, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px' }}>
        {label}
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tasks.map((task) => (
          <div
            key={task.id}
            style={{
              padding: '10px 14px', borderRadius: 8, border: `1px solid ${c.border}`,
              background: 'rgba(255,255,255,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: c.text }}>{task.title}</span>
              {task.duration && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: c.textTertiary, whiteSpace: 'nowrap' }}>
                  <Clock size={10} />
                  {task.duration}m
                </span>
              )}
            </div>
            <p style={{ fontSize: 11, color: c.textTertiary, margin: '4px 0 0' }}>
              {task.reasoning}
            </p>
            {task.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                {task.tags.map((tag) => (
                  <span key={tag} style={{
                    fontSize: 10, padding: '2px 6px', borderRadius: 4,
                    background: c.brassSubtle, color: c.textTertiary,
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
