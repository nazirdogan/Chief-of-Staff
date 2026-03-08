import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { listReflections } from '@/lib/db/queries/reflections';
import type { ReflectionType } from '@/lib/db/types';

export const GET = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();
    const url = new URL(req.url);
    const type = url.searchParams.get('type') as ReflectionType | null;
    const limit = parseInt(url.searchParams.get('limit') ?? '10', 10);

    const reflections = await listReflections(supabase, req.user.id, {
      type: type ?? undefined,
      limit: Math.min(limit, 50),
    });

    return NextResponse.json({ reflections });
  } catch (error) {
    return handleApiError(error);
  }
}));
