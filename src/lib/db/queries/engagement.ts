import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, EmailEngagementSignal } from '../types';

type Client = SupabaseClient<Database>;

/**
 * Upsert an engagement signal for a sender domain.
 * Increments the relevant counter and recalculates engagement_score.
 */
export async function upsertEngagementSignal(
  supabase: Client,
  userId: string,
  senderDomain: string,
  event: 'open' | 'click' | 'reply',
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Fetch existing row
  const { data: existing } = await db
    .from('email_engagement_signals')
    .select('*')
    .eq('user_id', userId)
    .eq('sender_domain', senderDomain)
    .single();

  const now = new Date().toISOString();

  if (!existing) {
    // Create new row
    const counters = { open_count: 0, click_count: 0, reply_count: 0 };
    if (event === 'open') counters.open_count = 1;
    if (event === 'click') counters.click_count = 1;
    if (event === 'reply') counters.reply_count = 1;

    const score = calculateEngagementScore(
      counters.open_count,
      counters.click_count,
      counters.reply_count,
      now,
    );

    await db.from('email_engagement_signals').insert({
      user_id: userId,
      sender_domain: senderDomain,
      ...counters,
      last_engaged_at: now,
      engagement_score: score,
    });
    return;
  }

  // Update existing row
  const signal = existing as EmailEngagementSignal;
  const openCount = signal.open_count + (event === 'open' ? 1 : 0);
  const clickCount = signal.click_count + (event === 'click' ? 1 : 0);
  const replyCount = signal.reply_count + (event === 'reply' ? 1 : 0);

  const score = calculateEngagementScore(openCount, clickCount, replyCount, now);

  await db
    .from('email_engagement_signals')
    .update({
      open_count: openCount,
      click_count: clickCount,
      reply_count: replyCount,
      last_engaged_at: now,
      engagement_score: score,
    })
    .eq('id', signal.id);
}

/**
 * Get engagement signal for a specific sender domain.
 */
export async function getEngagementSignal(
  supabase: Client,
  userId: string,
  senderDomain: string,
): Promise<EmailEngagementSignal | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('email_engagement_signals')
    .select('*')
    .eq('user_id', userId)
    .eq('sender_domain', senderDomain)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as EmailEngagementSignal | null) ?? null;
}

/**
 * Returns true if the user's account was created >= 14 days ago.
 * Cold start = false means archive_email is always Tier 3 (safe default).
 */
export async function isColdStartComplete(
  supabase: Client,
  userId: string,
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('profiles')
    .select('created_at')
    .eq('id', userId)
    .single();

  if (error || !data) return false;

  const createdAt = new Date(data.created_at as string);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  return createdAt <= fourteenDaysAgo;
}

/**
 * Calculate engagement score from counters.
 * Formula: raw = (opens * 1) + (clicks * 3) + (replies * 5)
 *          score = min(raw / 30, 1.0)
 * Time decay: >30 days = 0.5x, >60 days = 0.2x
 */
function calculateEngagementScore(
  openCount: number,
  clickCount: number,
  replyCount: number,
  lastEngagedAt: string,
): number {
  const raw = openCount * 1 + clickCount * 3 + replyCount * 5;
  let score = Math.min(raw / 30, 1.0);

  const lastEngaged = new Date(lastEngagedAt);
  const daysSinceEngagement = (Date.now() - lastEngaged.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceEngagement > 60) {
    score *= 0.2;
  } else if (daysSinceEngagement > 30) {
    score *= 0.5;
  }

  // Round to 3 decimal places to match NUMERIC(4,3)
  return Math.round(score * 1000) / 1000;
}
