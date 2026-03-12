import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Task, TaskStatus, TaskConfidence } from '../types';

type Client = SupabaseClient<Database>;

export async function listTasks(
  supabase: Client,
  userId: string,
  options?: {
    status?: TaskStatus;
    confidence?: TaskConfidence;
    limit?: number;
  }
): Promise<Task[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('tasks')
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
  return (data ?? []) as Task[];
}

export async function getTask(
  supabase: Client,
  userId: string,
  taskId: string
): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('id', taskId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as Task | null) ?? null;
}

export async function insertTask(
  supabase: Client,
  task: {
    user_id: string;
    recipient_email: string;
    recipient_name?: string;
    task_text: string;
    source_quote: string;
    source_ref: Record<string, unknown>;
    confidence: TaskConfidence;
    confidence_score: number;
    implied_deadline?: string;
    explicit_deadline?: boolean;
    direction?: 'outbound' | 'inbound';
  }
): Promise<Task> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('tasks')
    .insert({
      ...task,
      status: 'open',
      direction: task.direction ?? 'outbound',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

export async function updateTask(
  supabase: Client,
  userId: string,
  taskId: string,
  fields: Partial<Pick<
    Task,
    'status' | 'resolved_at' | 'resolved_via_ref' | 'snoozed_until' | 'delegated_to' | 'user_confirmed'
  >>
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('tasks')
    .update(fields)
    .eq('user_id', userId)
    .eq('id', taskId);

  if (error) throw error;
}
