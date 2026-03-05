import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Commitment, CommitmentStatus, CommitmentConfidence } from '../types';

type Client = SupabaseClient<Database>;

export async function listCommitments(
  supabase: Client,
  userId: string,
  options?: {
    status?: CommitmentStatus;
    confidence?: CommitmentConfidence;
    limit?: number;
  }
): Promise<Commitment[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('commitments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.confidence) {
    query = query.eq('confidence', options.confidence);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Commitment[];
}

export async function getCommitment(
  supabase: Client,
  userId: string,
  commitmentId: string
): Promise<Commitment | null> {
  const { data, error } = await supabase
    .from('commitments')
    .select('*')
    .eq('user_id', userId)
    .eq('id', commitmentId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as Commitment | null) ?? null;
}

export async function insertCommitment(
  supabase: Client,
  commitment: {
    user_id: string;
    recipient_email: string;
    recipient_name?: string;
    commitment_text: string;
    source_quote: string;
    source_ref: Record<string, unknown>;
    confidence: CommitmentConfidence;
    confidence_score: number;
    implied_deadline?: string;
    explicit_deadline?: boolean;
  }
): Promise<Commitment> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('commitments')
    .insert({
      ...commitment,
      status: 'open',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Commitment;
}

export async function updateCommitment(
  supabase: Client,
  userId: string,
  commitmentId: string,
  fields: Partial<Pick<
    Commitment,
    'status' | 'resolved_at' | 'resolved_via_ref' | 'snoozed_until' | 'delegated_to' | 'user_confirmed'
  >>
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('commitments')
    .update(fields)
    .eq('user_id', userId)
    .eq('id', commitmentId);

  if (error) throw error;
}
