import { AI_MODELS } from '@/lib/ai/models';
import { validateBriefingItem } from '@/lib/ai/safety/citation-validator';
import {
  synthesiseBriefing,
  mapInboxItemToCandidate,
  mapCommitmentToCandidate,
  mapEventToCandidate,
  mapColdContactToCandidate,
  mapSentAwaitingReplyToCandidate,
  mapAfterHoursToCandidate,
  mapDesktopObservationToCandidate,
} from './prioritisation';
import { fetchEnrichedContext } from './briefing-context';
import type { MeetingPrep } from './meeting-prep';
import type { BriefingItemCandidate, RankedBriefingItem } from './prioritisation';
import { createServiceClient } from '@/lib/db/client';
import { listInboxItems } from '@/lib/db/queries/inbox';
import { listCommitments } from '@/lib/db/queries/commitments';
import { getProfile, getOnboardingData, getVipContacts, getColdContacts } from '@/lib/db/queries/users';
import { insertBriefing, insertBriefingItems } from '@/lib/db/queries/briefings';
import { getDesktopObserverChunks } from '@/lib/db/queries/context';
import type { ParsedCalendarEvent } from '@/lib/integrations/google-calendar';
import type { Briefing, BriefingItem, BriefingItemSection } from '@/lib/db/types';
import { getTodayInTimezone } from '@/lib/utils/timezone';

export interface GeneratedBriefing extends Briefing {
  items: BriefingItem[];
  meeting_preps: MeetingPrep[];
}

// New 3-section briefing order
const SECTION_ORDER: BriefingItemSection[] = [
  'priorities',
  'yesterday_completed',
  'yesterday_carried_over',
  'todays_schedule',
];

// Legacy sections map to priorities for backward compatibility
const LEGACY_SECTION_MAP: Record<string, BriefingItemSection> = {
  commitment_queue: 'priorities',
  vip_inbox: 'priorities',
  action_required: 'priorities',
  awaiting_reply: 'priorities',
  after_hours: 'priorities',
  at_risk: 'priorities',
  priority_inbox: 'priorities',
  decision_queue: 'priorities',
  quick_wins: 'priorities',
  people_context: 'priorities',
};

async function getUserContext(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
) {
  const [onboardingData, vipContacts] = await Promise.all([
    getOnboardingData(supabase, userId),
    getVipContacts(supabase, userId),
  ]);

  return {
    vipEmails: vipContacts.map(c => c.email),
    activeProjects: onboardingData?.active_projects ?? [],
    weeklyPriority: onboardingData?.weekly_priority ?? null,
  };
}

async function getTodaysCalendarEvents(userId: string): Promise<ParsedCalendarEvent[]> {
  const events: ParsedCalendarEvent[] = [];

  // Google Calendar
  try {
    const { getTodaysParsedEvents } = await import('@/lib/integrations/google-calendar');
    const gcalEvents = await getTodaysParsedEvents(userId);
    events.push(...gcalEvents);
  } catch {
    // Google Calendar not connected or error
  }

  // Outlook Calendar
  try {
    const { getTodaysOutlookEvents } = await import('@/lib/integrations/outlook');
    const outlookEvents = await getTodaysOutlookEvents(userId);
    events.push(...outlookEvents.map(e => ({ ...e })));
  } catch {
    // Outlook not connected or error
  }

  events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return events;
}

async function getSentAwaitingReply(userId: string): Promise<BriefingItemCandidate[]> {
  const candidates: BriefingItemCandidate[] = [];

  try {
    const { fetchSentAwaitingReply } = await import('@/lib/integrations/gmail');
    const gmailSent = await fetchSentAwaitingReply(userId);
    candidates.push(...gmailSent.map(m => mapSentAwaitingReplyToCandidate(m, 'gmail')));
  } catch {
    // Gmail not connected or error
  }

  try {
    const { fetchOutlookSentAwaitingReply } = await import('@/lib/integrations/outlook');
    const outlookSent = await fetchOutlookSentAwaitingReply(userId);
    candidates.push(...outlookSent.map(m => mapSentAwaitingReplyToCandidate(m, 'outlook')));
  } catch {
    // Outlook not connected or error
  }

  return candidates;
}

async function getAfterHoursEmails(userId: string): Promise<BriefingItemCandidate[]> {
  try {
    const { fetchAfterHoursMessages } = await import('@/lib/integrations/gmail');
    const messages = await fetchAfterHoursMessages(userId);
    return messages.map(mapAfterHoursToCandidate);
  } catch {
    return [];
  }
}

/**
 * Fetch yesterday's resolved commitments as "completed" candidates,
 * and still-open commitments from yesterday as "carried over" candidates.
 */
async function getYesterdaySummary(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<BriefingItemCandidate[]> {
  const candidates: BriefingItemCandidate[] = [];

  try {
    // Get commitments resolved yesterday
    const resolvedCommitments = await listCommitments(supabase, userId, { status: 'resolved' });
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const c of resolvedCommitments) {
      const resolvedAt = c.resolved_at ? new Date(c.resolved_at) : null;
      if (resolvedAt && resolvedAt >= yesterday && resolvedAt < today) {
        candidates.push({
          item_type: 'commitment',
          section: 'yesterday_completed',
          title: c.commitment_text,
          summary: `Completed commitment to ${c.recipient_name || c.recipient_email}`,
          source_ref: c.source_ref as unknown as BriefingItemCandidate['source_ref'],
          sentiment: 'positive',
        });
      }
    }

    // Get open commitments that were created before today (carried over)
    const openCommitments = await listCommitments(supabase, userId, { status: 'open' });
    for (const c of openCommitments) {
      const createdAt = new Date(c.created_at);
      if (createdAt < today) {
        candidates.push({
          item_type: 'commitment',
          section: 'yesterday_carried_over',
          title: c.commitment_text,
          summary: c.implied_deadline
            ? `Still open — deadline: ${c.implied_deadline}. To ${c.recipient_name || c.recipient_email}`
            : `Still open — commitment to ${c.recipient_name || c.recipient_email}`,
          source_ref: c.source_ref as unknown as BriefingItemCandidate['source_ref'],
          sentiment: c.implied_deadline && new Date(c.implied_deadline) < today ? 'urgent' : 'neutral',
        });
      }
    }
  } catch {
    // Silently handle — yesterday data is best-effort
  }

  return candidates;
}

function normalizeSection(section: string): BriefingItemSection {
  if (SECTION_ORDER.includes(section as BriefingItemSection)) {
    return section as BriefingItemSection;
  }
  return LEGACY_SECTION_MAP[section] ?? 'priorities';
}

function buildBriefingSections(
  ranked: RankedBriefingItem[]
): Array<{
  section: BriefingItemSection;
  items: RankedBriefingItem[];
}> {
  // Normalize any legacy sections
  for (const item of ranked) {
    item.section = normalizeSection(item.section);
  }

  const grouped: Record<string, RankedBriefingItem[]> = {};
  for (const item of ranked) {
    if (!grouped[item.section]) grouped[item.section] = [];
    grouped[item.section].push(item);
  }

  return SECTION_ORDER
    .filter(section => grouped[section]?.length)
    .map(section => ({
      section,
      items: grouped[section],
    }));
}

export async function generateDailyBriefing(userId: string, timezone?: string): Promise<GeneratedBriefing> {
  const startTime = Date.now();
  const supabase = createServiceClient();

  // Fetch all data sources in parallel — both OAuth integrations AND desktop observer
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const [
    inboxItems,
    commitments,
    todaysEvents,
    coldContacts,
    sentAwaitingReply,
    afterHoursEmails,
    desktopObservations,
    yesterdaySummary,
    userContext,
    _profile,
  ] = await Promise.all([
    listInboxItems(supabase, userId, { unreadOnly: true, limit: 30 }),
    listCommitments(supabase, userId, { status: 'open' }),
    getTodaysCalendarEvents(userId),
    getColdContacts(supabase, userId),
    getSentAwaitingReply(userId),
    getAfterHoursEmails(userId),
    getDesktopObserverChunks(supabase, userId, {
      after: yesterday.toISOString(),
      minImportance: 'background',
      limit: 30,
    }).catch(() => []),
    getYesterdaySummary(supabase, userId),
    getUserContext(supabase, userId),
    getProfile(supabase, userId),
  ]);

  // Build candidate items — map to new sections
  const candidates: BriefingItemCandidate[] = [
    // Today's actionable items → will be synthesised into "priorities"
    ...inboxItems.map(item => ({
      ...mapInboxItemToCandidate(item, userContext.vipEmails),
      section: 'priorities' as BriefingItemSection,
    })),
    ...commitments.map(c => ({
      ...mapCommitmentToCandidate(c),
      section: 'priorities' as BriefingItemSection,
    })),
    // Calendar → todays_schedule
    ...todaysEvents.map(e => ({
      ...mapEventToCandidate(e),
      section: 'todays_schedule' as BriefingItemSection,
    })),
    // Relationship alerts → priorities
    ...coldContacts.map(c => ({
      ...mapColdContactToCandidate(c),
      section: 'priorities' as BriefingItemSection,
    })),
    // Sent awaiting → priorities
    ...sentAwaitingReply.map(c => ({
      ...c,
      section: 'priorities' as BriefingItemSection,
    })),
    // After hours → priorities
    ...afterHoursEmails.map(c => ({
      ...c,
      section: 'priorities' as BriefingItemSection,
    })),
    // Desktop observations → priorities
    ...desktopObservations.map(chunk => ({
      ...mapDesktopObservationToCandidate(chunk, userContext.vipEmails),
      section: 'priorities' as BriefingItemSection,
    })),
    // Yesterday's completed + carried over
    ...yesterdaySummary,
  ];

  // Meeting prep is now on-demand only (user taps "Prep for meeting" button).
  // Removed from briefing generation to eliminate per-event Sonnet calls.
  const meetingPreps: MeetingPrep[] = [];

  const enrichedContext = await fetchEnrichedContext(
    supabase,
    userId,
    candidates,
    userContext.vipEmails,
    userContext.activeProjects,
    timezone,
  );

  // AI synthesis: rank, group, and reason about all candidates using full context
  const ranked = await synthesiseBriefing(candidates, userContext, enrichedContext);

  // Build sections
  const sections = buildBriefingSections(ranked);

  // Validate every item has a source_ref before writing to DB
  const allItems = sections.flatMap(s => s.items);
  for (const item of allItems) {
    validateBriefingItem(item);
  }

  const generationMs = Date.now() - startTime;
  const briefingDate = timezone ? getTodayInTimezone(timezone) : new Date().toISOString().split('T')[0];

  // Write briefing to database
  const briefing = await insertBriefing(supabase, {
    user_id: userId,
    briefing_date: briefingDate,
    item_count: allItems.length,
    generation_model: AI_MODELS.STANDARD,
    generation_ms: generationMs,
    meeting_preps: meetingPreps,
  });

  // Write all briefing items
  const itemRecords = allItems.map(item => ({
    briefing_id: briefing.id,
    user_id: userId,
    rank: item.rank,
    section: item.section,
    item_type: item.item_type,
    title: item.title,
    summary: item.summary,
    reasoning: item.reasoning,
    source_ref: item.source_ref as unknown as Record<string, unknown>,
    action_suggestion: item.action_suggestion,
    sentiment: item.sentiment ?? null,
    urgency_score: item.urgency_score,
    importance_score: item.importance_score,
    risk_score: item.risk_score,
    composite_score: item.composite_score,
  }));

  const savedItems = await insertBriefingItems(supabase, itemRecords);

  return {
    ...briefing,
    items: savedItems,
    meeting_preps: meetingPreps,
  };
}
