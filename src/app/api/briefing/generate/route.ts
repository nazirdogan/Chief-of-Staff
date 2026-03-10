import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { generateDailyBriefing } from '@/lib/ai/agents/briefing';
import { syncAllIntegrations } from '@/lib/integrations/sync';
import { createServiceClient } from '@/lib/db/client';
import { listUserIntegrations } from '@/lib/db/queries/integrations';

// POST: Trigger briefing generation for the current user
// Syncs connected integrations (if any), then generates briefing from all sources
// including desktop observer data, commitments, and relationship intelligence.
export const POST = withAuth(withRateLimit(3, '1 h', async (req: AuthenticatedRequest) => {
  try {
    console.log('[BRIEFING_GENERATE] Starting for user:', req.user.id);
    const supabase = createServiceClient();

    // Check connected integrations (optional — briefing can generate without them)
    console.log('[BRIEFING_GENERATE] Fetching integrations...');
    const integrations = await listUserIntegrations(supabase, req.user.id);
    const connected = integrations.filter(i => i.status === 'connected');
    console.log('[BRIEFING_GENERATE] Connected integrations:', connected.map(i => i.provider));

    // Step 1: Sync data from connected integrations (if any)
    let syncSucceeded: Array<{ provider: string; itemsProcessed?: number }> = [];
    let totalSynced = 0;

    if (connected.length > 0) {
      console.log('[BRIEFING_GENERATE] Starting sync...');
      const syncResults = await syncAllIntegrations(req.user.id);
      console.log('[BRIEFING_GENERATE] Sync complete:', JSON.stringify(syncResults.map(r => ({ provider: r.provider, status: r.status, error: r.error }))));
      syncSucceeded = syncResults.filter(r => r.status === 'success');
      totalSynced = syncSucceeded.reduce((sum, r) => sum + (r.itemsProcessed ?? 0), 0);

      // Log sync failures but don't block — desktop observer + existing data can still produce a briefing
      const syncFailed = syncResults.filter(r => r.status === 'error');
      if (syncFailed.length > 0) {
        console.warn('[BRIEFING_GENERATE] Some syncs failed:', syncFailed.map(r => `${r.provider}: ${r.error}`).join('; '));
      }
    } else {
      console.log('[BRIEFING_GENERATE] No integrations connected — generating from desktop observer + existing data');
    }

    // Step 2: Generate the briefing (reads from DB, desktop observer, live calendar, etc.)
    console.log('[BRIEFING_GENERATE] Starting briefing generation...');
    const briefing = await generateDailyBriefing(req.user.id);
    console.log('[BRIEFING_GENERATE] Briefing generated, items:', briefing.item_count);

    // Always return success — even an empty briefing is valid.
    // The UI will show the structured sections with CTAs for missing data sources.
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
        connectedProviders: connected.map(i => i.provider),
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
