import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { deleteConnection } from '@/lib/integrations/nango';
import { createServiceClient } from '@/lib/db/client';
import { getIntegrationById, deleteIntegration } from '@/lib/db/queries/integrations';

// Maps our DB provider enum to Nango provider key
const DB_TO_NANGO_PROVIDER: Record<string, string> = {
  gmail: 'google-mail',
  google_calendar: 'google-calendar',
  slack: 'slack',
  notion: 'notion',
};

export const DELETE = withAuth(withRateLimit(10, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const { integrationId } = body as { integrationId: string };

    if (!integrationId) {
      return NextResponse.json(
        { error: 'integrationId is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Look up the specific integration row to get provider + nango_connection_id
    const integration = await getIntegrationById(supabase, req.user.id, integrationId);
    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const nangoProvider = DB_TO_NANGO_PROVIDER[integration.provider];

    // Delete from Nango first
    if (nangoProvider) {
      try {
        await deleteConnection(nangoProvider, integration.nango_connection_id);
      } catch {
        // Connection may already be gone in Nango — continue to clean up our DB
      }
    }

    // Delete this specific row from our database
    await deleteIntegration(supabase, req.user.id, integrationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}));
