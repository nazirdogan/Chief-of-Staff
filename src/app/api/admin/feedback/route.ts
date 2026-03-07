import { NextResponse } from 'next/server';
import { withAdmin, type AdminRequest } from '@/lib/middleware/withAdmin';
import { createServiceClient } from '@/lib/db/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export const GET = withAdmin(async (req: AdminRequest) => {
  const { searchParams } = new URL(req.url);
  const resolved = searchParams.get('resolved') === 'true';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0');

  const supabase = createServiceClient() as SupabaseAny;

  const { data, count, error } = await supabase
    .from('user_feedback')
    .select('*, profiles!user_feedback_user_id_fkey(email, full_name)', { count: 'exact' })
    .eq('resolved', resolved)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch feedback', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }

  return NextResponse.json({ feedback: data, total: count });
});

// PATCH: mark feedback as resolved
export const PATCH = withAdmin(async (req: AdminRequest) => {
  try {
    const { id, resolved } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Feedback ID is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient() as SupabaseAny;

    const { error } = await supabase
      .from('user_feedback')
      .update({ resolved: resolved ?? true })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update feedback', code: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});
