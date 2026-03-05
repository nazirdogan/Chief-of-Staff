import { AI_MODELS } from '@/lib/ai/models';
import { validateBriefingItem } from '@/lib/ai/safety/citation-validator';
import {
  prioritiseItems,
  mapInboxItemToCandidate,
  mapCommitmentToCandidate,
  mapEventToCandidate,
  mapColdContactToCandidate,
} from './prioritisation';
import { generateMeetingPrep } from './meeting-prep';
import type { MeetingPrep } from './meeting-prep';
import type { UserContext, BriefingItemCandidate, RankedBriefingItem } from './prioritisation';
import { createServiceClient } from '@/lib/db/client';
import { listInboxItems } from '@/lib/db/queries/inbox';
import { listCommitments } from '@/lib/db/queries/commitments';
import { getProfile, getOnboardingData, getVipContacts, getColdContacts } from '@/lib/db/queries/users';
import { insertBriefing, insertBriefingItems, updateBriefingDelivery } from '@/lib/db/queries/briefings';
import { sendTelegramMessage, formatBriefingForTelegram } from '@/lib/integrations/telegram';
import type { ParsedCalendarEvent } from '@/lib/integrations/google-calendar';
import type { Briefing, BriefingItem, BriefingItemSection } from '@/lib/db/types';

export interface GeneratedBriefing extends Briefing {
  items: BriefingItem[];
  meeting_preps: MeetingPrep[];
}

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
    // Google Calendar not connected or error — continue
  }

  // Outlook Calendar
  try {
    const { getTodaysOutlookEvents } = await import('@/lib/integrations/outlook');
    const outlookEvents = await getTodaysOutlookEvents(userId);
    // Map to ParsedCalendarEvent shape (same structure)
    events.push(...outlookEvents.map(e => ({
      ...e,
    })));
  } catch {
    // Outlook not connected or error — continue
  }

  // Sort all events by start time
  events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return events;
}

function buildBriefingSections(
  ranked: RankedBriefingItem[]
): Array<{
  section: BriefingItemSection;
  items: RankedBriefingItem[];
}> {
  const sectionOrder: BriefingItemSection[] = [
    'priority_inbox',
    'todays_schedule',
    'commitment_queue',
    'at_risk',
    'quick_wins',
  ];

  const grouped: Record<string, RankedBriefingItem[]> = {};
  for (const item of ranked) {
    if (!grouped[item.section]) grouped[item.section] = [];
    grouped[item.section].push(item);
  }

  return sectionOrder
    .filter(section => grouped[section]?.length)
    .map(section => ({
      section,
      items: grouped[section],
    }));
}

export async function generateDailyBriefing(userId: string): Promise<GeneratedBriefing> {
  const startTime = Date.now();
  const supabase = createServiceClient();

  // Fetch all data sources in parallel
  const [
    inboxItems,
    commitments,
    todaysEvents,
    coldContacts,
    userContext,
    profile,
  ] = await Promise.all([
    listInboxItems(supabase, userId, { unreadOnly: true, limit: 30 }),
    listCommitments(supabase, userId, { status: 'open' }),
    getTodaysCalendarEvents(userId),
    getColdContacts(supabase, userId),
    getUserContext(supabase, userId),
    getProfile(supabase, userId),
  ]);

  // Build candidate items for all sections
  const candidates: BriefingItemCandidate[] = [
    ...inboxItems.map(mapInboxItemToCandidate),
    ...commitments.map(mapCommitmentToCandidate),
    ...todaysEvents.map(mapEventToCandidate),
    ...coldContacts.map(mapColdContactToCandidate),
  ];

  // Prioritise and rank
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

  // Write briefing to database (including meeting preps)
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
    urgency_score: item.urgency_score,
    importance_score: item.importance_score,
    risk_score: item.risk_score,
    composite_score: item.composite_score,
  }));

  const savedItems = await insertBriefingItems(supabase, itemRecords);

  // Deliver via Telegram if configured
  if (profile?.telegram_chat_id) {
    const telegramMessage = formatBriefingForTelegram({
      id: briefing.id,
      briefing_date: briefingDate,
      items: allItems.map(item => ({
        rank: item.rank,
        title: item.title,
        summary: item.summary,
        reasoning: item.reasoning,
        section: item.section,
      })),
    });

    const sent = await sendTelegramMessage(profile.telegram_chat_id, telegramMessage);
    if (sent) {
      await updateBriefingDelivery(supabase, briefing.id, 'telegram');
    }
  }

  return {
    ...briefing,
    items: savedItems,
    meeting_preps: meetingPreps,
  };
}
