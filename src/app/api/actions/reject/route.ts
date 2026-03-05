import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const { pending_action_id, reason } = body as {
      pending_action_id: string;
      reason?: string;
    };

    if (!pending_action_id) {
      return NextResponse.json(
        { error: 'pending_action_id is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // Verify the action exists and belongs to this user
    const { data: action, error: fetchError } = await db
      .from('pending_actions')
      .select('id, status')
      .eq('id', pending_action_id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !action) {
      return NextResponse.json(
        { error: 'Pending action not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (action.status !== 'awaiting_confirmation') {
      return NextResponse.json(
        { error: `Action is already ${action.status}`, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    await db
      .from('pending_actions')
      .update({
        status: 'rejected',
        rejected_at: now,
        execution_result: reason ? { rejection_reason: reason } : null,
      })
      .eq('id', pending_action_id);

    return NextResponse.json({
      data: { id: pending_action_id, status: 'rejected' },
    });
  } catch (error) {
    return handleApiError(error);
  }
});
