import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { generateConnectToken, getTelegramConnectUrl } from '@/lib/integrations/telegram';

export const POST = withRateLimit(10, '1 m', withAuth(async (req: AuthenticatedRequest) => {
  try {
    const token = generateConnectToken(req.user.id);
    const url = getTelegramConnectUrl(token);

    return NextResponse.json({ url, token });
  } catch (error) {
    return handleApiError(error);
  }
}));
