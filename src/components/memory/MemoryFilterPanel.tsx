'use client';

const c = {
  bg: '#1B1F3A',
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

const FILTERS: { label: string; value: string | null }[] = [
  { label: 'All', value: null },
  { label: 'Email', value: 'email_thread' },
  { label: 'Slack', value: 'slack_conversation' },
  { label: 'Meetings', value: 'calendar_event' },
  { label: 'Tasks', value: 'task_update' },
  { label: 'Docs', value: 'document_edit' },
  { label: 'Code', value: 'code_activity' },
];

interface MemoryFilterPanelProps {
  activeType: string | null;
  onTypeChange: (type: string | null) => void;
}

export function MemoryFilterPanel({ activeType, onTypeChange }: MemoryFilterPanelProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => {
        const isActive = activeType === filter.value;
        return (
          <button
            key={filter.label}
            onClick={() => onTypeChange(filter.value)}
            className="rounded-lg text-[12px] font-medium px-3 py-1.5 transition-colors"
            style={{
              backgroundColor: isActive ? c.dawnMuted : c.surface,
              border: `1px solid ${isActive ? c.dawnBorder : c.border}`,
              color: isActive ? c.dawn : c.textTertiary,
            }}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
