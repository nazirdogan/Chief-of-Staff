import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { generateDailyBriefing } from '@/lib/ai/agents/briefing';
import { syncAllIntegrations } from '@/lib/integrations/sync';
import { createServiceClient } from '@/lib/db/client';
import { listUserIntegrations } from '@/lib/db/queries/integrations';

// POST: Trigger briefing generation for the current user
// This endpoint first syncs data from all connected integrations, then generates.
export const POST = withAuth(withRateLimit(3, '1 h', async (req: AuthenticatedRequest) => {
  try {
    console.log('[BRIEFING_GENERATE] Starting for user:', req.user.id);
    const supabase = createServiceClient();

    // Check that the user has at least one connected integration
    console.log('[BRIEFING_GENERATE] Fetching integrations...');
    const integrations = await listUserIntegrations(supabase, req.user.id);
    const connected = integrations.filter(i => i.status === 'connected');
    console.log('[BRIEFING_GENERATE] Connected integrations:', connected.map(i => i.provider));

    if (connected.length === 0) {
      return NextResponse.json(
        {
          error: 'No integrations connected. Connect Gmail, Google Calendar, or other tools in Settings first.',
          code: 'NO_INTEGRATIONS',
        },
        { status: 422 }
      );
    }

    // Step 1: Sync data from all connected integrations
    console.log('[BRIEFING_GENERATE] Starting sync...');
    const syncResults = await syncAllIntegrations(req.user.id);
    console.log('[BRIEFING_GENERATE] Sync complete:', JSON.stringify(syncResults.map(r => ({ provider: r.provider, status: r.status, error: r.error }))));
    const syncSucceeded = syncResults.filter(r => r.status === 'success');
    const totalSynced = syncSucceeded.reduce((sum, r) => sum + (r.itemsProcessed ?? 0), 0);

    // If all syncs failed, report the error
    if (syncSucceeded.length === 0 && syncResults.length > 0) {
      const errors = syncResults
        .filter(r => r.status === 'error')
        .map(r => `${r.provider}: ${r.error}`)
        .join('; ');
      return NextResponse.json(
        {
          error: `Failed to sync data from your integrations: ${errors}`,
          code: 'SYNC_FAILED',
        },
        { status: 500 }
      );
    }

    // If we synced but found nothing (e.g. empty inbox, no events)
    if (totalSynced === 0) {
      // Calendar events are read live during briefing generation, so we may still have data.
      // Let generateDailyBriefing try — it reads calendar directly.
    }

    // Step 2: Generate the briefing (reads from DB + live calendar)
    console.log('[BRIEFING_GENERATE] Starting briefing generation...');
    const briefing = await generateDailyBriefing(req.user.id);
    console.log('[BRIEFING_GENERATE] Briefing generated, items:', briefing.item_count);

    if (briefing.item_count === 0) {
      return NextResponse.json(
        {
          error: 'Your integrations synced successfully but no actionable items were found. This can happen if your inbox is empty or you have no upcoming events today.',
          code: 'NO_ITEMS',
          syncSummary: {
            integrationsSynced: syncSucceeded.length,
            totalItems: totalSynced,
          },
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      briefing: {
        id: briefing.id,
        briefing_date: briefing.briefing_date,
        item_count: briefing.item_count,
        generated_at: briefing.generated_at,
      },
      syncSummary: {
        integrationsSynced: syncSucceeded.length,
        totalItems: totalSynced,
      },
    });
  } catch (err) {
    console.error('[BRIEFING_GENERATE] FAILED:', err);
    console.error('[BRIEFING_GENERATE] Stack:', err instanceof Error ? err.stack : 'no stack');
    const message = err instanceof Error ? err.message : 'Briefing generation failed';
    return NextResponse.json(
      { error: message, code: 'GENERATION_FAILED' },
      { status: 500 }
    );
  }
}));
