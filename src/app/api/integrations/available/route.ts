import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';

/**
 * GET /api/integrations/available
 *
 * Returns which integrations can be connected.
 * Google providers use direct OAuth (GOOGLE_CLIENT_ID/SECRET must be set).
 * Other providers (Slack, Notion) to be wired up as needed.
 */
const GOOGLE_PROVIDERS = ['gmail', 'google_calendar'];

export const GET = withAuth(withRateLimit(30, '1 m', async () => {
  const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
  const available = googleConfigured ? GOOGLE_PROVIDERS : [];
  return NextResponse.json({ available });
}));
