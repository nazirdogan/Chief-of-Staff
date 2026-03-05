import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import type { IntegrationAuditLog, IntegrationProvider } from '@/lib/db/types';

export const GET = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
  const url = new URL(req.url);
  const provider = url.searchParams.get('provider') as IntegrationProvider | null;
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 100);
  const page = Math.max(parseInt(url.searchParams.get('page') ?? '1', 10), 1);
  const offset = (page - 1) * limit;

  const supabase = createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('integration_audit_log')
    .select('*', { count: 'exact' })
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (provider) {
    query = query.eq('provider', provider);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch audit log', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: (data ?? []) as IntegrationAuditLog[],
    meta: { total: count ?? 0, page },
  });
  } catch (error) {
    return handleApiError(error);
  }
}));
