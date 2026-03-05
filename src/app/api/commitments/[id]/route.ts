import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { getCommitment, updateCommitment } from '@/lib/db/queries/commitments';
import type { CommitmentStatus } from '@/lib/db/types';

const VALID_ACTIONS = ['resolve', 'snooze', 'dismiss', 'confirm', 'reject'] as const;
type CommitmentAction = (typeof VALID_ACTIONS)[number];

export const PATCH = withAuth(async (req: AuthenticatedRequest) => {
  try {
  const url = new URL(req.url);
  const segments = url.pathname.split('/');
  const commitmentId = segments[segments.indexOf('commitments') + 1];

  if (!commitmentId) {
    return NextResponse.json(
      { error: 'Missing commitment ID', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { action, snoozed_until } = body as {
    action: CommitmentAction;
    snoozed_until?: string;
  };

  if (!action || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`, code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const existing = await getCommitment(supabase, req.user.id, commitmentId);

  if (!existing) {
    return NextResponse.json(
      { error: 'Commitment not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  const now = new Date().toISOString();

  switch (action) {
    case 'resolve':
      await updateCommitment(supabase, req.user.id, commitmentId, {
        status: 'resolved' as CommitmentStatus,
        resolved_at: now,
      });
      break;

    case 'snooze':
      if (!snoozed_until) {
        return NextResponse.json(
          { error: 'snoozed_until is required for snooze action', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      await updateCommitment(supabase, req.user.id, commitmentId, {
        status: 'snoozed' as CommitmentStatus,
        snoozed_until,
      });
      break;

    case 'dismiss':
      // Writes feedback signal: user_confirmed = false
      await updateCommitment(supabase, req.user.id, commitmentId, {
        status: 'dismissed' as CommitmentStatus,
        user_confirmed: false,
      });
      break;

    case 'confirm':
      // User confirms this is a real commitment
      await updateCommitment(supabase, req.user.id, commitmentId, {
        user_confirmed: true,
      });
      break;

    case 'reject':
      // User rejects — not a real commitment (feedback signal)
      await updateCommitment(supabase, req.user.id, commitmentId, {
        status: 'dismissed' as CommitmentStatus,
        user_confirmed: false,
      });
      break;
  }

  return NextResponse.json({ success: true, action, commitmentId });
  } catch (error) {
    return handleApiError(error);
  }
});
