import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { listUserConnections } from '@/lib/integrations/nango';
import { createServiceClient } from '@/lib/db/client';
import { upsertIntegration, listUserIntegrations } from '@/lib/db/queries/integrations';
import type { IntegrationProvider } from '@/lib/db/types';

// Maps Nango provider keys to our integration_provider enum values
const NANGO_TO_DB_PROVIDER: Record<string, IntegrationProvider> = {
  'google-mail': 'gmail',
  'google-calendar': 'google_calendar',
  slack: 'slack',
  notion: 'notion',
};

/**
 * POST /api/integrations/sync
 *
 * Checks Nango for the user's active connections and syncs them to the DB.
 * Called by the frontend after an OAuth flow completes to detect new connections.
 */
export const POST = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user.id;
    const supabase = createServiceClient();

    // Get all connections from Nango for this user
    const nangoConnections = await listUserConnections(userId);

    // Upsert each connection into the DB
    let newConnections = 0;
    for (const conn of nangoConnections) {
      const dbProvider = NANGO_TO_DB_PROVIDER[conn.provider_config_key];
      if (!dbProvider) continue;

      await upsertIntegration(supabase, userId, dbProvider, {
        status: 'connected',
        nango_connection_id: conn.connection_id,
      });
      newConnections++;
    }

    // Return the updated list
    const integrations = await listUserIntegrations(supabase, userId);

    return NextResponse.json({
      synced: newConnections,
      integrations,
    });
  } catch (error) {
    return handleApiError(error);
  }
}));
