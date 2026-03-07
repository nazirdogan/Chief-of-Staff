import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { syncAllIntegrations } from '@/lib/integrations/sync';

/**
 * POST /api/integrations/sync-data
 *
 * Runs the full data ingestion pipeline for all connected integrations.
 * Pulls emails, calendar events, documents, tasks, etc. into the database
 * so they're available for briefing generation.
 *
 * Rate limited to 3 per hour — each sync can take 30-60 seconds.
 */
export const POST = withAuth(withRateLimit(3, '1 h', async (req: AuthenticatedRequest) => {
  try {
    const results = await syncAllIntegrations(req.user.id);

    const succeeded = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'error');
    const totalItems = succeeded.reduce((sum, r) => sum + (r.itemsProcessed ?? 0), 0);

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        succeeded: succeeded.length,
        failed: failed.length,
        totalItemsSynced: totalItems,
      },
    });
  } catch (err) {
    console.error('Data sync failed:', err);
    return NextResponse.json(
      { error: 'Data sync failed', code: 'SYNC_FAILED' },
      { status: 500 }
    );
  }
}));
