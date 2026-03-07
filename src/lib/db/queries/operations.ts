import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Database,
  OperationRun,
  OperationRunType,
  SubagentRun,
  SubagentType,
} from '../types';

type Client = SupabaseClient<Database>;

// ── Operation Runs ──────────────────────────────────────────

export async function createOperationRun(
  supabase: Client,
  userId: string,
  runType: OperationRunType
): Promise<OperationRun> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('operation_runs')
    .insert({ user_id: userId, run_type: runType, status: 'running' })
    .select()
    .single();

  if (error) throw error;
  return data as OperationRun;
}

export async function completeOperationRun(
  supabase: Client,
  runId: string,
  result: Record<string, unknown>
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('operation_runs')
    .update({ status: 'completed', completed_at: new Date().toISOString(), result })
    .eq('id', runId);

  if (error) throw error;
}

export async function failOperationRun(
  supabase: Client,
  runId: string,
  errorMessage: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('operation_runs')
    .update({ status: 'failed', completed_at: new Date().toISOString(), error: errorMessage })
    .eq('id', runId);

  if (error) throw error;
}

export async function getLatestOperationRun(
  supabase: Client,
  userId: string,
  runType: OperationRunType
): Promise<OperationRun | null> {
  const { data, error } = await supabase
    .from('operation_runs')
    .select('*')
    .eq('user_id', userId)
    .eq('run_type', runType)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as OperationRun | null) ?? null;
}

export async function listOperationRuns(
  supabase: Client,
  userId: string,
  options?: { runType?: OperationRunType; limit?: number }
): Promise<OperationRun[]> {
  let query = supabase
    .from('operation_runs')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });

  if (options?.runType) {
    query = query.eq('run_type', options.runType);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as OperationRun[];
}

// ── Subagent Runs ───────────────────────────────────────────

export async function createSubagentRun(
  supabase: Client,
  params: {
    operation_run_id: string;
    user_id: string;
    agent_type: SubagentType;
    task_ids: string[];
  }
): Promise<SubagentRun> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('subagent_runs')
    .insert({ ...params, status: 'running' })
    .select()
    .single();

  if (error) throw error;
  return data as SubagentRun;
}

export async function completeSubagentRun(
  supabase: Client,
  runId: string,
  result: Record<string, unknown>
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('subagent_runs')
    .update({ status: 'completed', completed_at: new Date().toISOString(), result })
    .eq('id', runId);

  if (error) throw error;
}

export async function failSubagentRun(
  supabase: Client,
  runId: string,
  errorMessage: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('subagent_runs')
    .update({ status: 'failed', completed_at: new Date().toISOString(), error: errorMessage })
    .eq('id', runId);

  if (error) throw error;
}

export async function listSubagentRuns(
  supabase: Client,
  operationRunId: string
): Promise<SubagentRun[]> {
  const { data, error } = await supabase
    .from('subagent_runs')
    .select('*')
    .eq('operation_run_id', operationRunId)
    .order('started_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as SubagentRun[];
}
