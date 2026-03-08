import { schedules, logger } from '@trigger.dev/sdk/v3';
import { generateReflection } from '@/lib/ai/agents/reflection';
import { createServiceClient } from '@/lib/db/client';

export const weeklyReflectionJob = schedules.task({
  id: 'weekly-reflection',
  maxDuration: 120,
  run: async () => {
    const supabase = createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: users, error } = await (supabase as any)
      .from('profiles')
      .select('id, timezone')
      .eq('onboarding_completed', true) as {
        data: Array<{ id: string; timezone: string }> | null;
        error: Error | null;
      };

    if (error) {
      logger.error('Failed to fetch users for weekly reflection', { error });
      throw error;
    }

    if (!users || users.length === 0) {
      logger.info('No users for weekly reflection');
      return { reflectionsGenerated: 0 };
    }

    let reflectionsGenerated = 0;

    for (const user of users) {
      try {
        // Calculate the past week in user's timezone
        const now = new Date();
        const periodEnd = new Date(now.toLocaleString('en-US', { timeZone: user.timezone || 'UTC' }));
        const periodStart = new Date(periodEnd);
        periodStart.setDate(periodStart.getDate() - 7);

        await generateReflection(user.id, 'weekly', periodStart, periodEnd);
        logger.info(`Weekly reflection generated for user ${user.id}`);
        reflectionsGenerated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        logger.error(`Weekly reflection failed for user ${user.id}`, { error: msg });
      }
    }

    return { reflectionsGenerated };
  },
});
