import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { createServiceClient } from '@/lib/db/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

const waitlistSchema = z.object({
  email: z.email(),
  full_name: z.string().min(1).max(200).optional(),
  company: z.string().max(200).optional(),
  role: z.string().max(200).optional(),
  referral: z.string().max(500).optional(),
});

// Public endpoint — no auth required
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = waitlistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', code: 'VALIDATION_ERROR', details: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const supabase = createServiceClient() as SupabaseAny;

    const { error } = await supabase
      .from('waitlist')
      .insert({
        email: parsed.data.email,
        full_name: parsed.data.full_name ?? null,
        company: parsed.data.company ?? null,
        role: parsed.data.role ?? null,
        referral: parsed.data.referral ?? null,
        status: 'pending',
      });

    if (error) {
      // Unique constraint — email already on waitlist
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This email is already on the waitlist', code: 'DUPLICATE_EMAIL' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true, message: 'You have been added to the waitlist' });
  } catch (err) {
    console.error('Waitlist signup error:', err);
    return NextResponse.json(
      { error: 'Failed to join waitlist', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
