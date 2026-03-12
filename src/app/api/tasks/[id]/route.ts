import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { getTask, updateTask } from '@/lib/db/queries/tasks';
import type { TaskStatus } from '@/lib/db/types';

const VALID_ACTIONS = ['resolve', 'snooze', 'dismiss', 'confirm', 'reject'] as const;
type TaskAction = (typeof VALID_ACTIONS)[number];

export const PATCH = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
  const url = new URL(req.url);
  const segments = url.pathname.split('/');
  const taskId = segments[segments.indexOf('tasks') + 1];

  if (!taskId) {
    return NextResponse.json(
      { error: 'Missing task ID', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { action, snoozed_until } = body as {
    action: TaskAction;
    snoozed_until?: string;
  };

  if (!action || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`, code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const existing = await getTask(supabase, req.user.id, taskId);

  if (!existing) {
    return NextResponse.json(
      { error: 'Task not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  const now = new Date().toISOString();

  switch (action) {
    case 'resolve':
      await updateTask(supabase, req.user.id, taskId, {
        status: 'resolved' as TaskStatus,
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
      await updateTask(supabase, req.user.id, taskId, {
        status: 'snoozed' as TaskStatus,
        snoozed_until,
      });
      break;

    case 'dismiss':
      // Writes feedback signal: user_confirmed = false
      await updateTask(supabase, req.user.id, taskId, {
        status: 'dismissed' as TaskStatus,
        user_confirmed: false,
      });
      break;

    case 'confirm':
      // User confirms this is a real task
      await updateTask(supabase, req.user.id, taskId, {
        user_confirmed: true,
      });
      break;

    case 'reject':
      // User rejects — not a real task (feedback signal)
      await updateTask(supabase, req.user.id, taskId, {
        status: 'dismissed' as TaskStatus,
        user_confirmed: false,
      });
      break;
  }

  return NextResponse.json({ success: true, action, taskId });
  } catch (error) {
    return handleApiError(error);
  }
}));
