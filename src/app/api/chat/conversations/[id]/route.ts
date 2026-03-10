import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { getConversation, deleteConversation, updateConversation } from '@/lib/db/queries/chat';

export const GET = withAuth(withRateLimit(60, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const conversationId = segments[segments.indexOf('conversations') + 1];

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Missing conversation ID', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const conversation = await getConversation(supabase, conversationId, req.user.id);

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    return handleApiError(error);
  }
}));

export const PATCH = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const conversationId = segments[segments.indexOf('conversations') + 1];

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Missing conversation ID', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const body = await req.json() as { title?: string; is_favorite?: boolean };
    const updates: { title?: string; is_favorite?: boolean } = {};
    if (typeof body.title === 'string') updates.title = body.title.trim().slice(0, 200);
    if (typeof body.is_favorite === 'boolean') updates.is_favorite = body.is_favorite;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    await updateConversation(supabase, conversationId, req.user.id, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}));

export const DELETE = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const conversationId = segments[segments.indexOf('conversations') + 1];

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Missing conversation ID', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify ownership before deleting
    const existing = await getConversation(supabase, conversationId, req.user.id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Conversation not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    await deleteConversation(supabase, conversationId, req.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}));
