import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { createServiceClient } from '@/lib/db/client';
import type { IntegrationProvider } from '@/lib/db/types';

// GET: List inbox items with optional filters
export const GET = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();
    const url = new URL(req.url);

    const filter = url.searchParams.get('filter');

    // Special path: Donna-archived items (Tier 1 auto-archived)
    if (filter === 'archived_by_donna') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;

      // Get audit log entries for Tier 1 archive_email actions
      const { data: auditRows, error: auditError } = await db
        .from('audit_log')
        .select('action_id, outcome, created_at')
        .eq('user_id', req.user.id)
        .eq('action_type', 'archive_email')
        .eq('tier', 1)
        .order('created_at', { ascending: false })
        .limit(100);

      if (auditError) throw auditError;

      if (!auditRows || auditRows.length === 0) {
        return NextResponse.json({ items: [], count: 0 });
      }

      // Get archived inbox items
      const { data: archivedItems, error: itemsError } = await db
        .from('inbox_items')
        .select('*')
        .eq('user_id', req.user.id)
        .eq('is_archived', true)
        .order('received_at', { ascending: false })
        .limit(100);

      if (itemsError) throw itemsError;

      // Build a map of audit data keyed by action_id
      const auditMap = new Map<string, { outcome: string; archived_at: string }>();
      for (const row of auditRows) {
        auditMap.set(row.action_id, {
          outcome: row.outcome,
          archived_at: row.created_at,
        });
      }

      // Match items — try matching by item ID in audit action_id,
      // then fall back to matching all archived items
      const enrichedItems = (archivedItems ?? []).map((item: Record<string, unknown>) => {
        const audit = auditMap.get(item.id as string);
        return {
          ...item,
          archived_at: audit?.archived_at ?? item.updated_at,
          archive_reason: audit?.outcome ?? null,
        };
      });

      return NextResponse.json({
        items: enrichedItems,
        count: enrichedItems.length,
      });
    }

    // Standard inbox query path
    const provider = url.searchParams.get('provider') as IntegrationProvider | null;
    const unreadOnly = url.searchParams.get('unread') === 'true';
    const needsReply = url.searchParams.get('needs_reply') === 'true';
    const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    let query = db
      .from('inbox_items')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_archived', false)
      .order('received_at', { ascending: false })
      .limit(Math.min(limit, 100));

    if (provider) {
      query = query.eq('provider', provider);
    }
    if (unreadOnly) {
      query = query.eq('is_read', false);
    }
    if (needsReply) {
      query = query.eq('needs_reply', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    const items = (data ?? []) as Array<Record<string, unknown>>;

    // Enrich items with account_label from user_integrations
    const integrationIds = [...new Set(
      items.map((i) => i.integration_id).filter(Boolean) as string[]
    )];

    const labelMap = new Map<string, string>();
    if (integrationIds.length > 0) {
      const { data: integrationRows } = await db
        .from('user_integrations')
        .select('id, connection_alias, account_email')
        .eq('user_id', req.user.id)
        .in('id', integrationIds);

      for (const row of (integrationRows ?? []) as Array<{ id: string; connection_alias: string | null; account_email: string | null }>) {
        labelMap.set(row.id, row.connection_alias ?? row.account_email ?? '');
      }
    }

    const enrichedItems = items.map((item) => ({
      ...item,
      account_label: item.integration_id ? (labelMap.get(item.integration_id as string) ?? null) : null,
    }));

    return NextResponse.json({
      items: enrichedItems,
      count: enrichedItems.length,
    });
  } catch (err) {
    console.error('Failed to fetch inbox:', err);
    return NextResponse.json(
      { error: 'Failed to fetch inbox', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
}));
