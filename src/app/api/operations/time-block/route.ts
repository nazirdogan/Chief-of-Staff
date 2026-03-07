import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { generateTimeBlocks, confirmTimeBlockSchedule } from '@/lib/ai/agents/operations/time-blocker';

// POST: Generate proposed time blocks
export const POST = withAuth(
  withRateLimit(5, '1 m', async (req: AuthenticatedRequest) => {
    try {
      const schedule = await generateTimeBlocks(req.user.id);

      return NextResponse.json({
        runId: schedule.runId,
        blocks: schedule.blocks,
        overflow: schedule.overflow,
      });
    } catch (err) {
      console.error('Time block generation failed:', err);
      return NextResponse.json(
        { error: 'Time block generation failed', code: 'TIME_BLOCK_FAILED' },
        { status: 500 }
      );
    }
  })
);

// PUT: Confirm proposed time blocks (creates calendar events)
export const PUT = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const { runId } = body;

    if (!runId) {
      return NextResponse.json(
        { error: 'runId is required', code: 'MISSING_RUN_ID' },
        { status: 400 }
      );
    }

    const result = await confirmTimeBlockSchedule(req.user.id, runId);

    return NextResponse.json({
      eventsCreated: result.eventsCreated,
    });
  } catch (err) {
    console.error('Time block confirmation failed:', err);
    return NextResponse.json(
      { error: 'Confirmation failed', code: 'CONFIRM_FAILED' },
      { status: 500 }
    );
  }
});
