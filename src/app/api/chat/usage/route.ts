import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/client';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { handleApiError } from '@/lib/api-utils';
import { checkMessageLimit } from '@/lib/db/queries/message-usage';

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();
    // Pass req.user.tier so checkMessageLimit skips a redundant profiles query
    const usage = await checkMessageLimit(supabase, req.user.id, req.user.tier);
    return NextResponse.json({ data: usage });
  } catch (error) {
    return handleApiError(error);
  }
});
