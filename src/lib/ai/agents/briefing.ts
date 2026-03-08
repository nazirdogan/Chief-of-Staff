import { AI_MODELS } from '@/lib/ai/models';
import { validateBriefingItem } from '@/lib/ai/safety/citation-validator';
import {
  prioritiseItems,
  mapInboxItemToCandidate,
  mapCommitmentToCandidate,
  mapEventToCandidate,
  mapColdContactToCandidate,
  mapSentAwaitingReplyToCandidate,
  mapAfterHoursToCandidate,
  mapDesktopObservationToCandidate,
} from './prioritisation';
import { generateMeetingPrep } from './meeting-prep';
import type { MeetingPrep } from './meeting-prep';
import type { UserContext, BriefingItemCandidate, RankedBriefingItem } from './prioritisation';
import { createServiceClient } from '@/lib/db/client';
import { listInboxItems } from '@/lib/db/queries/inbox';
import { listCommitments } from '@/lib/db/queries/commitments';
import { getProfile, getOnboardingData, getVipContacts, getColdContacts } from '@/lib/db/queries/users';
import { insertBriefing, insertBriefingItems, updateBriefingDelivery } from '@/lib/db/queries/briefings';
import { getDesktopObserverChunks } from '@/lib/db/queries/context';
import type { ParsedCalendarEvent } from '@/lib/integrations/google-calendar';
import type { Briefing, BriefingItem, BriefingItemSection } from '@/lib/db/types';

export interface GeneratedBriefing extends Briefing {
  items: BriefingItem[];
  meeting_preps: MeetingPrep[];
}

// Executive briefing section order
const SECTION_ORDER: BriefingItemSection[] = [
  'todays_schedule',
  'commitment_queue',
  'vip_inbox',
  'action_required',
  'awaiting_reply',
  'after_hours',
  'at_risk',
  'priority_inbox',
];

async function getUserContext(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
): Promise<UserContext> {
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

/**
 * Fetch sent emails awaiting reply from Gmail and Outlook.
 */
async function getSentAwaitingReply(userId: string): Promise<BriefingItemCandidate[]> {
  const candidates: BriefingItemCandidate[] = [];

  // Gmail sent-awaiting-reply
  try {
    const { fetchSentAwaitingReply } = await import('@/lib/integrations/gmail');
    const gmailSent = await fetchSentAwaitingReply(userId);
    candidates.push(...gmailSent.map(m => mapSentAwaitingReplyToCandidate(m, 'gmail')));
  } catch {
    // Gmail not connected or error
  }

  // Outlook sent-awaiting-reply
  try {
    const { fetchOutlookSentAwaitingReply } = await import('@/lib/integrations/outlook');
    const outlookSent = await fetchOutlookSentAwaitingReply(userId);
    candidates.push(...outlookSent.map(m => mapSentAwaitingReplyToCandidate(m, 'outlook')));
  } catch {
    // Outlook not connected or error
  }

  return candidates;
}

/**
 * Fetch after-hours email arrivals from Gmail.
 */
async function getAfterHoursEmails(userId: string): Promise<BriefingItemCandidate[]> {
  try {
    const { fetchAfterHoursMessages } = await import('@/lib/integrations/gmail');
    const messages = await fetchAfterHoursMessages(userId);
    return messages.map(mapAfterHoursToCandidate);
  } catch {
    return [];
  }
}

function buildBriefingSections(
  ranked: RankedBriefingItem[]
): Array<{
  section: BriefingItemSection;
  items: RankedBriefingItem[];
}> {
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

export async function generateDailyBriefing(userId: string): Promise<GeneratedBriefing> {
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
    userContext,
    profile,
  ] = await Promise.all([
    listInboxItems(supabase, userId, { unreadOnly: true, limit: 30 }),
    listCommitments(supabase, userId, { status: 'open' }),
    getTodaysCalendarEvents(userId),
    getColdContacts(supabase, userId),
    getSentAwaitingReply(userId),
    getAfterHoursEmails(userId),
    // Desktop observer: fetch recent observations (last 24h, communication + important activity)
    getDesktopObserverChunks(supabase, userId, {
      after: yesterday.toISOString(),
      minImportance: 'background',
      limit: 30,
    }).catch(() => []),
    getUserContext(supabase, userId),
    getProfile(supabase, userId),
  ]);

  // Build candidate items with executive-focused section assignment
  const candidates: BriefingItemCandidate[] = [
    // Inbox items routed to vip_inbox, action_required, or priority_inbox
    ...inboxItems.map(item => mapInboxItemToCandidate(item, userContext.vipEmails)),
    // Commitments
    ...commitments.map(mapCommitmentToCandidate),
    // Calendar events for today
    ...todaysEvents.map(mapEventToCandidate),
    // Cold contacts at risk
    ...coldContacts.map(mapColdContactToCandidate),
    // Sent emails awaiting reply
    ...sentAwaitingReply,
    // After-hours arrivals
    ...afterHoursEmails,
    // Desktop observer data (WhatsApp, Messages, Slack desktop, etc.)
    ...desktopObservations.map(chunk =>
      mapDesktopObservationToCandidate(chunk, userContext.vipEmails)
    ),
  ];

  // Prioritise within each section
  const ranked = await prioritiseItems(candidates, userContext);

  // Generate meeting prep for each today's event
  const meetingPreps = await Promise.all(
    todaysEvents.map(event => generateMeetingPrep(userId, event))
  );

  // Build sections
  const sections = buildBriefingSections(ranked);

  // Validate every item has a source_ref before writing to DB
  const allItems = sections.flatMap(s => s.items);
  for (const item of allItems) {
    validateBriefingItem(item);
  }

  const generationMs = Date.now() - startTime;
  const briefingDate = new Date().toISOString().split('T')[0];

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
