import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { exchangeCodeForTokens, getOAuthClient, type GoogleProvider } from '@/lib/integrations/google-oauth';
import { encrypt } from '@/lib/utils/encryption';
import { createServiceClient } from '@/lib/db/client';

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://imdonna.app';
  const failRedirect = (reason: string) =>
    NextResponse.redirect(`${appUrl}/settings/integrations?error=${reason}`);

  if (errorParam === 'access_denied') {
    return failRedirect('google_denied');
  }

  if (!code || !state) {
    return failRedirect('invalid_callback');
  }

  // Decode and validate state
  let userId: string;
  let provider: GoogleProvider;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString()) as {
      userId?: string;
      provider?: string;
    };
    if (!decoded.userId || !decoded.provider) throw new Error('missing fields');
    userId = decoded.userId;
    provider = decoded.provider as GoogleProvider;
  } catch {
    return failRedirect('invalid_state');
  }

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

  // Redirect to settings page — desktop app is polling and will pick up the new row
  return NextResponse.redirect(
    `${appUrl}/settings/integrations?connected=${provider}`
  );
}
