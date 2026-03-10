import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, UserIntegration, IntegrationProvider, IntegrationStatus } from '../types';

type Client = SupabaseClient<Database>;

export async function listUserIntegrations(
  supabase: Client,
  userId: string
): Promise<UserIntegration[]> {
  const { data, error } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .order('connected_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as UserIntegration[];
}

/**
 * Returns all connected rows for a provider.
 * Use this instead of getIntegration when iterating multi-account providers.
 */
export async function getIntegrationsByProvider(
  supabase: Client,
  userId: string,
  provider: IntegrationProvider
): Promise<UserIntegration[]> {
  const { data, error } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('status', 'connected')
    .order('connected_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as UserIntegration[];
}

/**
 * Returns the first connected row for a provider.
 * Suitable for single-account providers (Slack, Notion).
 * For multi-account providers prefer getIntegrationsByProvider.
 */
export async function getIntegration(
  supabase: Client,
  userId: string,
  provider: IntegrationProvider
): Promise<UserIntegration | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .order('connected_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as UserIntegration | null) ?? null;
}

/**
 * Returns a specific integration row by its UUID.
 * Used by the disconnect route to look up nango_connection_id before deletion.
 */
export async function getIntegrationById(
  supabase: Client,
  userId: string,
  integrationId: string
): Promise<UserIntegration | null> {
  const { data, error } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('id', integrationId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as UserIntegration | null) ?? null;
}

export async function upsertIntegration(
  supabase: Client,
  userId: string,
  provider: IntegrationProvider,
  fields: {
    status: IntegrationStatus;
    nango_connection_id: string;
    account_email?: string;
    account_name?: string;
    granted_scopes?: string[];
    connection_alias?: string;
  }
): Promise<UserIntegration> {
  const row = {
    user_id: userId,
    provider,
    ...fields,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('user_integrations')
    .upsert(row, { onConflict: 'user_id,nango_connection_id' })
    .select()
    .single();

  if (error) throw error;
  return data as UserIntegration;
}

export async function updateIntegrationStatus(
  supabase: Client,
  userId: string,
  provider: IntegrationProvider,
  status: IntegrationStatus,
  errorMessage?: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('user_integrations')
    .update({
      status,
      error_message: errorMessage ?? null,
    })
    .eq('user_id', userId)
    .eq('provider', provider);

  if (error) throw error;
}

/**
 * Delete a specific integration row by its UUID.
 * The caller is responsible for deleting the corresponding Nango connection first.
 */
export async function deleteIntegration(
  supabase: Client,
  userId: string,
  integrationId: string
): Promise<void> {
  const { error } = await supabase
    .from('user_integrations')
    .delete()
    .eq('user_id', userId)
    .eq('id', integrationId);

  if (error) throw error;
}

/**
 * Update the user-facing alias for a specific integration row.
 */
export async function updateIntegrationAlias(
  supabase: Client,
  userId: string,
  integrationId: string,
  alias: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('user_integrations')
    .update({ connection_alias: alias })
    .eq('user_id', userId)
    .eq('id', integrationId);

  if (error) throw error;
}

/**
 * Persist the Gmail historyId (and optionally the watch expiry) in the gmail
 * integration row's metadata JSONB column, scoped to a specific integration row.
 */
export async function saveGmailHistoryId(
  supabase: Client,
  integrationId: string,
  historyId: string,
  watchExpiresAt?: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('user_integrations')
    .select('metadata')
    .eq('id', integrationId)
    .single();

  const existing = (data?.metadata as Record<string, unknown> | null) ?? {};
  const updated: Record<string, unknown> = {
    ...existing,
    gmail_history_id: historyId,
    ...(watchExpiresAt ? { watch_expires_at: watchExpiresAt } : {}),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('user_integrations')
    .update({ metadata: updated })
    .eq('id', integrationId);

  if (error) throw error;
}

/**
 * Read the stored Gmail historyId for a specific integration row, or null if not yet set.
 */
export async function getGmailHistoryId(
  supabase: Client,
  integrationId: string
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('user_integrations')
    .select('metadata')
    .eq('id', integrationId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data?.metadata as { gmail_history_id?: string } | null)?.gmail_history_id ?? null;
}
