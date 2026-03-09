import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActivitySession, AppTransition, AppCategory, ContextImportance } from '@/lib/context/types';

// ── Activity Sessions ──────────────────────────────────────────

export async function createActivitySession(
  supabase: SupabaseClient,
  params: {
    userId: string;
    appName: string;
    appCategory: string;
    windowTitle?: string;
    url?: string;
    startedAt: string;
    parsedData?: Record<string, unknown>;
    people?: string[];
    projects?: string[];
  }
): Promise<ActivitySession | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('activity_sessions')
    .insert({
      user_id: params.userId,
      app_name: params.appName,
      app_category: params.appCategory,
      window_title: params.windowTitle ?? null,
      url: params.url ?? null,
      started_at: params.startedAt,
      parsed_data: params.parsedData ?? {},
      people: params.people ?? [],
      projects: params.projects ?? [],
    })
    .select('*')
    .single();

  if (error) {
    console.error('[activity-sessions] Failed to create session:', error.message);
    return null;
  }
  return data;
}

export async function updateActivitySession(
  supabase: SupabaseClient,
  sessionId: string,
  updates: {
    endedAt?: string;
    snapshotCount?: number;
    summary?: string;
    parsedData?: Record<string, unknown>;
    people?: string[];
    projects?: string[];
    topics?: string[];
    actionItems?: Array<{ text: string; source?: string }>;
    importance?: ContextImportance;
    importanceScore?: number;
  }
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.endedAt !== undefined) row.ended_at = updates.endedAt;
  if (updates.snapshotCount !== undefined) row.snapshot_count = updates.snapshotCount;
  if (updates.summary !== undefined) row.summary = updates.summary;
  if (updates.parsedData !== undefined) row.parsed_data = updates.parsedData;
  if (updates.people !== undefined) row.people = updates.people;
  if (updates.projects !== undefined) row.projects = updates.projects;
  if (updates.topics !== undefined) row.topics = updates.topics;
  if (updates.actionItems !== undefined) row.action_items = updates.actionItems;
  if (updates.importance !== undefined) row.importance = updates.importance;
  if (updates.importanceScore !== undefined) row.importance_score = updates.importanceScore;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('activity_sessions')
    .update(row)
    .eq('id', sessionId);

  if (error) {
    console.error('[activity-sessions] Failed to update session:', error.message);
  }
}

export async function getActiveSession(
  supabase: SupabaseClient,
  userId: string
): Promise<ActivitySession | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('activity_sessions')
    .select('*')
    .eq('user_id', userId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  return data ?? null;
}

export async function getSessionsInRange(
  supabase: SupabaseClient,
  userId: string,
  after: string,
  before?: string,
  opts?: { category?: AppCategory; limit?: number }
): Promise<ActivitySession[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('activity_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('started_at', after)
    .order('started_at', { ascending: true });

  if (before) query = query.lte('started_at', before);
  if (opts?.category) query = query.eq('app_category', opts.category);
  query = query.limit(opts?.limit ?? 200);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getSessionsByCategory(
  supabase: SupabaseClient,
  userId: string,
  category: AppCategory,
  limit = 20
): Promise<ActivitySession[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('activity_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('app_category', category)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getTodaySessionStats(
  supabase: SupabaseClient,
  userId: string,
  todayStart: string
): Promise<{
  sessionCount: number;
  emailSessions: number;
  chatSessions: number;
  codeSessions: number;
  meetingSessions: number;
  browsingSessions: number;
  totalActiveSeconds: number;
  people: string[];
  projects: string[];
}> {
  const sessions = await getSessionsInRange(supabase, userId, todayStart);

  const stats = {
    sessionCount: sessions.length,
    emailSessions: 0,
    chatSessions: 0,
    codeSessions: 0,
    meetingSessions: 0,
    browsingSessions: 0,
    totalActiveSeconds: 0,
    people: [] as string[],
    projects: [] as string[],
  };

  const peopleSet = new Set<string>();
  const projectSet = new Set<string>();

  for (const s of sessions) {
    const durationSec = s.ended_at
      ? Math.floor((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000)
      : Math.floor((Date.now() - new Date(s.started_at).getTime()) / 1000);

    stats.totalActiveSeconds += durationSec;

    switch (s.app_category) {
      case 'email': stats.emailSessions++; break;
      case 'chat': stats.chatSessions++; break;
      case 'code': case 'terminal': stats.codeSessions++; break;
      case 'calendar': stats.meetingSessions++; break;
      case 'browser': stats.browsingSessions++; break;
    }

    for (const p of s.people) peopleSet.add(p);
    for (const p of s.projects) projectSet.add(p);
  }

  stats.people = [...peopleSet];
  stats.projects = [...projectSet];

  return stats;
}

// ── App Transitions ──────────────────────────────────────────

export async function logAppTransition(
  supabase: SupabaseClient,
  params: {
    userId: string;
    fromApp: string;
    toApp: string;
    fromCategory: string;
    toCategory: string;
  }
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('app_transitions')
    .insert({
      user_id: params.userId,
      from_app: params.fromApp,
      to_app: params.toApp,
      from_category: params.fromCategory,
      to_category: params.toCategory,
    });

  if (error) {
    console.error('[activity-sessions] Failed to log transition:', error.message);
  }
}

export async function getTransitionsInRange(
  supabase: SupabaseClient,
  userId: string,
  after: string,
  before?: string,
  limit = 100
): Promise<AppTransition[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('app_transitions')
    .select('*')
    .eq('user_id', userId)
    .gte('transitioned_at', after)
    .order('transitioned_at', { ascending: true });

  if (before) query = query.lte('transitioned_at', before);
  query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
