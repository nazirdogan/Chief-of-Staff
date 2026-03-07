import { schedules, logger } from '@trigger.dev/sdk/v3';
import { ingestMondayItems } from '@/lib/ai/agents/ingestion';
import { createServiceClient } from '@/lib/db/client';

export const mondayScan = schedules.task({
  id: 'monday-scan',
  run: async () => {
    const supabase = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: integrations, error } = await (supabase as any).from('user_integrations').select('user_id').eq('provider', 'monday').eq('status', 'connected') as { data: Array<{ user_id: string }> | null; error: Error | null };
    if (error) { logger.error('Failed to fetch Monday.com integrations', { error }); throw error; }
    if (!integrations || integrations.length === 0) { logger.info('No connected Monday.com integrations found'); return { usersProcessed: 0 }; }
    let usersProcessed = 0;
    for (const integration of integrations) {
      const userId = integration.user_id;
      const startedAt = Date.now();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: run } = await (supabase as any).from('heartbeat_runs').insert({ user_id: userId, job_name: 'monday-scan', provider: 'monday', status: 'running' }).select('id').single();
      try {
        const result = await ingestMondayItems(userId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('heartbeat_runs').update({ status: 'completed', items_processed: result.processed, items_found: result.found, duration_ms: Date.now() - startedAt, completed_at: new Date().toISOString() }).eq('id', run?.id);
        logger.info(`Monday.com scan completed for user ${userId}`, result);
        usersProcessed++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('heartbeat_runs').update({ status: 'failed', error_message: errorMessage, duration_ms: Date.now() - startedAt, completed_at: new Date().toISOString() }).eq('id', run?.id);
        logger.error(`Monday.com scan failed for user ${userId}`, { error: errorMessage });
      }
    }
    return { usersProcessed };
  },
});
