'use client';

import type { BriefingItem as BriefingItemType, BriefingItemSection as SectionType } from '@/lib/db/types';
import { BriefingItem } from './BriefingItem';

const SECTION_LABELS: Record<SectionType, string> = {
  priority_inbox: 'Priority Inbox',
  todays_schedule: "Today's Schedule",
  commitment_queue: 'Commitment Queue',
  at_risk: 'At Risk',
  decision_queue: 'Decision Queue',
  quick_wins: 'Quick Wins',
  people_context: 'People Context',
};

const SECTION_DESCRIPTIONS: Record<string, string> = {
  priority_inbox: 'Messages ranked by urgency and importance',
  todays_schedule: 'Meetings and events for today',
  commitment_queue: 'Promises you made that need follow-up',
  at_risk: 'Relationships and commitments at risk',
  quick_wins: 'Low-effort items you can knock out fast',
};

interface BriefingSectionProps {
  section: SectionType;
  items: BriefingItemType[];
  onFeedback: (itemId: string, feedback: 1 | -1) => Promise<void>;
  onCitationClick: (item: BriefingItemType) => void;
}

export function BriefingSection({ section, items, onFeedback, onCitationClick }: BriefingSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">{SECTION_LABELS[section]}</h2>
        {SECTION_DESCRIPTIONS[section] && (
          <p className="text-xs text-muted-foreground">{SECTION_DESCRIPTIONS[section]}</p>
        )}
      </div>
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
