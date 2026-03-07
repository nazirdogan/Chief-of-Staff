import { schedules, logger } from '@trigger.dev/sdk/v3';
import { classifyTasks } from '@/lib/ai/agents/operations/am-sweep';
import { dispatchSubagents } from '@/lib/ai/agents/operations/dispatch';
import { sendCompletionReportToTelegram } from '@/lib/ai/agents/operations/completion-report';
import { createServiceClient } from '@/lib/db/client';

export const scheduledAmSweep = schedules.task({
  id: 'scheduled-am-sweep',
  run: async () => {
    const supabase = createServiceClient();

    // Get users with overnight enabled who have tasks to process
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: configs, error } = await (supabase as any)
      .from('user_operations_config')
      .select('user_id')
      .eq('overnight_enabled', true) as { data: Array<{ user_id: string }> | null; error: Error | null };

    if (error) {
      logger.error('Failed to fetch operations configs', { error });
      throw error;
    }

    if (!configs || configs.length === 0) {
      logger.info('No users with overnight enabled');
      return { usersProcessed: 0 };
    }

    let usersProcessed = 0;

    for (const { user_id: userId } of configs) {
      try {
        const classified = await classifyTasks(userId);

        const dispatchCount = classified.green.length + classified.yellow.length;
        if (dispatchCount === 0) {
          logger.info('No dispatchable tasks for user', { userId });
          continue;
        }

        // Auto-dispatch GREEN and YELLOW tasks
        const report = await dispatchSubagents(
          userId,
          classified.runId,
          classified.green,
          classified.yellow
        );

        // Send report via Telegram
        try {
          await sendCompletionReportToTelegram(userId, report);
        } catch {
          logger.warn('Telegram notification failed for user', { userId });
        }

        usersProcessed++;
        logger.info('AM Sweep complete for user', {
          userId,
          dispatched: dispatchCount,
          totalProcessed: report.totalTasksProcessed,
        });
      } catch (err) {
        logger.error('AM Sweep failed for user', {
          userId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { usersProcessed };
  },
});
