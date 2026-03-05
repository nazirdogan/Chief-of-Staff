import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import type { UserSession } from '@/lib/db/types';

export const GET = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
  const supabase = createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('user_sessions')
    .select('*')
    .eq('user_id', req.user.id)
    .is('revoked_at', null)
    .order('last_active_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch sessions', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: (data ?? []) as UserSession[] });
  } catch (error) {
    return handleApiError(error);
  }
}));

export const DELETE = withAuth(withRateLimit(10, '1 m', async (req: AuthenticatedRequest) => {
  try {
  const body = await req.json();
  const { session_id } = body as { session_id: string };

  if (!session_id) {
    return NextResponse.json(
      { error: 'session_id is required', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('user_sessions')
    .update({ revoked_at: now })
    .eq('user_id', req.user.id)
    .eq('id', session_id)
    .is('revoked_at', null);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to revoke session', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { revoked_at: now } });
  } catch (error) {
    return handleApiError(error);
  }
}));
