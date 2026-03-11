import { NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { executeConfirmedAction } from '@/lib/actions/executor';

const confirmSchema = z.object({
  pending_action_id: z.string().uuid('pending_action_id must be a valid UUID'),
});

export const POST = withAuth(withRateLimit(20, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const parsed = confirmSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: z.prettifyError(parsed.error), code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { pending_action_id } = parsed.data;

    const supabase = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // Verify the action exists and belongs to this user
    const { data: action, error: fetchError } = await db
      .from('pending_actions')
      .select('id, status, expires_at')
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

    if (new Date(action.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Action has expired', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Mark as confirmed
    const now = new Date().toISOString();
    await db
      .from('pending_actions')
      .update({ status: 'confirmed', confirmed_at: now })
      .eq('id', pending_action_id);

    // Execute the action
    const result = await executeConfirmedAction(pending_action_id, req.user.id);

    return NextResponse.json({
      data: {
        id: pending_action_id,
        status: 'executed',
        executed_at: now,
        result_summary: result.result_summary,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}));
