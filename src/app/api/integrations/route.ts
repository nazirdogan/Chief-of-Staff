import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { listUserIntegrations } from '@/lib/db/queries/integrations';

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();
    const integrations = await listUserIntegrations(supabase, req.user.id);

    return NextResponse.json({ integrations });
  } catch (error) {
    return handleApiError(error);
  }
});
