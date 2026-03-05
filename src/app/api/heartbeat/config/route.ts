import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import type { HeartbeatConfig } from '@/lib/db/types';

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
  const supabase = createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('heartbeat_config')
    .select('*')
    .eq('user_id', req.user.id)
    .single();

  if (error && error.code === 'PGRST116') {
    // No config yet — create default
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: created, error: createError } = await (supabase as any)
      .from('heartbeat_config')
      .insert({ user_id: req.user.id })
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        { error: 'Failed to create heartbeat config', code: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: created as HeartbeatConfig });
  }

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch heartbeat config', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: data as HeartbeatConfig });
  } catch (error) {
    return handleApiError(error);
  }
});

const ALLOWED_FIELDS = [
  'scan_frequency',
  'vip_alerts_enabled',
  'commitment_check_enabled',
  'relationship_check_enabled',
  'document_index_enabled',
  'quiet_hours_start',
  'quiet_hours_end',
  'alert_channel',
] as const;

export const PATCH = withAuth(async (req: AuthenticatedRequest) => {
  try {
  const body = await req.json();

  // Only allow known fields
  const updates: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('heartbeat_config')
    .update(updates)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error && error.code === 'PGRST116') {
    // No config exists yet — insert with updates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: created, error: createError } = await (supabase as any)
      .from('heartbeat_config')
      .insert({ user_id: req.user.id, ...updates })
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        { error: 'Failed to create heartbeat config', code: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: created as HeartbeatConfig });
  }

  if (error) {
    return NextResponse.json(
      { error: 'Failed to update heartbeat config', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: data as HeartbeatConfig });
  } catch (error) {
    return handleApiError(error);
  }
});
