import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { getIntegration } from '@/lib/db/queries/integrations';
import { getConnectionDetails } from '@/lib/integrations/nango';
import type { IntegrationProvider } from '@/lib/db/types';

const VALID_PROVIDERS: IntegrationProvider[] = [
  'gmail',
  'google_calendar',
  'outlook',
  'slack',
  'notion',
];

const DB_TO_NANGO_PROVIDER: Record<string, string> = {
  gmail: 'google-mail',
  google_calendar: 'google-calendar',
  outlook: 'microsoft',
  slack: 'slack',
  notion: 'notion',
};

export const GET = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const providerIdx = segments.indexOf('integrations') + 1;
    const provider = segments[providerIdx] as IntegrationProvider;

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const integration = await getIntegration(supabase, req.user.id, provider);

    if (!integration) {
      return NextResponse.json({
        provider,
        status: 'disconnected',
        nango_healthy: false,
      });
    }

    // Check Nango connection health
    const nangoProvider = DB_TO_NANGO_PROVIDER[provider];
    const nangoConnection = await getConnectionDetails(req.user.id, nangoProvider);

    return NextResponse.json({
      provider,
      status: integration.status,
      account_email: integration.account_email,
      last_synced_at: integration.last_synced_at,
      error_message: integration.error_message,
      nango_healthy: nangoConnection !== null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}));
