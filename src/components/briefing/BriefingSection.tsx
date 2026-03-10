'use client';

import {
  Inbox,
  Calendar,
  ListChecks,
  AlertTriangle,
  Zap,
  HelpCircle,
  Users,
  Star,
  Reply,
  Clock,
  MailCheck,
  CheckCircle2,
  ArrowRightFromLine,
} from 'lucide-react';
import type { BriefingItem as BriefingItemType, BriefingItemSection as SectionType } from '@/lib/db/types';
import { BriefingItem } from './BriefingItem';

const ERROR_PATTERNS = [
  /no .* content provided/i,
  /failed to (process|fetch|parse)/i,
  /error (processing|fetching)/i,
  /could not (retrieve|extract)/i,
  /unable to (process|parse)/i,
  /internal (server )?error/i,
  /unexpected (error|token)/i,
];

const SECTION_EMPTY_MESSAGES: Partial<Record<SectionType, string>> = {
  vip_inbox: 'No new messages from your key contacts.',
  action_required: 'Nothing requiring your action right now.',
  awaiting_reply: 'No pending replies to chase.',
  todays_schedule: 'Your calendar is clear today.',
  commitment_queue: 'No outstanding commitments.',
  at_risk: 'All relationships in good standing.',
  priority_inbox: 'No other messages to review.',
};

const c = {
  text: '#2D2D2D',
  textTertiary: 'rgba(45,45,45,0.6)',
  textQuaternary: 'rgba(45,45,45,0.5)',
  border: 'rgba(45,45,45,0.08)',
  dawnSubtle: 'rgba(232,132,92,0.15)',
};

const SECTION_META: Record<SectionType, { label: string; description?: string; icon: typeof Inbox }> = {
  // New 3-section briefing
  priorities: {
    label: "Today's Priorities",
    description: 'Your ranked action list for today',
    icon: ListChecks,
  },
  yesterday_completed: {
    label: 'Completed Yesterday',
    description: 'What got done',
    icon: CheckCircle2,
  },
  yesterday_carried_over: {
    label: 'Carried Over',
    description: 'Still needs attention',
    icon: ArrowRightFromLine,
  },
  todays_schedule: {
    label: "Today's Schedule",
    description: 'Meetings and events for today',
    icon: Calendar,
  },
  // Legacy sections — kept for backward compatibility
  commitment_queue: {
    label: 'Commitments',
    description: 'Promises you made that need follow-up',
    icon: ListChecks,
  },
  vip_inbox: {
    label: 'VIP Inbox',
    description: 'Messages from your key contacts',
    icon: Star,
  },
  action_required: {
    label: 'Action Required',
    description: 'Emails needing your attention today',
    icon: MailCheck,
  },
  awaiting_reply: {
    label: 'Awaiting Reply',
    description: 'Sent emails with no response yet',
    icon: Reply,
  },
  after_hours: {
    label: 'After-Hours Arrivals',
    description: 'Emails received outside working hours',
    icon: Clock,
  },
  at_risk: {
    label: 'At Risk',
    description: 'Relationships and commitments at risk',
    icon: AlertTriangle,
  },
  priority_inbox: {
    label: 'Other Inbox',
    description: 'Remaining messages from primary inbox',
    icon: Inbox,
  },
  quick_wins: {
    label: 'Quick Wins',
    description: 'Low-effort items you can knock out fast',
    icon: Zap,
  },
  decision_queue: {
    label: 'Decision Queue',
    icon: HelpCircle,
  },
  people_context: {
    label: 'People Context',
    icon: Users,
  },
};

interface BriefingSectionProps {
  section: SectionType;
  items: BriefingItemType[];
  onFeedback: (itemId: string, feedback: 1 | -1) => Promise<void>;
  onCitationClick: (item: BriefingItemType) => void;
}

export function BriefingSection({ section, items, onFeedback, onCitationClick }: BriefingSectionProps) {
  if (items.length === 0) return null;

  const meta = SECTION_META[section];
  const Icon = meta.icon;

  // Check if ALL items in this section have error summaries
  const allErrored = items.every(item =>
    ERROR_PATTERNS.some(p => p.test(item.summary))
  );

  return (
    <section id={`section-${section}`} className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md"
          style={{ background: c.dawnSubtle }}
        >
          <Icon size={13} style={{ color: c.textTertiary }} />
        </div>
        <h2
          className="text-[13px] font-semibold tracking-[-0.01em]"
          style={{ color: c.text }}
        >
          {meta.label}
        </h2>
        {!allErrored && (
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums"
            style={{
              background: c.dawnSubtle,
              color: c.textQuaternary,
            }}
          >
            {items.length}
          </span>
        )}
      </div>

      {meta.description && !allErrored && (
        <p
          className="text-[12px] -mt-1 ml-[34px]"
          style={{ color: c.textQuaternary }}
        >
          {meta.description}
        </p>
      )}

      {allErrored ? (
        <p
          className="text-[12px] ml-[34px] italic"
          style={{ color: c.textQuaternary }}
        >
          {SECTION_EMPTY_MESSAGES[section] ?? 'No updates for this section.'}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <BriefingItem
              key={item.id}
              item={item}
              onFeedback={onFeedback}
              onCitationClick={onCitationClick}
            />
          ))}
        </div>
      )}
    </section>
  );
}
