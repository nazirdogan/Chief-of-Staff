import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/client';
import { withAuth } from '@/lib/middleware/withAuth';
import type { AuthenticatedRequest } from '@/lib/middleware/withAuth';

/**
 * PATCH /api/actions/[id]
 * Update a pending action's payload (e.g., edit email draft before confirming).
 * Only works for actions in 'awaiting_confirmation' status.
 */
export const PATCH = withAuth(async (
  req: AuthenticatedRequest,
) => {
  const url = new URL(req.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.indexOf('actions') + 1];

  const userId = req.user.id;
  const body = await req.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any;

  // Verify the action exists and belongs to this user
  const { data: action, error: fetchError } = await db
    .from('pending_actions')
    .select('id, status, payload')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !action) {
    return NextResponse.json(
      { error: 'Action not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  if (action.status !== 'awaiting_confirmation') {
    return NextResponse.json(
      { error: 'Action cannot be edited in its current state', code: 'INVALID_STATE' },
      { status: 400 }
    );
  }

  // Merge payload updates
  const updatedPayload = { ...action.payload, ...body.payload };

  const { data: updated, error: updateError } = await db
    .from('pending_actions')
    .update({ payload: updatedPayload })
    .eq('id', id)
    .select('id, payload, expires_at')
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to update action', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: updated });
});
