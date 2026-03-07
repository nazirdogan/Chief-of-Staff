import { schedules, logger } from '@trigger.dev/sdk/v3';
import { calculateCalendarTransit } from '@/lib/ai/agents/operations/calendar-transit';
import { createServiceClient } from '@/lib/db/client';

export const overnightCalendarTransit = schedules.task({
  id: 'overnight-calendar-transit',
  run: async () => {
    const supabase = createServiceClient();

    // Get all users with overnight enabled and Google Calendar connected
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: users, error } = await (supabase as any)
      .from('user_integrations')
      .select('user_id')
      .eq('provider', 'google_calendar')
      .eq('status', 'connected') as { data: Array<{ user_id: string }> | null; error: Error | null };

    if (error) {
      logger.error('Failed to fetch calendar integrations', { error });
      throw error;
    }

    if (!users || users.length === 0) {
      logger.info('No connected Google Calendar integrations found');
      return { usersProcessed: 0 };
    }

    let usersProcessed = 0;
    let totalTransitEvents = 0;

    for (const { user_id: userId } of users) {
      try {
        // Check if user has overnight enabled
        const { data: config } = await supabase
          .from('user_operations_config')
          .select('*')
          .eq('user_id', userId)
          .single();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const opsConfig = config as any;
        if (opsConfig && !opsConfig.overnight_enabled) {
          logger.info('Overnight disabled for user', { userId });
          continue;
        }

        // Get user profile for timezone
        const { data: profile } = await supabase
          .from('profiles')
          .select('timezone')
          .eq('id', userId)
          .single();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userTimezone = (profile as any)?.timezone ?? 'Asia/Dubai';
        const homeAddress = opsConfig?.home_address ?? null;
        const officeAddress = opsConfig?.office_address ?? null;

        const result = await calculateCalendarTransit(userId, userTimezone, homeAddress, officeAddress);

        usersProcessed++;
        totalTransitEvents += result.transitEventsCreated;

        logger.info('Calendar transit complete for user', {
          userId,
          transitEventsCreated: result.transitEventsCreated,
          errors: result.errors.length,
        });
      } catch (err) {
        logger.error('Calendar transit failed for user', {
          userId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { usersProcessed, totalTransitEvents };
  },
});
