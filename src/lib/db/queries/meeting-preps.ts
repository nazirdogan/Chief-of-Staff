/**
 * Database queries for meeting preps.
 */

import type { MeetingPrepRow } from '@/lib/db/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

/** Get a meeting prep by user + event ID */
export async function getMeetingPrep(
  db: DB,
  userId: string,
  eventId: string,
): Promise<MeetingPrepRow | null> {
  const { data } = await db
    .from('meeting_preps')
    .select('*')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .single();
  return data ?? null;
}

/** Get all meeting preps for today (events starting today) */
export async function getTodaysMeetingPreps(
  db: DB,
  userId: string,
  todayStart: string,
  todayEnd: string,
): Promise<MeetingPrepRow[]> {
  const { data } = await db
    .from('meeting_preps')
    .select('*')
    .eq('user_id', userId)
    .gte('event_start', todayStart)
    .lte('event_start', todayEnd)
    .order('event_start', { ascending: true });
  return data ?? [];
}

/** Get meetings starting in a time window that haven't been prepped yet */
export async function getUnpreppedUpcomingEvents(
  db: DB,
  userId: string,
  existingEventIds: string[],
): Promise<string[]> {
  // Returns event IDs that are NOT in the meeting_preps table
  if (existingEventIds.length === 0) return [];

  const { data } = await db
    .from('meeting_preps')
    .select('event_id')
    .eq('user_id', userId)
    .in('event_id', existingEventIds);

  const preppedIds = new Set((data ?? []).map((r: { event_id: string }) => r.event_id));
  return existingEventIds.filter((id) => !preppedIds.has(id));
}

/** Upsert a meeting prep */
export async function upsertMeetingPrep(
  db: DB,
  prep: Omit<MeetingPrepRow, 'id' | 'created_at' | 'updated_at'>,
): Promise<MeetingPrepRow> {
  const { data, error } = await db
    .from('meeting_preps')
    .upsert(
      {
        ...prep,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,event_id' },
    )
    .select('*')
    .single();

  if (error) throw new Error(`Failed to upsert meeting prep: ${error.message}`);
  return data;
}

/** Mark notification as sent for a meeting prep */
export async function markNotificationSent(
  db: DB,
  userId: string,
  eventId: string,
): Promise<void> {
  await db
    .from('meeting_preps')
    .update({
      notification_sent: true,
      notification_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('event_id', eventId);
}

/** Mark post-meeting scan as done */
export async function markPostMeetingScanDone(
  db: DB,
  userId: string,
  eventId: string,
): Promise<void> {
  await db
    .from('meeting_preps')
    .update({
      post_meeting_scan_done: true,
      post_meeting_scan_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('event_id', eventId);
}

/** Get meetings that ended recently and haven't had post-meeting scan */
export async function getMeetingsNeedingPostScan(
  db: DB,
  userId: string,
  endedAfter: string,
  endedBefore: string,
): Promise<MeetingPrepRow[]> {
  const { data } = await db
    .from('meeting_preps')
    .select('*')
    .eq('user_id', userId)
    .eq('post_meeting_scan_done', false)
    .gte('event_end', endedAfter)
    .lte('event_end', endedBefore)
    .order('event_end', { ascending: true });
  return data ?? [];
}

/** Get meetings needing notification (starting soon, not yet notified) */
export async function getMeetingsNeedingNotification(
  db: DB,
  userId: string,
  startingBefore: string,
  startingAfter: string,
): Promise<MeetingPrepRow[]> {
  const { data } = await db
    .from('meeting_preps')
    .select('*')
    .eq('user_id', userId)
    .eq('notification_sent', false)
    .gte('event_start', startingAfter)
    .lte('event_start', startingBefore);
  return data ?? [];
}
