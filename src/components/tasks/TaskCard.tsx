'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Task } from '@/lib/db/types';
import { decodeEntities } from '@/lib/utils/decode-entities';

const c = {
  surface: 'rgba(45,45,45,0.04)',
  border: 'rgba(45,45,45,0.08)',
  borderHover: 'rgba(45,45,45,0.16)',
  dawn: '#E8845C',
  dawnSubtle: 'rgba(232,132,92,0.15)',
  text: '#2D2D2D',
  textSecondary: 'rgba(45,45,45,0.8)',
  textTertiary: 'rgba(45,45,45,0.6)',
  textQuaternary: 'rgba(45,45,45,0.5)',
  green: '#52B788',
  yellow: '#92400E',
};

interface TaskCardProps {
  task: Task;
  onAction: (id: string, action: string, snoozedUntil?: string) => Promise<void>;
}

export function TaskCard({ task, onAction }: TaskCardProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const isPossible = task.confidence === 'medium';

  async function handleAction(action: string, snoozedUntil?: string) {
    setLoading(action);
    try {
      await onAction(task.id, action, snoozedUntil);
    } finally {
      setLoading(null);
    }
  }

  function handleSnooze() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    handleAction('snooze', tomorrow.toISOString());
  }

  return (
    <div
      style={{
        padding: '14px 16px', borderRadius: 10,
        border: `1px ${isPossible ? 'dashed' : 'solid'} ${c.border}`,
        background: c.surface,
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = c.borderHover)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = c.border as string)}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: c.text, lineHeight: 1.4 }}>
            {decodeEntities(task.task_text)}
          </div>
          <div style={{ fontSize: 12, color: c.textTertiary, marginTop: 2 }}>
            {task.direction === 'inbound' ? 'From' : 'To'}: {task.recipient_name || task.recipient_email}
          </div>
        </div>
        {isPossible && (
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 4, flexShrink: 0,
            background: `${c.yellow}12`, color: c.yellow, fontWeight: 600,
          }}>
            Possible
          </span>
        )}
        {task.confidence === 'high' && (
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 4, flexShrink: 0,
            background: `${c.green}12`, color: c.green, fontWeight: 600,
          }}>
            High
          </span>
        )}
        {task.direction === 'inbound' && (
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 4, flexShrink: 0,
            background: 'rgba(59,130,246,0.1)', color: '#3B82F6', fontWeight: 600,
          }}>
            Inbound
          </span>
        )}
      </div>

      {/* Source quote */}
      <div
        style={{
          marginTop: 10, paddingLeft: 10,
          borderLeft: `2px solid ${c.border}`,
          fontSize: 12, fontStyle: 'italic', color: c.textTertiary,
          lineHeight: 1.5,
        }}
      >
        &ldquo;{decodeEntities(task.source_quote)}&rdquo;
      </div>

      {task.implied_deadline && (
        <div style={{ fontSize: 11, color: c.textQuaternary, marginTop: 8 }}>
          Deadline: {new Date(task.implied_deadline).toLocaleDateString()}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        <ActionButton
          label="Resolve"
          loadingLabel="Resolving..."
          isLoading={loading === 'resolve'}
          disabled={loading !== null}
          onClick={() => handleAction('resolve')}
          primary
        />
        <ActionButton
          label="Snooze"
          loadingLabel="Snoozing..."
          isLoading={loading === 'snooze'}
          disabled={loading !== null}
          onClick={handleSnooze}
        />
        <ActionButton
          label="Dismiss"
          loadingLabel="Dismissing..."
          isLoading={loading === 'dismiss'}
          disabled={loading !== null}
          onClick={() => handleAction('dismiss')}
          ghost
        />
      </div>
    </div>
  );
}

function ActionButton({ label, loadingLabel, isLoading, disabled, onClick, primary, ghost }: {
  label: string; loadingLabel: string; isLoading: boolean; disabled: boolean;
  onClick: () => void; primary?: boolean; ghost?: boolean;
}) {
  const c = {
    text: '#2D2D2D',
    border: 'rgba(45,45,45,0.08)',
    textTertiary: 'rgba(45,45,45,0.6)',
    dawnSubtle: 'rgba(232,132,92,0.15)',
  };

  let bg = c.dawnSubtle;
  let color = c.text;
  let border = `1px solid ${c.border}`;
  if (primary) {
    bg = '#E8845C';
    color = '#1B1F3A';
    border = 'none';
  }
  if (ghost) {
    bg = 'transparent';
    color = c.textTertiary;
    border = 'none';
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '5px 14px', borderRadius: 6,
        fontSize: 12, fontWeight: 500,
        background: bg, color, border,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled && !isLoading ? 0.5 : 1,
      }}
    >
      {isLoading && <Loader2 size={11} className="animate-spin" />}
      {isLoading ? loadingLabel : label}
    </button>
  );
}
