import type { SupabaseClient } from '@supabase/supabase-js';
import type { SubscriptionTier } from '@/lib/db/types';

const FREE_TIER_DAILY_LIMIT = 5;

export async function getDailyUsage(
  supabase: SupabaseClient,
  userId: string,
  date?: string
): Promise<number> {
  const usageDate = date ?? new Date().toISOString().split('T')[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('daily_message_usage')
    .select('message_count')
    .eq('user_id', userId)
    .eq('usage_date', usageDate)
    .single();

  return data?.message_count ?? 0;
}

export async function incrementDailyUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const usageDate = new Date().toISOString().split('T')[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: existing } = await db
    .from('daily_message_usage')
    .select('id, message_count')
    .eq('user_id', userId)
    .eq('usage_date', usageDate)
    .single();

  if (existing) {
    const newCount = (existing.message_count ?? 0) + 1;
    await db
      .from('daily_message_usage')
      .update({ message_count: newCount, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    return newCount;
  }

  const { data: created } = await db
    .from('daily_message_usage')
    .insert({ user_id: userId, usage_date: usageDate, message_count: 1 })
    .select('message_count')
    .single();

  return created?.message_count ?? 1;
}

export async function checkMessageLimit(
  supabase: SupabaseClient,
  userId: string,
  tier?: SubscriptionTier | null
): Promise<{ allowed: boolean; used: number; limit: number; remaining: number }> {
  // Paid subscribers (plus, pro, enterprise, power, team) are not limited.
  // withAuth already resolves the tier, so callers should pass it to avoid a
  // redundant profiles query. If tier is not provided, fall back to a DB lookup.
  let resolvedTier = tier;
  if (!resolvedTier) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('subscription_status, subscription_tier')
      .eq('id', userId)
      .single();
    resolvedTier = profile?.subscription_tier ?? 'free';
  }

  const isPaid = resolvedTier !== 'free';
  if (isPaid) {
    return { allowed: true, used: 0, limit: Infinity, remaining: Infinity };
  }

  const used = await getDailyUsage(supabase, userId);
  const remaining = Math.max(0, FREE_TIER_DAILY_LIMIT - used);

  return {
    allowed: used < FREE_TIER_DAILY_LIMIT,
    used,
    limit: FREE_TIER_DAILY_LIMIT,
    remaining,
  };
}
