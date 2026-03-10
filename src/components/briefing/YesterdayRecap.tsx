'use client';

import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

const c = {
  surface: 'rgba(45,45,45,0.04)',
  surfaceHover: 'rgba(45,45,45,0.06)',
  surfaceElevated: 'rgba(45,45,45,0.06)',
  border: 'rgba(45,45,45,0.08)',
  borderHover: 'rgba(45,45,45,0.16)',
  dawn: '#E8845C',
  dawnMuted: 'rgba(232,132,92,0.15)',
  dawnBorder: 'rgba(232,132,92,0.25)',
  text: '#2D2D2D',
  textSecondary: 'rgba(45,45,45,0.8)',
  textTertiary: 'rgba(45,45,45,0.6)',
  textMuted: 'rgba(45,45,45,0.5)',
  textGhost: 'rgba(45,45,45,0.4)',
  info: '#4E7DAA',
  success: '#52B788',
  critical: '#D64B2A',
  warning: '#F4C896',
};

interface SnapshotData {
  day_narrative: string;
  key_decisions: string[];
  open_loops: string[];
  activity_stats: {
    emails: number;
    meetings: number;
    tasks_completed: number;
  };
}

function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function YesterdayRecap() {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const date = getYesterdayDate();
    fetch(`/api/context/snapshot?date=${date}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((json: SnapshotData) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  // Skeleton loading state
  if (loading) {
    return (
      <div
        className="rounded-xl p-5"
        style={{
          background: c.surface,
          border: `1px solid ${c.border}`,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-32 animate-pulse rounded"
            style={{ background: c.surfaceHover }}
          />
        </div>
      </div>
    );
  }

  // Empty / error state
  if (error || !data) {
    return (
      <div
        className="rounded-xl p-5"
        style={{
          background: c.surface,
          border: `1px solid ${c.border}`,
        }}
      >
        <p className="text-[13px]" style={{ color: c.textMuted }}>
          No recap available for yesterday
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: c.surface,
        border: `1px solid ${c.border}`,
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2"
      >
        <ChevronRight
          size={14}
          className="shrink-0 transition-transform duration-200"
          style={{
            color: c.textTertiary,
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        />
        <span
          className="text-[13px] font-medium"
          style={{ color: c.textTertiary }}
        >
          Yesterday&apos;s Recap
        </span>
      </button>

      {/* Expanded content */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: expanded ? '600px' : '0px',
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="mt-4 space-y-4">
          {/* Day narrative */}
          {data.day_narrative && (
            <p
              className="text-[13px] leading-[1.7]"
              style={{ color: c.textSecondary }}
            >
              {data.day_narrative}
            </p>
          )}

          {/* Key decisions */}
          {data.key_decisions && data.key_decisions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.key_decisions.map((decision) => (
                <span
                  key={decision}
                  className="rounded-full px-3 py-1 text-[12px] font-medium"
                  style={{
                    background: c.dawnMuted,
                    color: c.dawn,
                    border: `1px solid ${c.dawnBorder}`,
                  }}
                >
                  {decision}
                </span>
              ))}
            </div>
          )}

          {/* Open loops */}
          {data.open_loops && data.open_loops.length > 0 && (
            <ul className="space-y-1.5 pl-1">
              {data.open_loops.map((loop) => (
                <li
                  key={loop}
                  className="flex items-start gap-2 text-[13px]"
                  style={{ color: c.textSecondary }}
                >
                  <span
                    className="mt-[7px] block h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: c.textMuted }}
                  />
                  {loop}
                </li>
              ))}
            </ul>
          )}

          {/* Activity stats */}
          {data.activity_stats && (
            <p className="text-[12px]" style={{ color: c.textMuted }}>
              {data.activity_stats.emails} email{data.activity_stats.emails === 1 ? '' : 's'}
              {' · '}
              {data.activity_stats.meetings} meeting{data.activity_stats.meetings === 1 ? '' : 's'}
              {' · '}
              {data.activity_stats.tasks_completed} task{data.activity_stats.tasks_completed === 1 ? '' : 's'} completed
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
