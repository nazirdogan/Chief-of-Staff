import { schedules, logger } from '@trigger.dev/sdk/v3';
import { generateDailySnapshot } from '@/lib/ai/agents/memory-snapshot';
import { createServiceClient } from '@/lib/db/client';

export const generateDailySnapshotJob = schedules.task({
  id: 'generate-daily-snapshot',
  run: async () => {
    const supabase = createServiceClient();

    // Get all users with completed onboarding
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: users, error } = await (supabase as any)
      .from('profiles')
      .select('id, timezone')
      .eq('onboarding_completed', true) as { data: Array<{ id: string; timezone: string }> | null; error: Error | null };

    if (error) {
      logger.error('Failed to fetch users for daily snapshot', { error });
      throw error;
    }

    if (!users || users.length === 0) {
      logger.info('No users with completed onboarding');
      return { snapshotsGenerated: 0 };
    }

    let snapshotsGenerated = 0;

    for (const user of users) {
      try {
        // Use today's date in user's timezone
        const today = new Date().toLocaleDateString('en-CA', { timeZone: user.timezone || 'UTC' });
        await generateDailySnapshot(user.id, today);
        logger.info(`Daily snapshot generated for user ${user.id}`, { date: today });
        snapshotsGenerated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        logger.error(`Snapshot generation failed for user ${user.id}`, { error: msg });
      }
    }

    return { snapshotsGenerated };
  },
});
