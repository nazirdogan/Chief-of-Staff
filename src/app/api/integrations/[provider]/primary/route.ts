import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import type { IntegrationProvider } from '@/lib/db/types';

/**
 * PATCH /api/integrations/:id/primary
 *
 * Marks a specific integration row as the primary account for its provider.
 * Clears "(Primary)" from all other rows of the same provider and appends it
 * to the selected row's connection_alias.
 *
 * Body: { provider: IntegrationProvider }
 */
export const PATCH = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const primaryIndex = segments.indexOf('primary');
    const integrationId = primaryIndex > 0 ? segments[primaryIndex - 1] : null;
    const body = await req.json();
    const { provider } = body as { provider: IntegrationProvider };

    if (!integrationId) {
      return NextResponse.json(
        { error: 'Missing integration ID', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!provider) {
      return NextResponse.json(
        { error: 'Missing provider', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createServiceClient() as any;

    // Get all connections for this provider
    const { data: rows, error: fetchError } = await db
      .from('user_integrations')
      .select('id, connection_alias')
      .eq('user_id', req.user.id)
      .eq('provider', provider)
      .eq('status', 'connected');

    if (fetchError) throw fetchError;

    // Strip "(Primary)" from all rows, then add it to the target
    for (const row of (rows ?? []) as Array<{ id: string; connection_alias: string | null }>) {
      const cleaned = (row.connection_alias ?? '').replace(/\s*\(Primary\)/, '').trim();
      if (row.id === integrationId) {
        await db
          .from('user_integrations')
          .update({ connection_alias: cleaned ? `${cleaned} (Primary)` : '(Primary)' })
          .eq('id', row.id);
      } else if (row.connection_alias?.includes('(Primary)')) {
        await db
          .from('user_integrations')
          .update({ connection_alias: cleaned || null })
          .eq('id', row.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}));
