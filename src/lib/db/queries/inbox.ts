import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, InboxItem, IntegrationProvider, MessageSentiment } from '../types';

type Client = SupabaseClient<Database>;

export async function listInboxItems(
  supabase: Client,
  userId: string,
  options?: {
    provider?: IntegrationProvider;
    unreadOnly?: boolean;
    limit?: number;
  }
): Promise<InboxItem[]> {
  let query = supabase
    .from('inbox_items')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('received_at', { ascending: false });

  if (options?.provider) {
    query = query.eq('provider', options.provider);
  }
  if (options?.unreadOnly) {
    query = query.eq('is_read', false);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as InboxItem[];
}

export async function getInboxItem(
  supabase: Client,
  userId: string,
  itemId: string
): Promise<InboxItem | null> {
  const { data, error } = await supabase
    .from('inbox_items')
    .select('*')
    .eq('user_id', userId)
    .eq('id', itemId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as InboxItem | null) ?? null;
}

export async function upsertInboxItem(
  supabase: Client,
  item: {
    user_id: string;
    provider: IntegrationProvider;
    external_id: string;
    thread_id?: string;
    from_email: string;
    from_name?: string;
    subject?: string;
    ai_summary?: string;
    urgency_score?: number;
    needs_reply?: boolean;
    sentiment?: MessageSentiment;
    received_at: string;
  }
): Promise<InboxItem> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('inbox_items')
    .upsert(item, { onConflict: 'user_id,provider,external_id' })
    .select()
    .single();

  if (error) throw error;
  return data as InboxItem;
}

/**
 * Remove all inbox items for a user+provider so a fresh sync replaces stale data.
 * Called before re-ingesting to ensure promotional/filtered items don't linger.
 */
export async function clearInboxItems(
  supabase: Client,
  userId: string,
  provider: IntegrationProvider
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('inbox_items')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider);

  if (error) throw error;
}

/**
 * Returns a map of external_id -> ai_summary for all existing rows for this user+provider.
 * Used by the ingestion agents to skip re-processing already-summarised messages.
 */
export async function getExistingInboxSummaries(
  supabase: Client,
  userId: string,
  provider: IntegrationProvider
): Promise<Map<string, string | null>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('inbox_items')
    .select('external_id, ai_summary')
    .eq('user_id', userId)
    .eq('provider', provider);

  if (error) throw error;
  const map = new Map<string, string | null>();
  for (const row of (data ?? [])) {
    map.set(row.external_id as string, (row.ai_summary as string | null) ?? null);
  }
  return map;
}

/**
 * Deletes all inbox_items for this user+provider whose external_id is NOT in keepIds.
 * This trims messages that have left the inbox since the last scan.
 */
export async function deleteInboxItemsNotIn(
  supabase: Client,
  userId: string,
  provider: IntegrationProvider,
  keepIds: string[]
): Promise<void> {
  if (keepIds.length === 0) {
    return clearInboxItems(supabase, userId, provider);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('inbox_items')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider)
    .not('external_id', 'in', `(${keepIds.join(',')})`);

  if (error) throw error;
}

export async function updateInboxItem(
  supabase: Client,
  userId: string,
  itemId: string,
  fields: Partial<Pick<InboxItem, 'is_read' | 'is_starred' | 'is_archived' | 'snoozed_until' | 'actioned_at'>>
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('inbox_items')
    .update(fields)
    .eq('user_id', userId)
    .eq('id', itemId);

  if (error) throw error;
}
