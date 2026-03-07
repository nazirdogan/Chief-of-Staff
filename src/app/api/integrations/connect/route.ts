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
  'google-drive': ['https://www.googleapis.com/auth/drive.readonly'],
  microsoft: ['Mail.Read', 'Calendars.Read', 'Files.Read.All', 'offline_access'],
  'microsoft-teams': ['Chat.Read', 'ChannelMessage.Read.All', 'offline_access'],
  slack: ['channels:history', 'im:history', 'users:read', 'users:read.email'],
  notion: ['read_content'],
  github: ['repo', 'read:user', 'notifications'],
  linkedin: ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
  twitter: ['tweet.read', 'users.read', 'dm.read', 'offline.access'],
  dropbox: ['files.metadata.read', 'files.content.read'],
  hubspot: ['crm.objects.contacts.read', 'crm.objects.deals.read'],
  salesforce: ['api', 'refresh_token'],
};

// Maps Nango provider keys to our integration_provider enum values
const NANGO_TO_DB_PROVIDER: Record<string, IntegrationProvider> = {
  'google-mail': 'gmail',
  'google-calendar': 'google_calendar',
  'google-drive': 'google_drive',
  microsoft: 'outlook',
  'microsoft-teams': 'microsoft_teams',
  slack: 'slack',
  notion: 'notion',
  icloud: 'apple_icloud_mail',
  calendly: 'calendly',
  linkedin: 'linkedin',
  twitter: 'twitter',
  dropbox: 'dropbox',
  asana: 'asana',
  monday: 'monday',
  jira: 'jira',
  linear: 'linear',
  clickup: 'clickup',
  trello: 'trello',
  hubspot: 'hubspot',
  salesforce: 'salesforce',
  pipedrive: 'pipedrive',
  github: 'github',
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
