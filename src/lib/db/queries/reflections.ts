import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Reflection, ReflectionType } from '../types';

type Client = SupabaseClient<Database>;

export async function getLatestReflection(
  supabase: Client,
  userId: string,
  type: ReflectionType,
): Promise<Reflection | null> {
  const { data, error } = await supabase
    .from('reflections')
    .select('*')
    .eq('user_id', userId)
    .eq('reflection_type', type)
    .order('period_start', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as Reflection | null) ?? null;
}

export async function listReflections(
  supabase: Client,
  userId: string,
  options?: {
    type?: ReflectionType;
    limit?: number;
  },
): Promise<Reflection[]> {
  let query = supabase
    .from('reflections')
    .select('*')
    .eq('user_id', userId)
    .order('period_start', { ascending: false });

  if (options?.type) {
    query = query.eq('reflection_type', options.type);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Reflection[];
}
