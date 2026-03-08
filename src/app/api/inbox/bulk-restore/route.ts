import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { createServiceClient } from '@/lib/db/client';
import { updateInboxItem } from '@/lib/db/queries/inbox';

const SINCE_MAP: Record<string, string> = {
  '7d': '7 days',
  '30d': '30 days',
};

const MAX_RESTORE = 500;

// POST: Bulk restore Donna-archived emails
export const POST = withAuth(withRateLimit(5, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const { since } = body as { since?: string };

    if (!since || (!SINCE_MAP[since] && since !== 'all')) {
      return NextResponse.json(
        { error: 'Invalid since value. Use 7d, 30d, or all', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // Find inbox item IDs from audit_log for Tier 1 archive_email actions
    let query = db
      .from('audit_log')
      .select('action_id')
      .eq('user_id', req.user.id)
      .eq('action_type', 'archive_email')
      .eq('tier', 1)
      .limit(MAX_RESTORE);

    if (since !== 'all') {
      const sinceDate = new Date();
      if (since === '7d') sinceDate.setDate(sinceDate.getDate() - 7);
      else if (since === '30d') sinceDate.setDate(sinceDate.getDate() - 30);
      query = query.gte('created_at', sinceDate.toISOString());
    }

    const { data: auditRows, error: auditError } = await query;
    if (auditError) throw auditError;

    if (!auditRows || auditRows.length === 0) {
      return NextResponse.json({ restored: 0 });
    }

    // The action_id in audit_log references the pending_action, not the inbox item directly.
    // We need to get the inbox item IDs from the pending_actions payloads.
    const actionIds = auditRows.map((r: { action_id: string }) => r.action_id);

    // Get the pending actions to extract inbox item IDs from payload
    const { data: actions, error: actionsError } = await db
      .from('pending_actions')
      .select('payload')
      .in('id', actionIds)
      .eq('action_type', 'archive_email');

    if (actionsError) throw actionsError;

    // Extract inbox_item_id from each payload
    const inboxItemIds: string[] = [];
    for (const action of (actions ?? [])) {
      const payload = action.payload as Record<string, unknown>;
      if (payload.inbox_item_id) {
        inboxItemIds.push(payload.inbox_item_id as string);
      }
    }

    // Also try direct: if audit_log.action_id is the inbox item ID itself
    // (fallback for simpler implementations)
    if (inboxItemIds.length === 0) {
      // Treat action_id as inbox item ID directly
      for (const row of auditRows) {
        inboxItemIds.push(row.action_id);
      }
    }

    // Restore each item
    let restored = 0;
    for (const itemId of inboxItemIds.slice(0, MAX_RESTORE)) {
      try {
        await updateInboxItem(supabase, req.user.id, itemId, {
          is_archived: false,
          actioned_at: null,
        });
        restored++;
      } catch {
        // Skip items that don't exist or don't belong to user
      }
    }

    return NextResponse.json({ restored });
  } catch (err) {
    console.error('Failed to bulk restore:', err);
    return NextResponse.json(
      { error: 'Failed to bulk restore', code: 'BULK_RESTORE_FAILED' },
      { status: 500 }
    );
  }
}));
