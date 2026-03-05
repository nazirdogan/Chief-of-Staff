import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Contact, ContactInteraction } from '../types';

type Client = SupabaseClient<Database>;

export async function listContacts(
  supabase: Client,
  userId: string,
  options?: {
    vipOnly?: boolean;
    coldOnly?: boolean;
    limit?: number;
    orderBy?: 'relationship_score' | 'last_interaction_at' | 'name';
  }
): Promise<Contact[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('contacts')
    .select('*')
    .eq('user_id', userId);

  if (options?.vipOnly) {
    query = query.eq('is_vip', true);
  }
  if (options?.coldOnly) {
    query = query.eq('is_cold', true);
  }

  const orderCol = options?.orderBy ?? 'last_interaction_at';
  query = query.order(orderCol, { ascending: false, nullsFirst: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Contact[];
}

export async function getContact(
  supabase: Client,
  userId: string,
  contactId: string
): Promise<Contact | null> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', userId)
    .eq('id', contactId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as Contact | null) ?? null;
}

export async function getContactByEmail(
  supabase: Client,
  userId: string,
  email: string
): Promise<Contact | null> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', userId)
    .eq('email', email.toLowerCase())
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as Contact | null) ?? null;
}

export async function upsertContact(
  supabase: Client,
  contact: {
    user_id: string;
    email: string;
    name?: string | null;
    organisation?: string | null;
    is_vip?: boolean;
    relationship_score?: number;
    first_interaction_at?: string;
    last_interaction_at?: string;
    last_interaction_channel?: string;
    interaction_count_30d?: number;
    is_cold?: boolean;
    cold_flagged_at?: string | null;
  }
): Promise<Contact> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('contacts')
    .upsert(
      {
        ...contact,
        email: contact.email.toLowerCase(),
        open_commitments_count: 0,
      },
      { onConflict: 'user_id,email' }
    )
    .select()
    .single();

  if (error) throw error;
  return data as Contact;
}

export async function updateContact(
  supabase: Client,
  userId: string,
  contactId: string,
  fields: Partial<Pick<
    Contact,
    'name' | 'organisation' | 'is_vip' | 'relationship_score' | 'last_interaction_at' |
    'last_interaction_channel' | 'interaction_count_30d' | 'is_cold' | 'cold_flagged_at' |
    'context_notes' | 'context_notes_updated_at' | 'user_notes'
  >>
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('contacts')
    .update(fields)
    .eq('user_id', userId)
    .eq('id', contactId);

  if (error) throw error;
}

export async function getAllContactsForScoring(
  supabase: Client,
  userId: string
): Promise<Contact[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('contacts')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? []) as Contact[];
}

export async function getContactInteractions(
  supabase: Client,
  userId: string,
  contactId: string,
  limit = 20
): Promise<ContactInteraction[]> {
  const { data, error } = await supabase
    .from('contact_interactions')
    .select('*')
    .eq('user_id', userId)
    .eq('contact_id', contactId)
    .order('interacted_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as ContactInteraction[];
}

export async function insertContactInteraction(
  supabase: Client,
  interaction: {
    user_id: string;
    contact_id: string;
    direction: 'inbound' | 'outbound';
    channel: string;
    message_ref: Record<string, unknown>;
    subject?: string;
    interacted_at: string;
  }
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('contact_interactions')
    .insert(interaction);

  if (error) throw error;
}
