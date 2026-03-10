'use client';

import { Check } from 'lucide-react';

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
  critical: '#D64B2A',
  success: '#52B788',
  info: '#4E7DAA',
};

interface ActionItem {
  id: string;
  description: string;
  assignee?: string;
  assignee_is_user: boolean;
  deadline?: string;
  status: 'open' | 'completed';
}

interface MeetingActionsTabProps {
  items: ActionItem[];
  onToggle: (id: string) => void;
}

function ActionItemRow({
  item,
  onToggle,
}: {
  item: ActionItem;
  onToggle: (id: string) => void;
}) {
  const isCompleted = item.status === 'completed';

  return (
    <div
      className="flex items-start gap-3 rounded-lg px-3 py-3"
      style={{
        background: c.surface,
        border: `1px solid ${c.border}`,
      }}
    >
      <button
        onClick={() => onToggle(item.id)}
        className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center mt-0.5"
        style={{
          background: isCompleted ? c.dawn : 'transparent',
          border: isCompleted ? 'none' : `1.5px solid ${c.borderHover}`,
          cursor: 'pointer',
          padding: 0,
        }}
      >
        {isCompleted && <Check size={12} color="#1B1F3A" strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className="text-[13px] leading-[1.5]"
          style={{
            color: isCompleted ? c.textMuted : c.text,
            textDecoration: isCompleted ? 'line-through' : 'none',
          }}
        >
          {item.description}
        </p>
        <div className="flex items-center gap-3 mt-1">
          {item.assignee && (
            <span className="text-[11px]" style={{ color: c.textTertiary }}>
              {item.assignee}
            </span>
          )}
          {item.deadline && (
            <span className="text-[11px]" style={{ color: c.textTertiary }}>
              Due {item.deadline}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MeetingActionsTab({ items, onToggle }: MeetingActionsTabProps) {
  if (items.length === 0) {
    return (
      <div
        className="rounded-xl py-12 text-center"
        style={{
          border: `1px dashed ${c.borderHover}`,
          background: c.surface,
        }}
      >
        <p className="text-[14px] font-medium" style={{ color: c.textTertiary }}>
          No action items extracted.
        </p>
      </div>
    );
  }

  const userItems = items.filter((item) => item.assignee_is_user);
  const othersItems = items.filter((item) => !item.assignee_is_user);

  return (
    <div className="flex flex-col gap-6">
      {userItems.length > 0 && (
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-wide mb-2"
            style={{ color: c.textMuted }}
          >
            Your Action Items
          </p>
          <div className="flex flex-col gap-2">
            {userItems.map((item) => (
              <ActionItemRow key={item.id} item={item} onToggle={onToggle} />
            ))}
          </div>
        </div>
      )}

      {othersItems.length > 0 && (
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-wide mb-2"
            style={{ color: c.textMuted }}
          >
            Others&apos; Action Items
          </p>
          <div className="flex flex-col gap-2">
            {othersItems.map((item) => (
              <ActionItemRow key={item.id} item={item} onToggle={onToggle} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
