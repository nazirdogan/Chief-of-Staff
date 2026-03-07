import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { getWorkingPatterns } from '@/lib/db/queries/context';

export const GET = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();
    const patterns = await getWorkingPatterns(supabase, req.user.id);

    if (!patterns) {
      return NextResponse.json(
        { error: 'No working patterns available yet', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(patterns);
  } catch (error) {
    return handleApiError(error);
  }
}));
