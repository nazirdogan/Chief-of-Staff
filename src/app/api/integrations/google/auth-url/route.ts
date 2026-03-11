import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { buildAuthUrl, type GoogleProvider } from '@/lib/integrations/google-oauth';
import { env } from '@/lib/config';
import crypto from 'crypto';

const VALID_PROVIDERS: GoogleProvider[] = ['gmail', 'google_calendar'];

/**
 * HMAC-sign the OAuth state parameter to prevent CSRF / state-tampering.
 * Format: `<base64url-payload>.<hmac-hex>`
 */
function signState(payload: Record<string, unknown>): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto
    .createHmac('sha256', Buffer.from(env.ENCRYPTION_KEY, 'hex'))
    .update(data)
    .digest('hex');
  return `${data}.${hmac}`;
}

/**
 * GET /api/integrations/google/auth-url?provider=gmail|google_calendar
 *
 * Returns a one-time Google OAuth authorization URL.
 * The state param is HMAC-signed and carries userId + provider + nonce + ts
 * so the callback can verify authenticity, freshness, and associate tokens
 * with the correct user account.
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const provider = req.nextUrl.searchParams.get('provider') as GoogleProvider | null;

  if (!provider || !VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json(
      { error: 'provider must be gmail or google_calendar', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  const state = signState({
    userId: req.user.id,
    provider,
    nonce,
    ts: Date.now(),
  });

  const url = buildAuthUrl(provider, state);
  return NextResponse.json({ url });
});
