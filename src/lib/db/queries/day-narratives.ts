import type { SupabaseClient } from '@supabase/supabase-js';
import type { DayNarrative } from '@/lib/context/types';

export async function upsertDayNarrative(
  supabase: SupabaseClient,
  params: {
    userId: string;
    narrativeDate: string;
    narrative: string;
    sessionCount: number;
    emailSessions: number;
    chatSessions: number;
    codeSessions: number;
    meetingSessions: number;
    browsingSessions: number;
    totalActiveSeconds: number;
    keyEvents: Array<{ event: string; time: string; importance: string }>;
    peopleSeen: string[];
    projectsWorkedOn: string[];
    embedding?: number[];
    structuredSummary?: Record<string, string[]>;
  }
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('day_narratives')
    .upsert(
      {
        user_id: params.userId,
        narrative_date: params.narrativeDate,
        narrative: params.narrative,
        session_count: params.sessionCount,
        email_sessions: params.emailSessions,
        chat_sessions: params.chatSessions,
        code_sessions: params.codeSessions,
        meeting_sessions: params.meetingSessions,
        browsing_sessions: params.browsingSessions,
        total_active_seconds: params.totalActiveSeconds,
        key_events: params.keyEvents,
        people_seen: params.peopleSeen,
        projects_worked_on: params.projectsWorkedOn,
        embedding: params.embedding ?? null,
        structured_summary: params.structuredSummary ?? null,
        last_updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,narrative_date' }
    );

  if (error) {
    console.error('[day-narratives] Failed to upsert:', error.message);
  }
}

export async function getDayNarrative(
  supabase: SupabaseClient,
  userId: string,
  date: string
): Promise<DayNarrative | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('day_narratives')
    .select('*')
    .eq('user_id', userId)
    .eq('narrative_date', date)
    .single();

  return data ?? null;
}

export async function getRecentDayNarratives(
  supabase: SupabaseClient,
  userId: string,
  days = 7
): Promise<DayNarrative[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('day_narratives')
    .select('*')
    .eq('user_id', userId)
    .gte('narrative_date', since.toISOString().split('T')[0])
    .order('narrative_date', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
