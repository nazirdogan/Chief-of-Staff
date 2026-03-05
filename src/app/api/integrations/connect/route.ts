import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { getConnectUrl } from '@/lib/integrations/nango';
import type { IntegrationProvider } from '@/lib/db/types';

const PROVIDER_SCOPES: Record<string, string[]> = {
  'google-mail': ['https://www.googleapis.com/auth/gmail.readonly'],
  'google-calendar': [
    'https://www.googleapis.com/auth/calendar.readonly',
  ],
  microsoft: ['Mail.Read', 'Calendars.Read', 'offline_access'],
  slack: [
    'channels:history',
    'im:history',
    'users:read',
    'users:read.email',
  ],
  notion: ['read_content'],
};

// Maps Nango provider keys to our integration_provider enum values
const NANGO_TO_DB_PROVIDER: Record<string, IntegrationProvider> = {
  'google-mail': 'gmail',
  'google-calendar': 'google_calendar',
  microsoft: 'outlook',
  slack: 'slack',
  notion: 'notion',
};

export const POST = withAuth(withRateLimit(10, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const { provider } = body as { provider: string };

    if (!provider || !PROVIDER_SCOPES[provider]) {
      return NextResponse.json(
        { error: 'Invalid provider', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const connectUrl = await getConnectUrl(req.user.id, provider);

    return NextResponse.json({
      url: connectUrl,
      provider,
      dbProvider: NANGO_TO_DB_PROVIDER[provider],
    });
  } catch (error) {
    return handleApiError(error);
  }
}));
