import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { getTodaysBriefing } from '@/lib/db/queries/briefings';

export const GET = withRateLimit(30, '1 m', withAuth(async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();
    const url = new URL(req.url);
    const date = url.searchParams.get('date') ?? undefined;

    const briefing = await getTodaysBriefing(supabase, req.user.id, date);

    if (!briefing) {
      return NextResponse.json({ briefing: null }, { status: 200 });
    }

    return NextResponse.json({ briefing });
  } catch (error) {
    return handleApiError(error);
  }
}));
