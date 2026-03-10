import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { getRoutine, createRoutineOutput } from '@/lib/db/queries/routines';
import { generateRoutineOutput } from '@/lib/ai/agents/routine-generator';

interface ActivitySessionRow {
  app_name: string;
  duration_seconds: number | null;
  summary: string | null;
}

// POST: Immediately trigger generation of a routine's output.
// Rate-limited to 5 per minute to prevent abuse of AI generation.
export const POST = withAuth(withRateLimit(5, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const routineId = segments[segments.indexOf('routines') + 1];

    if (!routineId) {
      return NextResponse.json(
        { error: 'Missing routine ID', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const routine = await getRoutine(supabase, req.user.id, routineId);
    if (!routine) {
      return NextResponse.json(
        { error: 'Routine not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Pull today's narrative context from the desktop observer pipeline
    const today = new Date().toISOString().split('T')[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: narrativeRow } = await (supabase as any)
      .from('day_narratives')
      .select('narrative_text')
      .eq('user_id', req.user.id)
      .eq('narrative_date', today)
      .single();

    // Pull recent activity sessions (last 24h) from the desktop observer
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sessions } = await (supabase as any)
      .from('activity_sessions')
      .select('app_name, duration_seconds, summary')
      .eq('user_id', req.user.id)
      .gte('started_at', since)
      .order('started_at', { ascending: false })
      .limit(20);

    const result = await generateRoutineOutput(routine, {
      todayDate: today,
      todayNarrative: (narrativeRow as { narrative_text?: string } | null)?.narrative_text ?? null,
      recentSessions: ((sessions ?? []) as ActivitySessionRow[]).map(s => ({
        app: s.app_name,
        duration_minutes: Math.round((s.duration_seconds ?? 0) / 60),
        summary: s.summary ?? undefined,
      })),
    });

    const output = await createRoutineOutput(
      supabase,
      req.user.id,
      routineId,
      result.content,
      { generation_model: result.model, generation_ms: result.durationMs }
    );

    return NextResponse.json({ output });
  } catch (error) {
    return handleApiError(error);
  }
}));
