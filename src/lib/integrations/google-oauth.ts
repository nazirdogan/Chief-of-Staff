/**
 * Direct Google OAuth helpers — token exchange, refresh, revoke, and live-token retrieval.
 * All tokens are stored encrypted (AES-256-GCM) in user_integrations.
 */

import { google } from 'googleapis';
import { encrypt, decrypt } from '@/lib/utils/encryption';
import { createServiceClient } from '@/lib/db/client';
import type { IntegrationProvider } from '@/lib/db/types';

const GOOGLE_SCOPES: Record<string, string> = {
  gmail: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
  ].join(' '),
  google_calendar: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
  ].join(' '),
};

export type GoogleProvider = Extract<IntegrationProvider, 'gmail' | 'google_calendar'>;

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );
}

/**
 * Build the Google authorization URL. The state param carries userId + provider
 * so the callback can associate the tokens with the right user account.
 */
export function buildAuthUrl(provider: GoogleProvider, state: string): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_SCOPES[provider],
    prompt: 'consent',   // always return refresh_token
    state,
  });
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

/**
 * Use a stored (encrypted) refresh token to get a new access token.
 * Returns the raw (decrypted) new access token and its expiry.
 */
export async function refreshAccessToken(
  encryptedRefreshToken: string
): Promise<{ accessToken: string; expiry: string }> {
  const refreshToken = decrypt(encryptedRefreshToken);
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  const accessToken = credentials.access_token;
  if (!accessToken) throw new Error('Google did not return a new access token');
  const expiry = credentials.expiry_date
    ? new Date(credentials.expiry_date).toISOString()
    : new Date(Date.now() + 3600 * 1000).toISOString();
  return { accessToken, expiry };
}

/**
 * Revoke a stored (encrypted) access token at Google.
 * Silently ignores errors — token may already be expired or revoked.
 */
export async function revokeToken(encryptedAccessToken: string): Promise<void> {
  try {
    const accessToken = decrypt(encryptedAccessToken);
    const client = getOAuthClient();
    await client.revokeToken(accessToken);
  } catch {
    // Already revoked or expired — nothing to do
  }
}

/**
 * Return a live (non-expired) access token for a specific integration row.
 * If the stored token is within 5 minutes of expiry, it auto-refreshes and
 * updates the DB before returning.
 */
export async function getLiveAccessToken(integrationId: string): Promise<string> {
  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('user_integrations')
    .select('access_token, refresh_token, token_expiry')
    .eq('id', integrationId)
    .single();

  if (error || !data) throw new Error(`Integration ${integrationId} not found`);

  const {
    access_token: encryptedAccess,
    refresh_token: encryptedRefresh,
    token_expiry: tokenExpiry,
  } = data as {
    access_token: string | null;
    refresh_token: string | null;
    token_expiry: string | null;
  };

  if (!encryptedAccess || !encryptedRefresh) {
    throw new Error('No tokens stored for this integration. Please reconnect.');
  }

  const expiry = tokenExpiry ? new Date(tokenExpiry) : null;
  const fiveMinutes = 5 * 60 * 1000;
  const needsRefresh = !expiry || expiry.getTime() - Date.now() < fiveMinutes;

  if (!needsRefresh) {
    return decrypt(encryptedAccess);
  }

  // Token is expired or about to expire — refresh it
  const { accessToken, expiry: newExpiry } = await refreshAccessToken(encryptedRefresh);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('user_integrations')
    .update({
      access_token: encrypt(accessToken),
      token_expiry: newExpiry,
    })
    .eq('id', integrationId);

  return accessToken;
}
