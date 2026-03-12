import { AI_MODELS } from '@/lib/ai/models';
import { validateBriefingItem } from '@/lib/ai/safety/citation-validator';
import {
  synthesiseBriefing,
  mapInboxItemToCandidate,
  mapTaskToCandidate,
  mapEventToCandidate,
  mapColdContactToCandidate,
  mapDecliningContactToCandidate,
  mapSentAwaitingReplyToCandidate,
  mapAfterHoursToCandidate,
  mapDesktopObservationToCandidate,
} from './prioritisation';
import { fetchEnrichedContext } from './briefing-context';
import type { MeetingPrep } from './meeting-prep';
import type { BriefingItemCandidate, RankedBriefingItem } from './prioritisation';
import type { BriefingStats } from '@/lib/ai/prompts/briefing-synthesis';
import { createServiceClient } from '@/lib/db/client';
import { listInboxItems } from '@/lib/db/queries/inbox';
import { listTasks } from '@/lib/db/queries/tasks';
import { getProfile, getOnboardingData, getVipContacts, getColdContacts } from '@/lib/db/queries/users';
import { getDecliningContacts, listContacts } from '@/lib/db/queries/contacts';
import { insertBriefing, insertBriefingItems } from '@/lib/db/queries/briefings';
import { getDesktopObserverChunks } from '@/lib/db/queries/context';
import type { ParsedCalendarEvent } from '@/lib/integrations/google-calendar';
import type { Briefing, BriefingItem, BriefingItemSection, Contact } from '@/lib/db/types';
import { getTodayInTimezone } from '@/lib/utils/timezone';

export interface GeneratedBriefing extends Briefing {
  items: BriefingItem[];
  meeting_preps: MeetingPrep[];
}

// Briefing section order
const SECTION_ORDER: BriefingItemSection[] = [
  'priorities',
  'todays_meetings',
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
 * Fetch yesterday's resolved tasks as "completed" candidates,
 * and still-open tasks from yesterday as "carried over" candidates.
 */
async function getYesterdaySummary(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<BriefingItemCandidate[]> {
  const candidates: BriefingItemCandidate[] = [];

  try {
    // Get tasks resolved yesterday
    const resolvedTasks = await listTasks(supabase, userId, { status: 'resolved' });
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const c of resolvedTasks) {
      const resolvedAt = c.resolved_at ? new Date(c.resolved_at) : null;
      if (resolvedAt && resolvedAt >= yesterday && resolvedAt < today) {
        candidates.push({
          item_type: 'commitment',
          section: 'yesterday_completed',
          title: c.task_text,
          summary: `Completed task for ${c.recipient_name || c.recipient_email}`,
          source_ref: c.source_ref as unknown as BriefingItemCandidate['source_ref'],
          sentiment: 'positive',
        });
      }
    }

    // Get open tasks that were created before today (carried over)
    const openTasks = await listTasks(supabase, userId, { status: 'open' });
    for (const c of openTasks) {
      const createdAt = new Date(c.created_at);
      if (createdAt < today) {
        candidates.push({
          item_type: 'commitment',
          section: 'yesterday_carried_over',
          title: c.task_text,
          summary: c.implied_deadline
            ? `Still open — deadline: ${c.implied_deadline}. To ${c.recipient_name || c.recipient_email}`
            : `Still open — task for ${c.recipient_name || c.recipient_email}`,
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
    tasks,
    todaysEvents,
    coldContacts,
    decliningContacts,
    sentAwaitingReply,
    afterHoursEmails,
    desktopObservations,
    yesterdaySummary,
    userContext,
    _profile,
  ] = await Promise.all([
    listInboxItems(supabase, userId, { unreadOnly: true, limit: 30 }),
    listTasks(supabase, userId, { status: 'open' }),
    getTodaysCalendarEvents(userId),
    getColdContacts(supabase, userId),
    getDecliningContacts(supabase, userId),
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

  // Overdue/due-today counts used in buildBriefingStats below

  // Build candidate items — map to new sections
  const candidates: BriefingItemCandidate[] = [
    // Today's actionable items → will be synthesised into "priorities"
    ...inboxItems.map(item => ({
      ...mapInboxItemToCandidate(item, userContext.vipEmails),
      section: 'priorities' as BriefingItemSection,
    })),
    ...tasks.map(c => ({
      ...mapTaskToCandidate(c),
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
    // Declining relationships (exclude contacts already flagged cold to avoid dupes)
    ...decliningContacts
      .filter(c => !c.is_cold)
      .map(c => ({
        ...mapDecliningContactToCandidate(c),
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

  // Enrich briefing with auto-generated meeting preps (from meeting-prep-auto job)
  const meetingPreps: MeetingPrep[] = [];
  try {
    const { getTodaysMeetingPreps } = await import('@/lib/db/queries/meeting-preps');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const storedPreps = await getTodaysMeetingPreps(
      supabase,
      userId,
      todayStart.toISOString(),
      todayEnd.toISOString(),
    );

    for (const prep of storedPreps) {
      meetingPreps.push({
        event_id: prep.event_id,
        event_title: prep.event_title,
        summary: prep.summary,
        attendee_context: prep.attendee_context,
        open_items: prep.open_items,
        suggested_talking_points: prep.suggested_talking_points,
        watch_out_for: prep.watch_out_for,
      });

      // Add a briefing candidate for each prepped meeting
      const attendeeNames = prep.attendees
        .map((a: { name: string }) => a.name)
        .slice(0, 3)
        .join(', ');
      const openItemCount = prep.open_items.length;

      candidates.push({
        item_type: 'calendar_event' as const,
        section: 'todays_meetings' as BriefingItemSection,
        title: prep.event_title,
        summary: `${attendeeNames}${prep.attendees.length > 3 ? ` +${prep.attendees.length - 3}` : ''} — ${openItemCount > 0 ? `${openItemCount} open item${openItemCount > 1 ? 's' : ''} to discuss. ` : ''}${prep.summary}`,
        source_ref: {
          provider: 'google_calendar',
          message_id: prep.event_id,
          excerpt: prep.summary.slice(0, 200),
        },
        sentiment: openItemCount > 0 ? 'urgent' as const : 'neutral' as const,
      });
    }
  } catch {
    // Non-fatal — briefing works without meeting prep enrichment
  }

  const enrichedContext = await fetchEnrichedContext(
    supabase,
    userId,
    candidates,
    userContext.vipEmails,
    userContext.activeProjects,
    timezone,
  );

  // Build briefing stats: overdue tasks, relationship scores, working patterns
  const briefingStats = await buildBriefingStats(supabase, userId, tasks, enrichedContext);

  // AI synthesis: rank, group, and reason about all candidates using full context
  const ranked = await synthesiseBriefing(candidates, userContext, enrichedContext, briefingStats);

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

/**
 * Build stats for the briefing synthesis prompt: overdue tasks,
 * relationship scores, and working pattern peak hours.
 */
async function buildBriefingStats(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  openTasks: Awaited<ReturnType<typeof listTasks>>,
  enrichedContext: Awaited<ReturnType<typeof fetchEnrichedContext>>,
): Promise<BriefingStats> {
  const now = new Date();

  // Count overdue and due-today tasks
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const overdueTaskCount = openTasks.filter(c => {
    if (!c.implied_deadline) return false;
    return new Date(c.implied_deadline) < todayStart;
  }).length;
  const dueTodayTaskCount = openTasks.filter(c => {
    if (!c.implied_deadline) return false;
    const d = new Date(c.implied_deadline);
    return d >= todayStart && d < tomorrowStart;
  }).length;

  // Get top relationships and declining ones
  let topRelationshipScores: BriefingStats['topRelationshipScores'] = [];
  let decliningRelationships: BriefingStats['decliningRelationships'] = [];

  try {
    const topContacts = await listContacts(supabase, userId, {
      limit: 5,
      orderBy: 'relationship_score',
    });

    topRelationshipScores = topContacts
      .filter((c: Contact) => c.relationship_score !== null && c.relationship_score > 0)
      .map((c: Contact) => ({
        name: c.name ?? c.email,
        email: c.email,
        score: c.relationship_score ?? 0,
      }));

    // Find declining contacts from score_history
    const allScored = await listContacts(supabase, userId, { limit: 50 });
    decliningRelationships = allScored
      .filter((c: Contact) => {
        const history = c.score_history ?? [];
        if (history.length < 2) return false;
        const current = history[0]?.score ?? 0;
        const previous = history[1]?.score ?? 0;
        return previous - current >= 5; // Meaningful decline
      })
      .slice(0, 5)
      .map((c: Contact) => {
        const history = c.score_history ?? [];
        return {
          name: c.name ?? c.email,
          email: c.email,
          score: history[0]?.score ?? c.relationship_score ?? 0,
          previousScore: history[1]?.score ?? 0,
        };
      });
  } catch {
    // Non-fatal — stats are best-effort
  }

  // Extract peak hours and work hours from enriched context working patterns
  const wp = enrichedContext.workingPatterns;
  const peakHours = wp?.peak_hours
    ?.sort((a, b) => b.activity_score - a.activity_score)
    .slice(0, 5)
    .map(h => ({ hour: h.hour, activityScore: h.activity_score })) ?? [];

  const workHours = wp?.typical_start_time && wp?.typical_end_time
    ? { start: wp.typical_start_time, end: wp.typical_end_time }
    : null;

  return {
    overdueTaskCount,
    dueTodayTaskCount,
    topRelationshipScores,
    decliningRelationships,
    peakHours,
    workHours,
  };
}
