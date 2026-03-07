import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, TransitEvent } from '../types';

type Client = SupabaseClient<Database>;

export async function createTransitEvent(
  supabase: Client,
  event: Omit<TransitEvent, 'id' | 'created_at'>
): Promise<TransitEvent> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('transit_events')
    .insert(event)
    .select()
    .single();

  if (error) throw error;
  return data as TransitEvent;
}

export async function getTransitEventByCalendarEvent(
  supabase: Client,
  userId: string,
  calendarEventId: string
): Promise<TransitEvent | null> {
  const { data, error } = await supabase
    .from('transit_events')
    .select('*')
    .eq('user_id', userId)
    .eq('calendar_event_id', calendarEventId)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as TransitEvent | null) ?? null;
}

export async function listTransitEvents(
  supabase: Client,
  userId: string,
  options?: { from?: string; to?: string }
): Promise<TransitEvent[]> {
  let query = supabase
    .from('transit_events')
    .select('*')
    .eq('user_id', userId)
    .order('departure_time', { ascending: true });

  if (options?.from) {
    query = query.gte('departure_time', options.from);
  }
  if (options?.to) {
    query = query.lte('departure_time', options.to);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TransitEvent[];
}

export async function deleteTransitEventsForDate(
  supabase: Client,
  userId: string,
  date: string
): Promise<void> {
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('transit_events')
    .delete()
    .eq('user_id', userId)
    .gte('departure_time', startOfDay)
    .lte('departure_time', endOfDay);

  if (error) throw error;
}
