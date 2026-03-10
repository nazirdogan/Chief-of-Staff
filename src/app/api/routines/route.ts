import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { listRoutines, createRoutine } from '@/lib/db/queries/routines';
import type { RoutineType, RoutineFrequency } from '@/lib/db/types';

// GET: List all routines for the authenticated user
export const GET = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();
    const routines = await listRoutines(supabase, req.user.id);
    return NextResponse.json({ routines });
  } catch (error) {
    return handleApiError(error);
  }
}));

// POST: Create a new routine
export const POST = withAuth(withRateLimit(10, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json() as {
      name?: string;
      description?: string | null;
      routine_type?: string;
      frequency?: string;
      scheduled_time?: string;
      scheduled_day?: number | null;
      is_enabled?: boolean;
      instructions?: string;
    };

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'name is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const routine = await createRoutine(supabase, req.user.id, {
      name: body.name.trim(),
      description: body.description ?? null,
      routine_type: (body.routine_type ?? 'custom') as RoutineType,
      frequency: (body.frequency ?? 'daily') as RoutineFrequency,
      scheduled_time: body.scheduled_time ?? '08:00',
      scheduled_day: body.scheduled_day ?? null,
      is_enabled: body.is_enabled ?? true,
      instructions: body.instructions ?? '',
    });
    return NextResponse.json({ routine }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}));
