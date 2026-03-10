import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { listRoutineOutputs } from '@/lib/db/queries/routines';

// GET: List historical outputs for a specific routine
export const GET = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
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

    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    if (isNaN(limit) || limit < 1) {
      return NextResponse.json(
        { error: 'Invalid limit parameter', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const outputs = await listRoutineOutputs(supabase, req.user.id, {
      routineId,
      limit: Math.min(limit, 50),
    });
    return NextResponse.json({ outputs });
  } catch (error) {
    return handleApiError(error);
  }
}));
