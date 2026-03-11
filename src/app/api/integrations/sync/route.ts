import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { listUserIntegrations } from '@/lib/db/queries/integrations';

/**
 * POST /api/integrations/sync
 *
 * Returns the current state of the user's integrations from the DB.
 * Called by the frontend after an OAuth flow completes to detect new connections.
 * Tokens are stored directly in user_integrations — no Nango dependency.
 */
export const POST = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();
    const integrations = await listUserIntegrations(supabase, req.user.id);
    return NextResponse.json({ synced: 0, integrations });
  } catch (error) {
    return handleApiError(error);
  }
}));
