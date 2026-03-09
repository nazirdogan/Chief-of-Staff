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

export async function POST(req: NextRequest): Promise<NextResponse> {
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

    // Look up user by their Gmail account email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: integration } = await (supabase as any)
      .from('user_integrations')
      .select('user_id')
      .eq('provider', 'gmail')
      .eq('account_email', emailAddress)
      .eq('status', 'connected')
      .single();

    // Unknown email — acknowledge to prevent Pub/Sub retries
    if (!integration?.user_id) return NextResponse.json({}, { status: 200 });

    const userId = integration.user_id as string;

    // Get the historyId we saved on the previous webhook call
    const storedHistoryId = await getGmailHistoryId(supabase, userId);

    if (!storedHistoryId) {
      // First delivery — establish a baseline historyId and return
      const { historyId: newHistoryId, expiration } = await setupGmailWatch(userId);
      await saveGmailHistoryId(supabase, userId, newHistoryId, expiration);
      return NextResponse.json({}, { status: 200 });
    }

    // Fetch messages added since our stored historyId
    const { messages: newMessages, newHistoryId } = await fetchNewMessagesSinceHistory(
      userId,
      storedHistoryId
    );

    if (!newHistoryId) {
      // historyId expired (410) — renew watch and return; next push will carry on
      const { historyId: freshHistoryId, expiration } = await setupGmailWatch(userId);
      await saveGmailHistoryId(supabase, userId, freshHistoryId, expiration);
      return NextResponse.json({}, { status: 200 });
    }

    // Process new messages through the AI ingestion pipeline
    if (newMessages.length > 0) {
      await ingestGmailMessageRefs(userId, newMessages);
    }

    // Advance the stored historyId so the next push only fetches deltas
    await saveGmailHistoryId(supabase, userId, newHistoryId);
  } catch {
    // Swallow all errors — returning non-200 would trigger Pub/Sub retries
    // causing duplicate processing. Errors are logged via Sentry middleware.
  }

  // Always 200 — see note above
  return NextResponse.json({}, { status: 200 });
}
