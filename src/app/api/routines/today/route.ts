import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { getTodayInTimezone } from '@/lib/utils/timezone';

// GET: Return all routine_outputs generated today, deduplicated to the most
// recent output per routine, joined with routine metadata.
export const GET = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // Get user timezone for accurate "today" window
    const { data: profile } = await db
      .from('profiles')
      .select('timezone')
      .eq('id', req.user.id)
      .single();
    const tz = (profile?.timezone as string | null) || 'UTC';

    // todayStr is used only for reference; we query by created_at within the
    // last 24h which is the simplest approach that works across all timezones.
    void getTodayInTimezone(tz); // kept for future use / linting

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch today's outputs joined with their parent routine
    const { data: outputs, error } = await db
      .from('routine_outputs')
      .select(`
        id,
        routine_id,
        content,
        generation_model,
        generation_ms,
        created_at,
        user_routines!inner(id, name, routine_type, frequency, scheduled_time, is_enabled)
      `)
      .eq('user_id', req.user.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Deduplicate — keep only the most recent output per routine
    const seen = new Set<string>();
    const deduplicated = (outputs ?? []).filter((o: { routine_id: string }) => {
      if (seen.has(o.routine_id)) return false;
      seen.add(o.routine_id);
      return true;
    });

    return NextResponse.json({ outputs: deduplicated });
  } catch (error) {
    return handleApiError(error);
  }
}));
