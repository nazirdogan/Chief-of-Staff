import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { google } from 'googleapis';
import { exchangeCodeForTokens, getOAuthClient, type GoogleProvider } from '@/lib/integrations/google-oauth';
import { encrypt } from '@/lib/utils/encryption';
import { createServiceClient } from '@/lib/db/client';
import { env } from '@/lib/config';

/** Maximum age (in ms) of a valid OAuth state parameter — 10 minutes. */
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * Verify the HMAC-signed OAuth state parameter.
 * Format: `<base64url-payload>.<hmac-hex>`
 * Returns the decoded payload or null if verification fails.
 */
function verifyState(state: string): { userId: string; provider: GoogleProvider; ts: number } | null {
  const dotIdx = state.lastIndexOf('.');
  if (dotIdx === -1) return null;

  const data = state.slice(0, dotIdx);
  const receivedHmac = state.slice(dotIdx + 1);

  const expectedHmac = crypto
    .createHmac('sha256', Buffer.from(env.ENCRYPTION_KEY, 'hex'))
    .update(data)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  const receivedBuf = Buffer.from(receivedHmac);
  const expectedBuf = Buffer.from(expectedHmac);
  if (receivedBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(receivedBuf, expectedBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as {
      userId?: string;
      provider?: string;
      ts?: number;
    };
    if (!payload.userId || !payload.provider || !payload.ts) return null;

    // Check freshness — reject state older than 10 minutes
    if (Date.now() - payload.ts > STATE_MAX_AGE_MS) return null;

    return {
      userId: payload.userId,
      provider: payload.provider as GoogleProvider,
      ts: payload.ts,
    };
  } catch {
    return null;
  }
}

/**
 * GET /api/integrations/google/callback
 *
 * Public route — Google redirects here after the user grants OAuth consent.
 * Exchanges the code for tokens, fetches the user's email, stores everything
 * encrypted in user_integrations, then redirects back to the settings page.
 *
 * The desktop app (Tauri) opens this URL in the system browser and polls
 * /api/integrations for the new connected row.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  const appUrl = env.NEXT_PUBLIC_APP_URL ?? 'https://imdonna.app';
  const failRedirect = (reason: string) =>
    NextResponse.redirect(`${appUrl}/connected?error=${reason}`);

  if (errorParam === 'access_denied') {
    return failRedirect('google_denied');
  }

  if (!code || !state) {
    return failRedirect('invalid_callback');
  }

  // Verify HMAC signature + freshness of the state parameter (CSRF protection)
  const verified = verifyState(state);
  if (!verified) {
    return failRedirect('invalid_state');
  }
  const { userId, provider } = verified;

  // Exchange auth code for tokens
  let tokens: Awaited<ReturnType<typeof exchangeCodeForTokens>>;
  try {
    tokens = await exchangeCodeForTokens(code);
  } catch {
    return failRedirect('token_exchange_failed');
  }

  if (!tokens.access_token) {
    return failRedirect('no_access_token');
  }

  // Fetch the Google account email
  let accountEmail: string | null = null;
  try {
    const auth = getOAuthClient();
    auth.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth });
    const { data } = await oauth2.userinfo.get();
    accountEmail = data.email ?? null;
  } catch {
    // Non-fatal — we can store without an email, but it won't display well
  }

  const expiry = tokens.expiry_date
    ? new Date(tokens.expiry_date).toISOString()
    : new Date(Date.now() + 3600 * 1000).toISOString();

  // Upsert into user_integrations — keyed on (user_id, provider, account_email)
  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: upsertError } = await (supabase as any)
    .from('user_integrations')
    .upsert(
      {
        user_id: userId,
        provider,
        status: 'connected',
        account_email: accountEmail,
        access_token: encrypt(tokens.access_token),
        refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        token_expiry: expiry,
        nango_connection_id: null,
        connected_at: new Date().toISOString(),
        error_message: null,
      },
      { onConflict: 'user_id,provider,account_email' }
    );

  if (upsertError) {
    console.error('[google/callback] upsert failed:', upsertError);
    return failRedirect('db_error');
  }

  // Redirect to the public confirmation page — desktop app is polling and will pick up the new row
  return NextResponse.redirect(
    `${appUrl}/connected?provider=${provider}`
  );
}
