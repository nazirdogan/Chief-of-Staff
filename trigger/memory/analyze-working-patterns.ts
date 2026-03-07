import { schedules, logger } from '@trigger.dev/sdk/v3';
import { analyzeWorkingPatterns } from '@/lib/ai/agents/pattern-analyzer';
import { createServiceClient } from '@/lib/db/client';

export const analyzeWorkingPatternsJob = schedules.task({
  id: 'analyze-working-patterns',
  run: async () => {
    const supabase = createServiceClient();

    // Get all users with completed onboarding
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: users, error } = await (supabase as any)
      .from('profiles')
      .select('id, timezone')
      .eq('onboarding_completed', true) as { data: Array<{ id: string; timezone: string }> | null; error: Error | null };

    if (error) {
      logger.error('Failed to fetch users for pattern analysis', { error });
      throw error;
    }

    if (!users || users.length === 0) {
      logger.info('No users with completed onboarding');
      return { usersAnalyzed: 0 };
    }

    let usersAnalyzed = 0;

    for (const user of users) {
      try {
        await analyzeWorkingPatterns(user.id);
        logger.info(`Working patterns analyzed for user ${user.id}`);
        usersAnalyzed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        logger.error(`Pattern analysis failed for user ${user.id}`, { error: msg });
      }
    }

    return { usersAnalyzed };
  },
});
