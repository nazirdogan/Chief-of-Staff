import { NextRequest, NextResponse } from 'next/server';
import { verifyNangoWebhook } from '@/lib/middleware/withWebhookVerification';
import { createServiceClient } from '@/lib/db/client';
import { upsertIntegration, updateIntegrationStatus } from '@/lib/db/queries/integrations';
import type { IntegrationProvider } from '@/lib/db/types';

// Maps Nango provider keys to our integration_provider enum values
const NANGO_TO_DB_PROVIDER: Record<string, IntegrationProvider> = {
  'google-mail': 'gmail',
  'google-calendar': 'google_calendar',
  slack: 'slack',
  notion: 'notion',
};

/**
 * Extract the user ID from a Nango webhook payload.
 * Nango Connect uses end_user.id; legacy flows use connectionId format "{userId}-{provider}".
 */
function extractUserId(payload: Record<string, unknown>): string | null {
  // Nango Connect: end_user.id is the user ID
  const endUser = payload.endUser as { id?: string } | undefined;
  if (endUser?.id) return endUser.id;

  // Legacy: connectionId format "{userId}-{provider}"
  const connectionId = payload.connectionId as string | undefined;
  if (connectionId) {
    const dashIndex = connectionId.indexOf('-');
    if (dashIndex !== -1) return connectionId.slice(0, dashIndex);
    // If no dash, the connectionId might be the userId itself (Nango Connect)
    return connectionId;
  }

  return null;
}

// Public route — Nango webhook handler for connection events
export async function POST(req: NextRequest) {
  const body = await req.text();

  if (!verifyNangoWebhook(req, body)) {
    return NextResponse.json(
      { error: 'Invalid signature', code: 'WEBHOOK_UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const payload = JSON.parse(body) as Record<string, unknown>;
  const type = payload.type as string;
  const providerConfigKey = payload.providerConfigKey as string;
  const connectionId = payload.connectionId as string;

  const userId = extractUserId(payload);
  if (!userId) {
    return NextResponse.json({ error: 'Could not determine user ID' }, { status: 400 });
  }

  const dbProvider = NANGO_TO_DB_PROVIDER[providerConfigKey];
  if (!dbProvider) {
    // Unknown provider — acknowledge but don't process
    return NextResponse.json({ received: true });
  }

  const supabase = createServiceClient();

  switch (type) {
    case 'auth': {
      await upsertIntegration(supabase, userId, dbProvider, {
        status: 'connected',
        nango_connection_id: connectionId,
      });
      break;
    }

    case 'token_refresh': {
      await upsertIntegration(supabase, userId, dbProvider, {
        status: 'connected',
        nango_connection_id: connectionId,
      });
      break;
    }

    case 'token_refresh_error': {
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
      break;
  }

  return NextResponse.json({ received: true });
}
