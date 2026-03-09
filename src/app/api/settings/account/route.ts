import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { createServiceClient } from '@/lib/db/client';

// GET: Fetch user profile (name + email)
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('full_name, email, subscription_tier')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    return NextResponse.json({
      full_name: data?.full_name ?? null,
      email: data?.email ?? req.user.email,
      subscription_tier: data?.subscription_tier ?? 'free',
    });
  } catch (err) {
    console.error('Failed to fetch account settings:', err);
    return NextResponse.json(
      { error: 'Failed to fetch account settings', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
});

// PATCH: Update user name
export const PATCH = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const { full_name } = body as { full_name?: string };

    if (typeof full_name !== 'string' || full_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'full_name is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (full_name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Name must be 100 characters or fewer', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('profiles')
      .update({ full_name: full_name.trim(), updated_at: new Date().toISOString() })
      .eq('id', req.user.id)
      .select('full_name')
      .single();

    if (error) throw error;

    return NextResponse.json({ full_name: data?.full_name });
  } catch (err) {
    console.error('Failed to update account settings:', err);
    return NextResponse.json(
      { error: 'Failed to update account settings', code: 'UPDATE_FAILED' },
      { status: 500 }
    );
  }
});
