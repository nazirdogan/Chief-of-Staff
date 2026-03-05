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

export async function getIntegration(
  supabase: Client,
  userId: string,
  provider: IntegrationProvider
): Promise<UserIntegration | null> {
  const { data, error } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
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
    .upsert(row, { onConflict: 'user_id,provider' })
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

export async function deleteIntegration(
  supabase: Client,
  userId: string,
  provider: IntegrationProvider
): Promise<void> {
  const { error } = await supabase
    .from('user_integrations')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider);

  if (error) throw error;
}
