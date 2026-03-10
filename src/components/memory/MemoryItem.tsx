'use client';

import {
  Mail,
  MessageSquare,
  CalendarDays,
  CheckCircle,
  FileText,
  GitBranch,
} from 'lucide-react';
import { useState } from 'react';

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

const PROVIDER_ICONS: Record<string, typeof Mail> = {
  gmail: Mail,
  outlook: Mail,
  email: Mail,
  slack: MessageSquare,
  google_calendar: CalendarDays,
  calendar: CalendarDays,
  todoist: CheckCircle,
  tasks: CheckCircle,
  notion: FileText,
  docs: FileText,
  github: GitBranch,
  code: GitBranch,
};

const PROVIDER_LABELS: Record<string, string> = {
  gmail: 'Gmail',
  outlook: 'Outlook',
  email: 'Email',
  slack: 'Slack',
  google_calendar: 'Calendar',
  calendar: 'Calendar',
  todoist: 'Tasks',
  tasks: 'Tasks',
  notion: 'Notion',
  docs: 'Docs',
  github: 'GitHub',
  code: 'Code',
};

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getImportanceBorderColor(importance: string): string {
  switch (importance) {
    case 'critical':
      return c.critical;
    case 'important':
      return c.dawn;
    default:
      return c.border;
  }
}

function getImportanceBadgeStyle(importance: string): {
  bg: string;
  color: string;
} {
  switch (importance) {
    case 'critical':
      return { bg: 'rgba(214,75,42,0.15)', color: c.critical };
    case 'important':
      return { bg: c.dawnMuted, color: c.dawn };
    default:
      return { bg: c.surface, color: c.textMuted };
  }
}

export interface MemoryChunk {
  id: string;
  provider: string;
  chunk_type: string;
  title: string;
  content_summary: string;
  importance: string;
  topics: string[];
  people: string[];
  occurred_at: string;
}

interface MemoryItemProps {
  chunk: MemoryChunk;
}

export function MemoryItem({ chunk }: MemoryItemProps) {
  const [hovered, setHovered] = useState(false);
  const Icon = PROVIDER_ICONS[chunk.provider] ?? FileText;
  const providerLabel = PROVIDER_LABELS[chunk.provider] ?? chunk.provider;
  const borderColor = getImportanceBorderColor(chunk.importance);
  const badge = getImportanceBadgeStyle(chunk.importance);

  return (
    <div
      className="rounded-xl p-4 transition-colors"
      style={{
        backgroundColor: hovered ? c.surfaceHover : c.surface,
        border: `1px solid ${hovered ? c.borderHover : c.border}`,
        borderLeft: `3px solid ${borderColor}`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Icon size={16} style={{ color: c.textTertiary, flexShrink: 0 }} />
          <h3
            className="text-[14px] font-medium truncate"
            style={{ color: c.text }}
          >
            {chunk.title}
          </h3>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {chunk.importance !== 'background' && (
            <span
              className="rounded-full text-[10px] font-medium px-2 py-0.5"
              style={{
                backgroundColor: badge.bg,
                color: badge.color,
              }}
            >
              {chunk.importance}
            </span>
          )}
          <span className="text-[11px]" style={{ color: c.textMuted }}>
            {providerLabel}
          </span>
        </div>
      </div>

      <p
        className="mt-2 text-[13px] leading-relaxed line-clamp-2"
        style={{ color: c.textSecondary }}
      >
        {chunk.content_summary}
      </p>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {chunk.topics.slice(0, 4).map((topic) => (
            <span
              key={topic}
              className="rounded-full text-[10px] px-2 py-0.5"
              style={{
                backgroundColor: c.surface,
                color: c.textMuted,
                border: `1px solid ${c.border}`,
              }}
            >
              {topic}
            </span>
          ))}
        </div>
        <span className="text-[11px] flex-shrink-0" style={{ color: c.textGhost }}>
          {getRelativeTime(chunk.occurred_at)}
        </span>
      </div>
    </div>
  );
}
