import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, UserRoutine, RoutineOutput } from '@/lib/db/types';

type Client = SupabaseClient<Database>;

export async function listRoutines(db: Client, userId: string): Promise<UserRoutine[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('user_routines')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getRoutine(db: Client, userId: string, routineId: string): Promise<UserRoutine | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('user_routines')
    .select('*')
    .eq('id', routineId)
    .eq('user_id', userId)
    .single();
  if (error) return null;
  return data;
}

export async function createRoutine(
  db: Client,
  userId: string,
  input: Omit<UserRoutine, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'last_run_at'>
): Promise<UserRoutine> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('user_routines')
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRoutine(
  db: Client,
  userId: string,
  routineId: string,
  updates: Partial<Omit<UserRoutine, 'id' | 'user_id' | 'created_at'>>
): Promise<UserRoutine> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('user_routines')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', routineId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRoutine(db: Client, userId: string, routineId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('user_routines')
    .delete()
    .eq('id', routineId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function listRoutineOutputs(
  db: Client,
  userId: string,
  options?: { routineId?: string; limit?: number }
): Promise<RoutineOutput[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
    .from('routine_outputs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 20);
  if (options?.routineId) {
    query = query.eq('routine_id', options.routineId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createRoutineOutput(
  db: Client,
  userId: string,
  routineId: string,
  content: string,
  meta?: { generation_model?: string; generation_ms?: number }
): Promise<RoutineOutput> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('routine_outputs')
    .insert({
      user_id: userId,
      routine_id: routineId,
      content,
      generation_model: meta?.generation_model ?? null,
      generation_ms: meta?.generation_ms ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  // Update last_run_at on the routine
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .from('user_routines')
    .update({ last_run_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', routineId)
    .eq('user_id', userId);
  return data;
}
