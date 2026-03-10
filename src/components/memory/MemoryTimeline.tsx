'use client';

import { MemoryItem, type MemoryChunk } from './MemoryItem';
import { MemoryDaySnapshot, type MemorySnapshot } from './MemoryDaySnapshot';

const c = {
  textMuted: 'rgba(45,45,45,0.5)',
};

function formatDateKey(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}

function formatDateHeader(dateKey: string): string {
  const date = new Date(dateKey + 'T00:00:00');
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);

  if (dateKey === today) return 'Today';
  if (dateKey === yesterday) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

interface MemoryTimelineProps {
  chunks: MemoryChunk[];
  snapshots?: Record<string, MemorySnapshot>;
}

export function MemoryTimeline({ chunks, snapshots }: MemoryTimelineProps) {
  const grouped = new Map<string, MemoryChunk[]>();

  for (const chunk of chunks) {
    const key = formatDateKey(chunk.occurred_at);
    const existing = grouped.get(key);
    if (existing) {
      existing.push(chunk);
    } else {
      grouped.set(key, [chunk]);
    }
  }

  const sortedDays = Array.from(grouped.keys()).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="flex flex-col gap-6">
      {sortedDays.map((dateKey) => {
        const dayChunks = grouped.get(dateKey) ?? [];
        const snapshot = snapshots?.[dateKey];

        return (
          <div key={dateKey} className="flex flex-col gap-3">
            <h4
              className="text-[11px] font-medium tracking-[0.06em] uppercase px-1"
              style={{ color: c.textMuted }}
            >
              {formatDateHeader(dateKey)}
            </h4>
            {snapshot && <MemoryDaySnapshot snapshot={snapshot} />}
            {dayChunks.map((chunk) => (
              <MemoryItem key={chunk.id} chunk={chunk} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
