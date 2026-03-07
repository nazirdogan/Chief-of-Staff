import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, TimeBlock, TimeBlockStatus } from '../types';

type Client = SupabaseClient<Database>;

export async function createTimeBlocks(
  supabase: Client,
  blocks: Array<Omit<TimeBlock, 'id' | 'created_at'>>
): Promise<TimeBlock[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('time_blocks')
    .insert(blocks)
    .select();

  if (error) throw error;
  return (data ?? []) as TimeBlock[];
}

export async function listTimeBlocks(
  supabase: Client,
  userId: string,
  options?: { date?: string; status?: TimeBlockStatus }
): Promise<TimeBlock[]> {
  let query = supabase
    .from('time_blocks')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: true });

  if (options?.date) {
    const startOfDay = `${options.date}T00:00:00.000Z`;
    const endOfDay = `${options.date}T23:59:59.999Z`;
    query = query.gte('start_time', startOfDay).lte('start_time', endOfDay);
  }
  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TimeBlock[];
}

export async function updateTimeBlockStatus(
  supabase: Client,
  blockId: string,
  status: TimeBlockStatus,
  googleCalendarEventId?: string
): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (googleCalendarEventId) {
    update.google_calendar_event_id = googleCalendarEventId;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('time_blocks')
    .update(update)
    .eq('id', blockId);

  if (error) throw error;
}

export async function confirmTimeBlocks(
  supabase: Client,
  blockIds: string[]
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('time_blocks')
    .update({ status: 'confirmed' })
    .in('id', blockIds);

  if (error) throw error;
}

export async function deleteProposedTimeBlocks(
  supabase: Client,
  userId: string,
  operationRunId?: string
): Promise<void> {
  let query = (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .from('time_blocks')
    .delete()
    .eq('user_id', userId)
    .eq('status', 'proposed');

  if (operationRunId) {
    query = query.eq('operation_run_id', operationRunId);
  }

  const { error } = await query;
  if (error) throw error;
}
