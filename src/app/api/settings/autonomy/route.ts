import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { createServiceClient } from '@/lib/db/client';
import type { PendingActionType } from '@/lib/db/types';

const VALID_ACTION_TYPES: PendingActionType[] = [
  'send_email',
  'send_message',
  'create_task',
  'reschedule_meeting',
  'create_calendar_event',
  'update_notion_page',
  'archive_email',
];

// GET: Fetch user's autonomy settings for all action types
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('user_autonomy_settings')
      .select('*')
      .eq('user_id', req.user.id);

    if (error) throw error;

    return NextResponse.json({ settings: data ?? [] });
  } catch (err) {
    console.error('Failed to fetch autonomy settings:', err);
    return NextResponse.json(
      { error: 'Failed to fetch settings', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
});

// PATCH: Upsert a single action type's autonomy settings
export const PATCH = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const { action_type, tier_1_enabled, tier_2_enabled } = body;

    if (!action_type || !VALID_ACTION_TYPES.includes(action_type)) {
      return NextResponse.json(
        { error: 'Invalid action_type', code: 'INVALID_ACTION_TYPE' },
        { status: 400 }
      );
    }

    // send_email can NEVER have tier_1_enabled — hardcoded safety constraint
    if (action_type === 'send_email' && tier_1_enabled === true) {
      return NextResponse.json(
        { error: 'send_email cannot be auto-executed', code: 'FORBIDDEN_ACTION' },
        { status: 403 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (typeof tier_1_enabled === 'boolean') updates.tier_1_enabled = tier_1_enabled;
    if (typeof tier_2_enabled === 'boolean') updates.tier_2_enabled = tier_2_enabled;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update', code: 'NO_FIELDS' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('user_autonomy_settings')
      .upsert(
        {
          user_id: req.user.id,
          action_type,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,action_type' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ setting: data });
  } catch (err) {
    console.error('Failed to update autonomy settings:', err);
    return NextResponse.json(
      { error: 'Failed to update settings', code: 'UPDATE_FAILED' },
      { status: 500 }
    );
  }
});
