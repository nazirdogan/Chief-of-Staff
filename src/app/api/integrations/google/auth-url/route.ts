import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { buildAuthUrl, type GoogleProvider } from '@/lib/integrations/google-oauth';
import crypto from 'crypto';

const VALID_PROVIDERS: GoogleProvider[] = ['gmail', 'google_calendar'];

/**
 * GET /api/integrations/google/auth-url?provider=gmail|google_calendar
 *
 * Returns a one-time Google OAuth authorization URL.
 * The state param encodes userId + provider + nonce so the callback
 * can associate the resulting tokens with the correct user account.
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
  const state = Buffer.from(
    JSON.stringify({ userId: req.user.id, provider, nonce })
  ).toString('base64url');

  const url = buildAuthUrl(provider, state);
  return NextResponse.json({ url });
});
