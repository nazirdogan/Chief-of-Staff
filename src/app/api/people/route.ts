import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { listContacts } from '@/lib/db/queries/contacts';

export const GET = withRateLimit(30, '1 m', withAuth(async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();
    const url = new URL(req.url);

    const vipOnly = url.searchParams.get('vip') === 'true';
    const coldOnly = url.searchParams.get('cold') === 'true';
    const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
    const orderBy = url.searchParams.get('order_by') as 'relationship_score' | 'last_interaction_at' | 'name' | null;

    const contacts = await listContacts(supabase, req.user.id, {
      vipOnly,
      coldOnly,
      limit: Math.min(limit, 100),
      orderBy: orderBy ?? undefined,
    });

    return NextResponse.json({ contacts });
  } catch (error) {
    return handleApiError(error);
  }
}));
