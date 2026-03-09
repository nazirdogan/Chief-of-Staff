import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Briefing, BriefingItem, MeetingPrepData, MessageSentiment } from '../types';

type Client = SupabaseClient<Database>;

export async function getTodaysBriefing(
  supabase: Client,
  userId: string,
  date?: string
): Promise<(Briefing & { items: BriefingItem[] }) | null> {
  const briefingDate = date ?? new Date().toISOString().split('T')[0];

  const { data: briefing, error } = await supabase
    .from('briefings')
    .select('*')
    .eq('user_id', userId)
    .eq('briefing_date', briefingDate)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!briefing) return null;

  const { data: items, error: itemsError } = await supabase
    .from('briefing_items')
    .select('*')
    .eq('briefing_id', (briefing as Briefing).id)
    .eq('user_id', userId)
    .order('rank', { ascending: true });

  if (itemsError) throw itemsError;

  return {
    ...(briefing as Briefing),
    items: (items ?? []) as BriefingItem[],
  };
}

export async function insertBriefing(
  supabase: Client,
  briefing: {
    user_id: string;
    briefing_date: string;
    delivery_channel?: string;
    item_count: number;
    generation_model?: string;
    generation_ms?: number;
    meeting_preps?: MeetingPrepData[];
  }
): Promise<Briefing> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('briefings')
    .upsert(briefing, { onConflict: 'user_id,briefing_date' })
    .select()
    .single();

  if (error) throw error;

  // On regeneration, remove stale items from the previous run
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('briefing_items')
    .delete()
    .eq('briefing_id', (data as Briefing).id);

  return data as Briefing;
}

export async function insertBriefingItems(
  supabase: Client,
  items: Array<{
    briefing_id: string;
    user_id: string;
    rank: number;
    section: string;
    item_type: string;
    title: string;
    summary: string;
    reasoning: string;
    source_ref: Record<string, unknown>;
    action_suggestion?: string;
    sentiment?: MessageSentiment | null;
    urgency_score?: number;
    importance_score?: number;
    risk_score?: number;
    composite_score?: number;
  }>
): Promise<BriefingItem[]> {
  if (items.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('briefing_items')
    .insert(items)
    .select();

  if (error) throw error;
  return (data ?? []) as BriefingItem[];
}

export async function updateBriefingItemFeedback(
  supabase: Client,
  userId: string,
  itemId: string,
  feedback: 1 | -1
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('briefing_items')
    .update({
      user_feedback: feedback,
      feedback_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('id', itemId);

  if (error) throw error;
}

export async function updateBriefingDelivery(
  supabase: Client,
  briefingId: string,
  channel: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('briefings')
    .update({
      delivered_at: new Date().toISOString(),
      delivery_channel: channel,
    })
    .eq('id', briefingId);

  if (error) throw error;
}
