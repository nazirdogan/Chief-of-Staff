import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { createServiceClient } from '@/lib/db/client';

// POST: Change password (verify current, then update)
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const { current_password, new_password } = body as {
      current_password?: string;
      new_password?: string;
    };

    if (!current_password || typeof current_password !== 'string') {
      return NextResponse.json(
        { error: 'Current password is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!new_password || typeof new_password !== 'string') {
      return NextResponse.json(
        { error: 'New password is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (new_password.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Verify current password by attempting sign-in
    const verifyClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: signInError } = await verifyClient.auth.signInWithPassword({
      email: req.user.email,
      password: current_password,
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Current password is incorrect', code: 'WRONG_PASSWORD' },
        { status: 400 }
      );
    }

    // Update password using service client (admin privileges)
    const supabase = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any).auth.admin.updateUserById(
      req.user.id,
      { password: new_password }
    );

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to change password:', err);
    return NextResponse.json(
      { error: 'Failed to change password', code: 'UPDATE_FAILED' },
      { status: 500 }
    );
  }
});
