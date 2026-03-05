import { NextRequest, NextResponse } from 'next/server';
import { verifyNangoWebhook } from '@/lib/middleware/withWebhookVerification';
import { createServiceClient } from '@/lib/db/client';
import { upsertIntegration, updateIntegrationStatus } from '@/lib/db/queries/integrations';
import type { IntegrationProvider } from '@/lib/db/types';

// Maps Nango provider keys to our integration_provider enum values
const NANGO_TO_DB_PROVIDER: Record<string, IntegrationProvider> = {
  'google-mail': 'gmail',
  'google-calendar': 'google_calendar',
  microsoft: 'outlook',
  slack: 'slack',
  notion: 'notion',
};

// Public route — Nango webhook handler for connection events
export async function POST(req: NextRequest) {
  const body = await req.text();

  if (!verifyNangoWebhook(req, body)) {
    return NextResponse.json(
      { error: 'Invalid signature', code: 'WEBHOOK_UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const payload = JSON.parse(body);
  const { type, connectionId, providerConfigKey } = payload as {
    type: string;
    connectionId: string;
    providerConfigKey: string;
  };

  // connectionId format: "{userId}-{provider}"
  const dashIndex = connectionId.indexOf('-');
  if (dashIndex === -1) {
    return NextResponse.json({ error: 'Invalid connection ID format' }, { status: 400 });
  }

  const userId = connectionId.slice(0, dashIndex);
  const dbProvider = NANGO_TO_DB_PROVIDER[providerConfigKey];

  if (!dbProvider) {
    // Unknown provider — acknowledge but don't process
    return NextResponse.json({ received: true });
  }

  const supabase = createServiceClient();

  switch (type) {
    case 'auth': {
      // New connection established
      await upsertIntegration(supabase, userId, dbProvider, {
        status: 'connected',
        nango_connection_id: connectionId,
      });
      break;
    }

    case 'token_refresh': {
      // Token refreshed — update last_synced_at
      await upsertIntegration(supabase, userId, dbProvider, {
        status: 'connected',
        nango_connection_id: connectionId,
      });
      break;
    }

    case 'token_refresh_error': {
      // Refresh failed — mark as error
      await updateIntegrationStatus(
        supabase,
        userId,
        dbProvider,
        'error',
        'Token refresh failed. Please reconnect.'
      );
      break;
    }

    default:
      // Unknown event type — acknowledge
      break;
  }

  return NextResponse.json({ received: true });
}
