import { schedules, logger } from '@trigger.dev/sdk/v3';
import { generateReflection } from '@/lib/ai/agents/reflection';
import { createServiceClient } from '@/lib/db/client';

export const monthlyReflectionJob = schedules.task({
  id: 'monthly-reflection',
  maxDuration: 180,
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
      logger.error('Failed to fetch users for monthly reflection', { error });
      throw error;
    }

    if (!users || users.length === 0) {
      logger.info('No users for monthly reflection');
      return { reflectionsGenerated: 0 };
    }

    let reflectionsGenerated = 0;

    for (const user of users) {
      try {
        // Calculate the past month in user's timezone
        const now = new Date();
        const periodEnd = new Date(now.toLocaleString('en-US', { timeZone: user.timezone || 'UTC' }));
        const periodStart = new Date(periodEnd);
        periodStart.setMonth(periodStart.getMonth() - 1);

        await generateReflection(user.id, 'monthly', periodStart, periodEnd);
        logger.info(`Monthly reflection generated for user ${user.id}`);
        reflectionsGenerated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        logger.error(`Monthly reflection failed for user ${user.id}`, { error: msg });
      }
    }

    return { reflectionsGenerated };
  },
});
