import { NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { withAdmin, type AdminRequest } from '@/lib/middleware/withAdmin';
import { createServiceClient } from '@/lib/db/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

// GET: list waitlist entries
export const GET = withAdmin(async (req: AdminRequest) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'pending';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0');

  const supabase = createServiceClient() as SupabaseAny;

  let query = supabase
    .from('waitlist')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch waitlist', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }

  return NextResponse.json({ entries: data, total: count });
});

const approveSchema = z.object({
  id: z.uuid(),
  action: z.enum(['approve', 'reject']),
  notes: z.string().max(1000).optional(),
});

// PATCH: approve or reject a waitlist entry
export const PATCH = withAdmin(async (req: AdminRequest) => {
  try {
    const body = await req.json();
    const parsed = approveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient() as SupabaseAny;

    const updateData: Record<string, unknown> = {
      status: parsed.data.action === 'approve' ? 'approved' : 'rejected',
    };

    if (parsed.data.action === 'approve') {
      updateData.approved_at = new Date().toISOString();
      updateData.approved_by = req.user.id;
    }

    if (parsed.data.notes) {
      updateData.notes = parsed.data.notes;
    }

    const { data: entry, error } = await supabase
      .from('waitlist')
      .update(updateData)
      .eq('id', parsed.data.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update waitlist entry', code: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    // If approved, send welcome email via Supabase Auth invite
    if (parsed.data.action === 'approve' && entry?.email) {
      try {
        const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
          entry.email,
          { data: { from_waitlist: true, full_name: entry.full_name } }
        );
        if (inviteError) {
          console.error('Failed to send invite email:', inviteError);
        }
      } catch (emailErr) {
        console.error('Email invite error:', emailErr);
      }
    }

    return NextResponse.json({ entry });
  } catch (err) {
    console.error('Waitlist update error:', err);
    return NextResponse.json(
      { error: 'Failed to update entry', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});
