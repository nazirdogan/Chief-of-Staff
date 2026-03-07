import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { classifyTasks, type ClassifiedTask } from '@/lib/ai/agents/operations/am-sweep';
import { createServiceClient } from '@/lib/db/client';
import { getLatestOperationRun } from '@/lib/db/queries/operations';

// POST: Trigger AM Sweep classification
export const POST = withAuth(
  withRateLimit(5, '1 m', async (req: AuthenticatedRequest) => {
    try {
      const result = await classifyTasks(req.user.id);

      return NextResponse.json({
        runId: result.runId,
        summary: {
          green: result.green.length,
          yellow: result.yellow.length,
          red: result.red.length,
          gray: result.gray.length,
        },
        tasks: {
          green: result.green.map(formatTask),
          yellow: result.yellow.map(formatTask),
          red: result.red.map(formatTask),
          gray: result.gray.map(formatTask),
        },
      });
    } catch (err) {
      console.error('AM Sweep failed:', err);
      return NextResponse.json(
        { error: 'AM Sweep failed', code: 'AM_SWEEP_FAILED' },
        { status: 500 }
      );
    }
  })
);

// GET: Get latest sweep results
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();
    const run = await getLatestOperationRun(supabase, req.user.id, 'am_sweep');

    if (!run) {
      return NextResponse.json({ run: null, tasks: null });
    }

    // Fetch classified inbox items
    const { data: items } = await supabase
      .from('inbox_items')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_archived', false)
      .not('operation_category', 'is', null)
      .order('received_at', { ascending: false });

    return NextResponse.json({ run, tasks: items });
  } catch (err) {
    console.error('Failed to fetch sweep results:', err);
    return NextResponse.json(
      { error: 'Failed to fetch results', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
});

function formatTask(task: ClassifiedTask) {
  const ctx = task.inbox_item?.operation_context as Record<string, unknown> | undefined;
  return {
    id: task.task_id,
    category: task.category,
    reasoning: task.reasoning,
    agentAssignment: task.agent_assignment,
    title: task.inbox_item?.task_title || task.inbox_item?.subject || 'Untitled',
    from: task.inbox_item?.from_name || task.inbox_item?.from_email || '',
    duration: task.inbox_item?.estimated_duration_minutes,
    tags: task.inbox_item?.task_tags ?? [],
    priority: ctx?.priority,
  };
}
