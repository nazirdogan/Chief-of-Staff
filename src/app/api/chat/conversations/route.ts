import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { listConversations, createConversation } from '@/lib/db/queries/chat';

export const GET = withAuth(withRateLimit(60, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();
    const conversations = await listConversations(supabase, req.user.id);
    return NextResponse.json({ conversations });
  } catch (error) {
    return handleApiError(error);
  }
}));

export const POST = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const { title } = body as { title?: string };

    const supabase = createServiceClient();
    const conversation = await createConversation(supabase, req.user.id, title);

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}));
