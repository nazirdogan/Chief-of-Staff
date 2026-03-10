import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { updateIntegrationAlias } from '@/lib/db/queries/integrations';

/**
 * PATCH /api/integrations/:id/alias
 *
 * Updates the user-facing label for a specific connected account.
 * Body: { alias: string }
 */
export const PATCH = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    // Path: /api/integrations/:id/alias  → id is at index before "alias"
    const aliasIndex = segments.indexOf('alias');
    const integrationId = aliasIndex > 0 ? segments[aliasIndex - 1] : null;
    const body = await req.json();
    const { alias } = body as { alias: string };

    if (!integrationId) {
      return NextResponse.json(
        { error: 'Missing integration ID', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!alias || typeof alias !== 'string' || alias.trim().length === 0) {
      return NextResponse.json(
        { error: 'alias must be a non-empty string', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (alias.trim().length > 60) {
      return NextResponse.json(
        { error: 'alias must be 60 characters or fewer', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    await updateIntegrationAlias(supabase, req.user.id, integrationId, alias.trim());

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}));
