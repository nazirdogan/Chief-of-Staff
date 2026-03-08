import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { processContextFromScan } from '@/lib/context/pipeline';
import { desktopAdapter } from '@/lib/context/adapters/desktop-adapter';

/**
 * POST /api/desktop-observer/ingest
 *
 * Receives batched desktop context snapshots from the Tauri desktop observer
 * and feeds them into the Donna context pipeline.
 */
export const POST = withAuth(
  withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
    try {
      const { contexts } = await req.json();

      if (!Array.isArray(contexts) || contexts.length === 0) {
        return NextResponse.json(
          { error: 'No contexts provided', code: 'INVALID_INPUT' },
          { status: 400 }
        );
      }

      // Limit batch size to prevent abuse
      const capped = contexts.slice(0, 50);

      // Convert desktop context snapshots into pipeline input format
      const pipelineInputs = desktopAdapter.toContextInput(capped);

      if (pipelineInputs.length === 0) {
        return NextResponse.json({ processed: 0, skipped: 0, errors: 0 });
      }

      // Process through the standard context pipeline
      const result = await processContextFromScan({
        userId: req.user.id,
        provider: 'desktop_observer',
        items: pipelineInputs,
      });

      return NextResponse.json(result);
    } catch (error) {
      console.error('[desktop-observer/ingest] Error:', error);
      return NextResponse.json(
        { error: 'Failed to ingest desktop context', code: 'INGEST_ERROR' },
        { status: 500 }
      );
    }
  })
);
