import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { getRoutine, updateRoutine, deleteRoutine } from '@/lib/db/queries/routines';

// GET: Fetch a single routine by ID
export const GET = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const routineId = segments[segments.indexOf('routines') + 1];

    if (!routineId) {
      return NextResponse.json(
        { error: 'Missing routine ID', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const routine = await getRoutine(supabase, req.user.id, routineId);
    if (!routine) {
      return NextResponse.json(
        { error: 'Routine not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    return NextResponse.json({ routine });
  } catch (error) {
    return handleApiError(error);
  }
}));

// PATCH: Update an existing routine
export const PATCH = withAuth(withRateLimit(20, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const routineId = segments[segments.indexOf('routines') + 1];

    if (!routineId) {
      return NextResponse.json(
        { error: 'Missing routine ID', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const supabase = createServiceClient();

    // Verify ownership before updating
    const existing = await getRoutine(supabase, req.user.id, routineId);
    if (!existing) {
      return NextResponse.json(
        { error: 'Routine not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const routine = await updateRoutine(supabase, req.user.id, routineId, body);
    return NextResponse.json({ routine });
  } catch (error) {
    return handleApiError(error);
  }
}));

// DELETE: Remove a routine and its outputs (cascade via FK)
export const DELETE = withAuth(withRateLimit(10, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const routineId = segments[segments.indexOf('routines') + 1];

    if (!routineId) {
      return NextResponse.json(
        { error: 'Missing routine ID', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify ownership before deleting
    const existing = await getRoutine(supabase, req.user.id, routineId);
    if (!existing) {
      return NextResponse.json(
        { error: 'Routine not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    await deleteRoutine(supabase, req.user.id, routineId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}));
