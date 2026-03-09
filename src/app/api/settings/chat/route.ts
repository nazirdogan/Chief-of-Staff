import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { createServiceClient } from '@/lib/db/client';

const MAX_CUSTOM_INSTRUCTIONS_LENGTH = 2000;

// GET: Fetch custom instructions
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('custom_instructions')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    return NextResponse.json({ custom_instructions: data?.custom_instructions ?? null });
  } catch (err) {
    console.error('Failed to fetch chat settings:', err);
    return NextResponse.json(
      { error: 'Failed to fetch chat settings', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
});

// PATCH: Update custom instructions
export const PATCH = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const { custom_instructions } = body as { custom_instructions?: string | null };

    if (custom_instructions !== null && custom_instructions !== undefined) {
      if (typeof custom_instructions !== 'string') {
        return NextResponse.json(
          { error: 'custom_instructions must be a string or null', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }

      if (custom_instructions.length > MAX_CUSTOM_INSTRUCTIONS_LENGTH) {
        return NextResponse.json(
          {
            error: `Custom instructions must be ${MAX_CUSTOM_INSTRUCTIONS_LENGTH} characters or fewer`,
            code: 'VALIDATION_ERROR',
          },
          { status: 400 }
        );
      }
    }

    const value = custom_instructions?.trim() || null;

    const supabase = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('profiles')
      .update({ custom_instructions: value, updated_at: new Date().toISOString() })
      .eq('id', req.user.id)
      .select('custom_instructions')
      .single();

    if (error) throw error;

    return NextResponse.json({ custom_instructions: data?.custom_instructions ?? null });
  } catch (err) {
    console.error('Failed to update chat settings:', err);
    return NextResponse.json(
      { error: 'Failed to update chat settings', code: 'UPDATE_FAILED' },
      { status: 500 }
    );
  }
});
