import { schedules, logger } from '@trigger.dev/sdk/v3';
import { generateDailyBriefing } from '@/lib/ai/agents/briefing';
import { createServiceClient } from '@/lib/db/client';

export const dailyBriefingJob = schedules.task({
  id: 'daily-briefing-generate',
  maxDuration: 120,
  run: async () => {
    const supabase = createServiceClient();

    // Get all users who need a briefing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles, error } = await (supabase as any)
      .from('profiles')
      .select('id, briefing_time, timezone')
      .eq('onboarding_completed', true) as {
        data: Array<{ id: string; briefing_time: string; timezone: string }> | null;
        error: Error | null;
      };

    if (error) {
      logger.error('Failed to fetch profiles for briefing generation', { error });
      throw error;
    }

    if (!profiles || profiles.length === 0) {
      logger.info('No users ready for briefing generation');
      return { usersProcessed: 0 };
    }

    let usersProcessed = 0;

    for (const profile of profiles) {
      const userId = profile.id;
      const startedAt = Date.now();

      // Log heartbeat run
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: run } = await (supabase as any)
        .from('heartbeat_runs')
        .insert({
          user_id: userId,
          job_name: 'daily-briefing-generate',
          status: 'running',
        })
        .select('id')
        .single();

      try {
        const briefing = await generateDailyBriefing(userId);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('heartbeat_runs')
          .update({
            status: 'completed',
            items_processed: briefing.item_count,
            items_found: briefing.item_count,
            duration_ms: Date.now() - startedAt,
            completed_at: new Date().toISOString(),
          })
          .eq('id', run?.id);

        logger.info(`Briefing generated for user ${userId}`, {
          briefing_id: briefing.id,
          item_count: briefing.item_count,
        });
        usersProcessed++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('heartbeat_runs')
          .update({
            status: 'failed',
            error_message: errorMessage,
            duration_ms: Date.now() - startedAt,
            completed_at: new Date().toISOString(),
          })
          .eq('id', run?.id);

        logger.error(`Briefing generation failed for user ${userId}`, { error: errorMessage });
      }
    }

    return { usersProcessed };
  },
});
