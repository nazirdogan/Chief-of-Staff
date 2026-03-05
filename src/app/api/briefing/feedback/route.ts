import { NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { updateBriefingItemFeedback } from '@/lib/db/queries/briefings';

const feedbackSchema = z.object({
  item_id: z.string().uuid(),
  feedback: z.union([z.literal(1), z.literal(-1)]),
});

export const POST = withAuth(withRateLimit(60, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();

    const result = feedbackSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', code: 'VALIDATION_ERROR', details: result.error.message },
        { status: 400 }
      );
    }

    const { item_id, feedback } = result.data;
    const supabase = createServiceClient();

    await updateBriefingItemFeedback(supabase, req.user.id, item_id, feedback);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}));
