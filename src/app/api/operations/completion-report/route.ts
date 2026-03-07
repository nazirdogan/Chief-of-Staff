import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { getCompletionReportForRun } from '@/lib/ai/agents/operations/completion-report';
import { getLatestOperationRun } from '@/lib/db/queries/operations';
import { createServiceClient } from '@/lib/db/client';

// GET: Get the latest completion report
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();
    const url = new URL(req.url);
    const runId = url.searchParams.get('runId');

    let operationRunId = runId;

    if (!operationRunId) {
      const latestRun = await getLatestOperationRun(supabase, req.user.id, 'am_sweep');
      if (!latestRun) {
        return NextResponse.json({ report: null });
      }
      operationRunId = latestRun.id;
    }

    const report = await getCompletionReportForRun(req.user.id, operationRunId);

    return NextResponse.json({ report });
  } catch (err) {
    console.error('Failed to fetch completion report:', err);
    return NextResponse.json(
      { error: 'Failed to fetch report', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
});
