import { NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { createServiceClient } from '@/lib/db/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'general', 'praise']),
  message: z.string().min(1).max(5000),
  page: z.string().max(500).optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient() as SupabaseAny;

    const { error } = await supabase
      .from('user_feedback')
      .insert({
        user_id: req.user.id,
        type: parsed.data.type,
        message: parsed.data.message,
        page: parsed.data.page ?? null,
        rating: parsed.data.rating ?? null,
        metadata: {},
      });

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Thank you for your feedback!' });
  } catch (err) {
    console.error('Feedback submission error:', err);
    return NextResponse.json(
      { error: 'Failed to submit feedback', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});

// GET: list user's own feedback
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const supabase = createServiceClient() as SupabaseAny;

  const { data, error } = await supabase
    .from('user_feedback')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch feedback', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }

  return NextResponse.json({ feedback: data });
});
