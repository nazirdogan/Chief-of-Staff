import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { deleteConnection } from '@/lib/integrations/nango';
import { createServiceClient } from '@/lib/db/client';
import { deleteIntegration } from '@/lib/db/queries/integrations';
import type { IntegrationProvider } from '@/lib/db/types';

const VALID_PROVIDERS: IntegrationProvider[] = [
  'gmail',
  'google_calendar',
  'outlook',
  'slack',
  'notion',
];

// Maps our DB provider to Nango provider key
const DB_TO_NANGO_PROVIDER: Record<string, string> = {
  gmail: 'google-mail',
  google_calendar: 'google-calendar',
  outlook: 'microsoft',
  slack: 'slack',
  notion: 'notion',
};

export const DELETE = withAuth(withRateLimit(10, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const { provider } = body as { provider: IntegrationProvider };

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const nangoProvider = DB_TO_NANGO_PROVIDER[provider];

    // Delete from Nango first
    try {
      await deleteConnection(req.user.id, nangoProvider);
    } catch {
      // Connection may not exist in Nango — continue to clean up our DB
    }

    // Delete from our database
    const supabase = createServiceClient();
    await deleteIntegration(supabase, req.user.id, provider);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}));
