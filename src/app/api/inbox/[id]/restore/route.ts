import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { createServiceClient } from '@/lib/db/client';
import { updateInboxItem } from '@/lib/db/queries/inbox';

// POST: Restore a single Donna-archived email
export const POST = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    // Extract id from URL path: /api/inbox/[id]/restore
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const restoreIdx = segments.indexOf('restore');
    const id = restoreIdx > 0 ? segments[restoreIdx - 1] : null;

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify the inbox item belongs to the current user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: item, error: fetchError } = await (supabase as any)
      .from('inbox_items')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !item) {
      return NextResponse.json(
        { error: 'Inbox item not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    await updateInboxItem(supabase, req.user.id, id, {
      is_archived: false,
      actioned_at: null,
    });

    return NextResponse.json({ restored: true });
  } catch (err) {
    console.error('Failed to restore inbox item:', err);
    return NextResponse.json(
      { error: 'Failed to restore inbox item', code: 'RESTORE_FAILED' },
      { status: 500 }
    );
  }
}));
