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
} from 'lucide-react';
import type { BriefingItem as BriefingItemType, BriefingItemSection as SectionType } from '@/lib/db/types';
import { BriefingItem } from './BriefingItem';

const c = {
  text: '#FFFFFF',
  textTertiary: 'rgba(255,255,255,0.55)',
  textQuaternary: 'rgba(255,255,255,0.35)',
  border: 'rgba(255,255,255,0.07)',
  brassSubtle: 'rgba(168,153,104,0.15)',
};

const SECTION_META: Record<SectionType, { label: string; description?: string; icon: typeof Inbox }> = {
  todays_schedule: {
    label: "Today's Schedule",
    description: 'Meetings and events for today',
    icon: Calendar,
  },
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

  return (
    <section className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md"
          style={{ background: c.brassSubtle }}
        >
          <Icon size={13} style={{ color: c.textTertiary }} />
        </div>
        <h2
          className="text-[13px] font-semibold tracking-[-0.01em]"
          style={{ color: c.text }}
        >
          {meta.label}
        </h2>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums"
          style={{
            background: c.brassSubtle,
            color: c.textQuaternary,
          }}
        >
          {items.length}
        </span>
      </div>

      {meta.description && (
        <p
          className="text-[12px] -mt-1 ml-[34px]"
          style={{ color: c.textQuaternary }}
        >
          {meta.description}
        </p>
      )}

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
    </section>
  );
}
