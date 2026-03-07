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
export const GET = withAuth(withRateLimit(30, '1 m', async () => {
  try {
    const res = await fetch('https://api.nango.dev/integrations', {
      headers: { 'Authorization': `Bearer ${process.env.NANGO_SECRET_KEY!}` },
    });

    if (!res.ok) {
      return NextResponse.json({ available: [] });
    }

    const data = await res.json() as { data: Array<{ unique_key: string }> };
    const available = data.data.map((i) => i.unique_key);

    return NextResponse.json({ available });
  } catch (error) {
    return handleApiError(error);
  }
}));
