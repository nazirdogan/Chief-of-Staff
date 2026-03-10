'use client';

import { useState } from 'react';
import { ChevronDown, Mail, MessageSquare, FileText, Calendar } from 'lucide-react';

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

function getProviderIcon(provider: string) {
  switch (provider) {
    case 'gmail':
    case 'outlook':
      return Mail;
    case 'slack':
    case 'microsoft_teams':
      return MessageSquare;
    case 'google_calendar':
    case 'microsoft_calendar':
      return Calendar;
    default:
      return FileText;
  }
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

interface RelatedContextItem {
  title: string;
  provider: string;
  content_summary: string;
  occurred_at: string;
}

interface RelatedContextProps {
  items: RelatedContextItem[];
}

export function RelatedContext({ items }: RelatedContextProps) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  return (
    <div>
      {/* Collapsed toggle */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-1.5 text-[12px] transition-colors duration-200"
        style={{ color: c.textMuted }}
      >
        <ChevronDown
          size={12}
          className="transition-transform duration-200"
          style={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
        <span>
          {items.length} related item{items.length === 1 ? '' : 's'} from your memory
        </span>
      </button>

      {/* Expanded items */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: expanded ? `${items.length * 80}px` : '0px',
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="mt-2 flex flex-col">
          {items.map((item, i) => {
            const Icon = getProviderIcon(item.provider);
            return (
              <div
                key={`${item.provider}-${item.title}-${i}`}
                className="rounded-lg p-3"
                style={{
                  background: c.surface,
                  borderTop: i > 0 ? `1px solid ${c.border}` : undefined,
                }}
              >
                <div className="flex items-start gap-2.5">
                  <Icon
                    size={13}
                    className="mt-0.5 shrink-0"
                    style={{ color: c.textTertiary }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className="truncate text-[12px] font-medium"
                        style={{ color: c.textSecondary }}
                      >
                        {item.title}
                      </span>
                      <span
                        className="shrink-0 text-[11px]"
                        style={{ color: c.textMuted }}
                      >
                        {relativeTime(item.occurred_at)}
                      </span>
                    </div>
                    <p
                      className="mt-0.5 truncate text-[12px]"
                      style={{ color: c.textTertiary }}
                    >
                      {item.content_summary}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
