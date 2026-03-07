import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { createServiceClient } from '@/lib/db/client';

// GET: Fetch user's operations config
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('user_operations_config')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // No config yet — return defaults
      return NextResponse.json({
        config: {
          user_id: req.user.id,
          overnight_enabled: true,
          overnight_run_time: '05:30',
          home_tasks_after: '19:00',
          exercise_days: [1, 3, 5],
          exercise_duration_minutes: 60,
          default_buffer_minutes: 10,
          deep_work_preferred_time: 'morning',
          errand_batch_enabled: true,
          home_address: null,
          office_address: null,
        },
      });
    }

    if (error) throw error;

    return NextResponse.json({ config: data });
  } catch (err) {
    console.error('Failed to fetch operations config:', err);
    return NextResponse.json(
      { error: 'Failed to fetch config', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
});

// PATCH: Update user's operations config
export const PATCH = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const supabase = createServiceClient();

    // Only allow specific fields to be updated
    const allowedFields = [
      'overnight_enabled', 'overnight_run_time', 'home_tasks_after',
      'exercise_days', 'exercise_duration_minutes', 'default_buffer_minutes',
      'deep_work_preferred_time', 'errand_batch_enabled',
      'home_address', 'office_address',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update', code: 'NO_FIELDS' },
        { status: 400 }
      );
    }

    // Upsert — create if doesn't exist, update if it does
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('user_operations_config')
      .upsert(
        { user_id: req.user.id, ...updates },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ config: data });
  } catch (err) {
    console.error('Failed to update operations config:', err);
    return NextResponse.json(
      { error: 'Failed to update config', code: 'UPDATE_FAILED' },
      { status: 500 }
    );
  }
});
