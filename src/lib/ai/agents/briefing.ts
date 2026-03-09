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
import { generateMeetingPrep } from './meeting-prep';
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

// Executive briefing section order
const SECTION_ORDER: BriefingItemSection[] = [
  'todays_schedule',
  'commitment_queue',
  'vip_inbox',
  'action_required',
  'decision_queue',
  'awaiting_reply',
  'after_hours',
  'at_risk',
  'priority_inbox',
  'quick_wins',
  'people_context',
];

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
    getUserContext(supabase, userId),
    getProfile(supabase, userId),
  ]);

  // Build candidate items with suggested section assignment
  const candidates: BriefingItemCandidate[] = [
    ...inboxItems.map(item => mapInboxItemToCandidate(item, userContext.vipEmails)),
    ...commitments.map(mapCommitmentToCandidate),
    ...todaysEvents.map(mapEventToCandidate),
    ...coldContacts.map(mapColdContactToCandidate),
    ...sentAwaitingReply,
    ...afterHoursEmails,
    ...desktopObservations.map(chunk =>
      mapDesktopObservationToCandidate(chunk, userContext.vipEmails)
    ),
  ];

  // Fetch enriched context (memory snapshots, working patterns, threads, person/project context)
  // This runs in parallel with meeting prep generation below
  const [enrichedContext, ...meetingPreps] = await Promise.all([
    fetchEnrichedContext(
      supabase,
      userId,
      candidates,
      userContext.vipEmails,
      userContext.activeProjects,
      timezone,
    ),
    ...todaysEvents.map(event => generateMeetingPrep(userId, event)),
  ]);

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
