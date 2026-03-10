import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';

/**
 * GET /api/integrations/available
 *
 * Returns which Nango integrations are configured (have OAuth credentials).
 * The frontend uses this to show which providers can actually be connected.
 */
// Known providers the app supports — used as fallback when Nango API is unreachable
const KNOWN_PROVIDERS = ['google-mail', 'google-calendar', 'slack', 'notion'];

export const GET = withAuth(withRateLimit(30, '1 m', async () => {
  try {
    const res = await fetch('https://api.nango.dev/integrations', {
      headers: { 'Authorization': `Bearer ${process.env.NANGO_SECRET_KEY!}` },
    });

    if (!res.ok) {
      // Fall back to all known providers so the UI doesn't show "Soon" for everything
      return NextResponse.json({ available: KNOWN_PROVIDERS });
    }

    const data = await res.json() as { data: Array<{ unique_key: string }> };
    const available = data.data.map((i) => i.unique_key);

    // If Nango returns an empty list (integrations not yet configured in dashboard),
    // fall back to the known provider list so the OAuth flow can attempt and surface real errors
    return NextResponse.json({ available: available.length > 0 ? available : KNOWN_PROVIDERS });
  } catch (error) {
    return handleApiError(error);
  }
}));
