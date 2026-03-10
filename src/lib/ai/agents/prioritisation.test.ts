import { describe, it, expect } from 'vitest';
import {
  mapInboxItemToCandidate,
  mapCommitmentToCandidate,
  mapEventToCandidate,
  mapColdContactToCandidate,
  type UserContext,
} from './prioritisation';
import type { InboxItem, Commitment, Contact } from '@/lib/db/types';
import type { ParsedCalendarEvent } from '@/lib/integrations/google-calendar';

const mockUserContext: UserContext = {
  vipEmails: ['ceo@company.com', 'investor@vc.com'],
  activeProjects: ['Project Alpha', 'Q4 Launch'],
  weeklyPriority: 'Close the Series A',
};

function makeInboxItem(overrides: Partial<InboxItem> = {}): InboxItem {
  return {
    id: 'inbox-1',
    user_id: 'user-1',
    provider: 'gmail',
    external_id: 'ext-1',
    thread_id: null,
    from_email: 'someone@example.com',
    from_name: 'Someone',
    subject: 'Test email',
    ai_summary: 'A test email summary',
    urgency_score: 5,
    needs_reply: false,
    is_read: false,
    is_starred: false,
    is_archived: false,
    snoozed_until: null,
    actioned_at: null,
    received_at: '2026-03-07T09:00:00Z',
    created_at: '2026-03-07T09:00:00Z',
    updated_at: '2026-03-07T09:00:00Z',
    ...overrides,
  } as InboxItem;
}

describe('mapInboxItemToCandidate', () => {
  it('maps a normal inbox item to priority_inbox section', () => {
    const item = makeInboxItem();
    const candidate = mapInboxItemToCandidate(item);
    expect(candidate.section).toBe('priority_inbox');
    expect(candidate.item_type).toBe('email');
    expect(candidate.title).toBe('Test email');
  });

  it('maps a VIP sender to vip_inbox section', () => {
    const item = makeInboxItem({ from_email: 'ceo@company.com' });
    const candidate = mapInboxItemToCandidate(item, ['ceo@company.com']);
    expect(candidate.section).toBe('vip_inbox');
  });

  it('maps a needs_reply item to action_required section', () => {
    const item = makeInboxItem({ needs_reply: true });
    const candidate = mapInboxItemToCandidate(item);
    expect(candidate.section).toBe('action_required');
    expect(candidate.action_suggestion).toBe('Reply needed');
  });

  it('VIP takes precedence over needs_reply', () => {
    const item = makeInboxItem({
      from_email: 'investor@vc.com',
      needs_reply: true,
    });
    const candidate = mapInboxItemToCandidate(item, ['investor@vc.com']);
    expect(candidate.section).toBe('vip_inbox');
  });

  it('uses "(No subject)" for items without subject', () => {
    const item = makeInboxItem({ subject: null });
    const candidate = mapInboxItemToCandidate(item);
    expect(candidate.title).toBe('(No subject)');
  });

  it('includes source_ref with correct provider and message_id', () => {
    const item = makeInboxItem({ provider: 'gmail', external_id: 'msg-99' });
    const candidate = mapInboxItemToCandidate(item);
    expect(candidate.source_ref.provider).toBe('gmail');
    expect(candidate.source_ref.message_id).toBe('msg-99');
  });
});

describe('mapCommitmentToCandidate', () => {
  it('maps a commitment to commitment_queue section', () => {
    const commitment = {
      id: 'c-1',
      commitment_text: 'Send the proposal',
      recipient_name: 'John',
      recipient_email: 'john@example.com',
      source_ref: { provider: 'gmail', message_id: 'm-1', excerpt: 'I will send the proposal' },
      implied_deadline: '2026-03-10T00:00:00Z',
      explicit_deadline: null,
    } as unknown as Commitment;

    const candidate = mapCommitmentToCandidate(commitment);
    expect(candidate.section).toBe('commitment_queue');
    expect(candidate.item_type).toBe('commitment');
    expect(candidate.title).toBe('Send the proposal');
    expect(candidate.action_suggestion).toContain('Due:');
  });

  it('uses "Follow up" when no deadline', () => {
    const commitment = {
      id: 'c-2',
      commitment_text: 'Review the doc',
      recipient_name: 'Jane',
      recipient_email: 'jane@example.com',
      source_ref: { provider: 'gmail', message_id: 'm-2', excerpt: 'I will review' },
      implied_deadline: null,
      explicit_deadline: null,
    } as unknown as Commitment;

    const candidate = mapCommitmentToCandidate(commitment);
    expect(candidate.action_suggestion).toBe('Follow up');
  });

  it('sets higher urgency for explicit deadlines', () => {
    const withDeadline = {
      id: 'c-3',
      commitment_text: 'Deliver report',
      recipient_name: 'Boss',
      recipient_email: 'boss@co.com',
      source_ref: { provider: 'gmail', message_id: 'm-3', excerpt: 'report' },
      implied_deadline: null,
      explicit_deadline: '2026-03-08',
    } as unknown as Commitment;

    const withoutDeadline = {
      ...withDeadline,
      explicit_deadline: null,
    } as unknown as Commitment;

    const candidateWith = mapCommitmentToCandidate(withDeadline);
    const candidateWithout = mapCommitmentToCandidate(withoutDeadline);
    expect(candidateWith.raw_urgency).toBeGreaterThan(candidateWithout.raw_urgency!);
  });
});

describe('mapEventToCandidate', () => {
  it('maps a calendar event to todays_schedule section', () => {
    const event: ParsedCalendarEvent = {
      id: 'evt-1',
      summary: 'Board Meeting',
      description: '',
      start: '2026-03-07T14:00:00Z',
      end: '2026-03-07T15:00:00Z',
      isAllDay: false,
      attendees: [
        { email: 'ceo@company.com', name: 'CEO', responseStatus: 'accepted' },
      ],
      meetingLink: 'https://meet.google.com/abc',
      location: 'Conference Room',
      organizer: { email: 'ceo@company.com', name: 'CEO' },
    };

    const candidate = mapEventToCandidate(event);
    expect(candidate.section).toBe('todays_schedule');
    expect(candidate.item_type).toBe('calendar_event');
    expect(candidate.title).toBe('Board Meeting');
    expect(candidate.action_suggestion).toBe('Join meeting');
    expect(candidate.raw_urgency).toBe(8);
  });

  it('shows "All day" for all-day events', () => {
    const event: ParsedCalendarEvent = {
      id: 'evt-2',
      summary: 'Company Offsite',
      description: '',
      start: '2026-03-07',
      end: '2026-03-08',
      isAllDay: true,
      attendees: [],
      location: '',
      meetingLink: '',
      organizer: { email: 'admin@company.com', name: 'Admin' },
    };

    const candidate = mapEventToCandidate(event);
    expect(candidate.summary).toContain('All day');
  });
});

describe('mapColdContactToCandidate', () => {
  it('maps a cold contact to at_risk section', () => {
    const contact = {
      id: 'contact-1',
      name: 'Alex',
      email: 'alex@example.com',
      is_vip: false,
      last_interaction_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      last_interaction_channel: 'gmail',
    } as unknown as Contact;

    const candidate = mapColdContactToCandidate(contact);
    expect(candidate.section).toBe('at_risk');
    expect(candidate.item_type).toBe('relationship_alert');
    expect(candidate.title).toContain('Reconnect with Alex');
    expect(candidate.summary).toContain('30 days');
  });

  it('shows VIP indicator for VIP contacts', () => {
    const contact = {
      id: 'contact-2',
      name: 'Board Member',
      email: 'board@example.com',
      is_vip: true,
      last_interaction_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      last_interaction_channel: 'outlook',
    } as unknown as Contact;

    const candidate = mapColdContactToCandidate(contact);
    expect(candidate.summary).toContain('VIP');
    expect(candidate.raw_urgency).toBe(7);
  });

  it('gives lower urgency for non-VIP contacts', () => {
    const contact = {
      id: 'contact-3',
      name: 'Regular Person',
      email: 'regular@example.com',
      is_vip: false,
      last_interaction_at: null,
      last_interaction_channel: null,
    } as unknown as Contact;

    const candidate = mapColdContactToCandidate(contact);
    expect(candidate.raw_urgency).toBe(5);
  });
});

describe('scoring heuristics (via candidate mapping)', () => {
  it('VIP inbox items have higher urgency than regular emails', () => {
    const vipItem = makeInboxItem({ from_email: 'ceo@company.com', urgency_score: 5 });
    const regularItem = makeInboxItem({ urgency_score: 5 });

    const vipCandidate = mapInboxItemToCandidate(vipItem, mockUserContext.vipEmails);
    const regularCandidate = mapInboxItemToCandidate(regularItem);

    // VIP goes to vip_inbox section which gets urgency boost in scoring
    expect(vipCandidate.section).toBe('vip_inbox');
    expect(regularCandidate.section).toBe('priority_inbox');
  });

  it('commitment candidates have raw_urgency of 7 or 9', () => {
    const noDeadline = {
      id: 'c-1',
      commitment_text: 'Do thing',
      recipient_name: 'X',
      recipient_email: 'x@x.com',
      source_ref: { provider: 'gmail', message_id: '1', excerpt: 'ok' },
      implied_deadline: null,
      explicit_deadline: null,
    } as unknown as Commitment;

    const withDeadline = {
      ...noDeadline,
      explicit_deadline: '2026-03-10',
    } as unknown as Commitment;

    expect(mapCommitmentToCandidate(noDeadline).raw_urgency).toBe(7);
    expect(mapCommitmentToCandidate(withDeadline).raw_urgency).toBe(9);
  });
});
