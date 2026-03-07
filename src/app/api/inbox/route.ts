import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { createServiceClient } from '@/lib/db/client';
import type { IntegrationProvider } from '@/lib/db/types';

// GET: List inbox items with optional filters
export const GET = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();
    const url = new URL(req.url);

    const provider = url.searchParams.get('provider') as IntegrationProvider | null;
    const unreadOnly = url.searchParams.get('unread') === 'true';
    const needsReply = url.searchParams.get('needs_reply') === 'true';
    const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);

    let query = supabase
      .from('inbox_items')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_archived', false)
      .order('received_at', { ascending: false })
      .limit(Math.min(limit, 100));

    if (provider) {
      query = query.eq('provider', provider);
    }
    if (unreadOnly) {
      query = query.eq('is_read', false);
    }
    if (needsReply) {
      query = query.eq('needs_reply', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      items: data ?? [],
      count: data?.length ?? 0,
    });
  } catch (err) {
    console.error('Failed to fetch inbox:', err);
    return NextResponse.json(
      { error: 'Failed to fetch inbox', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
}));
