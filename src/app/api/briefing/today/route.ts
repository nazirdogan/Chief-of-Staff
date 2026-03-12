import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { getTodaysBriefing } from '@/lib/db/queries/briefings';
import { getTodayInTimezone } from '@/lib/utils/timezone';

export const GET = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();
    const url = new URL(req.url);
    let date = url.searchParams.get('date') ?? undefined;

    // If no explicit date, resolve "today" in the user's timezone
    if (!date) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('timezone')
        .eq('id', req.user.id)
        .single();
      const tz = profile?.timezone || 'UTC';
      date = getTodayInTimezone(tz);
    }

    // Also fetch briefing schedule so the UI knows whether to show a "schedule" CTA
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('briefing_time, timezone')
      .eq('id', req.user.id)
      .single();

    const briefingTime = (profile?.briefing_time as string | null) ?? null;

    const briefing = await getTodaysBriefing(supabase, req.user.id, date);

    if (!briefing) {
      return NextResponse.json({ briefing: null, briefing_time: briefingTime }, { status: 200 });
    }

    return NextResponse.json({ briefing, briefing_time: briefingTime });
  } catch (error) {
    return handleApiError(error);
  }
}));
