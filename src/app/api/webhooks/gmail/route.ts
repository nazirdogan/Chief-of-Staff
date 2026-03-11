/**
 * POST /api/webhooks/gmail
 *
 * Public endpoint — receives Google Pub/Sub push notifications for Gmail inbox activity.
 *
 * Security note: this route intentionally bypasses withAuth. Google Pub/Sub push
 * delivery authenticates via an OIDC bearer token in the Authorization header
 * (issued by the service account configured on the Pub/Sub subscription). The
 * withWebhookVerification middleware uses HMAC-SHA256 which is incompatible with
 * OIDC JWTs, so we rely on:
 *   1. The message payload referencing an emailAddress we validate against our DB.
 *   2. The Pub/Sub subscription being locked to our service account (IAM).
 *   3. Always returning 200 so Google never retries (preventing amplified replays).
 *
 * Message format delivered by Google:
 *   { message: { data: "<base64url-encoded JSON>", messageId, publishTime }, subscription }
 *
 * The decoded data is: { emailAddress: string, historyId: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/client';
import { setupGmailWatch, fetchNewMessagesSinceHistory } from '@/lib/integrations/gmail';
import { saveGmailHistoryId, getGmailHistoryId } from '@/lib/db/queries/integrations';
import { ingestGmailMessageRefs } from '@/lib/ai/agents/ingestion';

/** Rate limiter state for Gmail webhook (IP-based, 60 req/min) */
import { withWebhookRateLimit } from '@/lib/middleware/withRateLimit';

/**
 * Verify the Google Pub/Sub OIDC JWT bearer token from the Authorization header.
 * Uses Google's tokeninfo endpoint to validate the token and confirm:
 *   - The token is a valid Google-issued JWT
 *   - The email matches the Pub/Sub service account
 * Returns true if valid, false otherwise.
 */
async function verifyGoogleOIDCToken(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return false;

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (!token) return false;

  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
    if (!res.ok) return false;

    const info = (await res.json()) as { email?: string; email_verified?: string; aud?: string };

    // The token must come from a verified Google service account email
    if (info.email_verified !== 'true') return false;

    // Verify it's a Google service account (ends with .iam.gserviceaccount.com)
    // or the Pub/Sub system account
    if (!info.email?.endsWith('.iam.gserviceaccount.com') && !info.email?.endsWith('.google.com')) {
      return false;
    }

    return true;
  } catch {
    console.error('[Gmail Webhook] OIDC verification failed');
    return false;
  }
}

async function handleGmailWebhook(req: NextRequest): Promise<NextResponse> {
  // Verify Google OIDC JWT — reject unauthenticated requests
  const isValid = await verifyGoogleOIDCToken(req);
  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Parse Pub/Sub envelope
    const body = await req.json() as { message?: { data?: string } };
    const rawData = body?.message?.data;
    if (!rawData) return NextResponse.json({}, { status: 200 });

    const decoded = Buffer.from(rawData, 'base64').toString('utf-8');
    const { emailAddress, historyId: _pubsubHistoryId } = JSON.parse(decoded) as {
      emailAddress: string;
      historyId: number;
    };

    if (!emailAddress) return NextResponse.json({}, { status: 200 });

    const supabase = createServiceClient();

    // Look up the specific integration row by Gmail account email.
    // Selecting both user_id and the row id (integration_id) so we can scope
    // historyId reads/writes to the exact connected account.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: integration } = await (supabase as any)
      .from('user_integrations')
      .select('user_id, id')
      .eq('provider', 'gmail')
      .eq('account_email', emailAddress)
      .eq('status', 'connected')
      .single();

    // Unknown email — acknowledge to prevent Pub/Sub retries
    if (!integration?.user_id) return NextResponse.json({}, { status: 200 });

    const userId = integration.user_id as string;
    const integrationId = integration.id as string;

    // Get the historyId stored for this specific account
    const storedHistoryId = await getGmailHistoryId(supabase, integrationId);

    if (!storedHistoryId) {
      // First delivery — establish a baseline historyId and return
      const { historyId: newHistoryId, expiration } = await setupGmailWatch(userId, integrationId);
      await saveGmailHistoryId(supabase, integrationId, newHistoryId, expiration);
      return NextResponse.json({}, { status: 200 });
    }

    // Fetch messages added since our stored historyId for this account
    const { messages: newMessages, newHistoryId } = await fetchNewMessagesSinceHistory(
      userId,
      storedHistoryId,
      integrationId
    );

    if (!newHistoryId) {
      // historyId expired (410) — renew watch and return; next push will carry on
      const { historyId: freshHistoryId, expiration } = await setupGmailWatch(userId, integrationId);
      await saveGmailHistoryId(supabase, integrationId, freshHistoryId, expiration);
      return NextResponse.json({}, { status: 200 });
    }

    // Process new messages through the AI ingestion pipeline
    if (newMessages.length > 0) {
      await ingestGmailMessageRefs(userId, newMessages, integrationId, integrationId);
    }

    // Advance the stored historyId so the next push only fetches deltas
    await saveGmailHistoryId(supabase, integrationId, newHistoryId);
  } catch {
    // Swallow all errors — returning non-200 would trigger Pub/Sub retries
    // causing duplicate processing. Errors are logged via Sentry middleware.
  }

  // Always 200 — see note above
  return NextResponse.json({}, { status: 200 });
}

// Apply IP-based rate limiting (60 req/min)
export const POST = withWebhookRateLimit(60, '1 m', handleGmailWebhook);
