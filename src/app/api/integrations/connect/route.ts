import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createConnectSession } from '@/lib/integrations/nango';
import type { IntegrationProvider } from '@/lib/db/types';

// OAuth scopes to request per provider
const PROVIDER_SCOPES: Record<string, string[]> = {
  'google-mail': ['https://www.googleapis.com/auth/gmail.readonly'],
  'google-calendar': ['https://www.googleapis.com/auth/calendar.readonly'],
  slack: ['channels:history', 'im:history', 'users:read', 'users:read.email'],
  notion: ['read_content'],
};

// Maps Nango provider keys to our integration_provider enum values
const NANGO_TO_DB_PROVIDER: Record<string, IntegrationProvider> = {
  'google-mail': 'gmail',
  'google-calendar': 'google_calendar',
  slack: 'slack',
  notion: 'notion',
};

/**
 * POST /api/integrations/connect
 *
 * Creates a Nango connect session for the authenticated user and returns
 * the session token. The frontend SDK uses this token to open a real
 * OAuth popup for the provider.
 */
export const POST = withAuth(withRateLimit(10, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const { provider } = body as { provider: string };

    if (!provider || !NANGO_TO_DB_PROVIDER[provider]) {
      return NextResponse.json(
        { error: 'Invalid provider', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const scopes = PROVIDER_SCOPES[provider];
    const sessionToken = await createConnectSession(req.user.id, provider, scopes);

    // Note: Gmail watch setup (for push notifications) is intentionally NOT done here.
    // The OAuth token exchange happens asynchronously via Nango AFTER this response,
    // so there is no valid access token at this point.
    // Watch setup is handled by the gmail-watch-renew background job (runs every 6 days)
    // and by the Nango webhook handler once the connection is established.

    return NextResponse.json({
      sessionToken,
      connectionId: req.user.id,
      provider,
      dbProvider: NANGO_TO_DB_PROVIDER[provider],
    });
  } catch (error) {
    return handleApiError(error);
  }
}));
