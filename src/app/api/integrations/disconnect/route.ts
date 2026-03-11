import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { revokeToken } from '@/lib/integrations/google-oauth';
import { createServiceClient } from '@/lib/db/client';
import { getIntegrationById, deleteIntegration } from '@/lib/db/queries/integrations';

const GOOGLE_PROVIDERS = new Set(['gmail', 'google_calendar']);

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

    const integration = await getIntegrationById(supabase, req.user.id, integrationId);
    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // For Google providers: revoke the access token at Google
    if (GOOGLE_PROVIDERS.has(integration.provider)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = integration as any;
      if (row.access_token) {
        await revokeToken(row.access_token); // silently ignores errors
      }
    }

    await deleteIntegration(supabase, req.user.id, integrationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}));
