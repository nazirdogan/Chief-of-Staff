import { schedules, logger } from '@trigger.dev/sdk/v3';
import { getTodaysParsedEvents } from '@/lib/integrations/google-calendar';
import { getTodaysOutlookEvents } from '@/lib/integrations/outlook';
import { createServiceClient } from '@/lib/db/client';
import type { IntegrationProvider } from '@/lib/db/types';

async function scanCalendarProvider(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  provider: IntegrationProvider,
  jobName: string,
  fetchEvents: () => Promise<Array<unknown>>
): Promise<boolean> {
  const startedAt = Date.now();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: run } = await (supabase as any)
    .from('heartbeat_runs')
    .insert({
      user_id: userId,
      job_name: jobName,
      provider,
      status: 'running',
    })
    .select('id')
    .single();

  try {
    const events = await fetchEvents();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('heartbeat_runs')
      .update({
        status: 'completed',
        items_processed: events.length,
        items_found: events.length,
        duration_ms: Date.now() - startedAt,
        completed_at: new Date().toISOString(),
      })
      .eq('id', run?.id);

    logger.info(`${jobName} completed for user ${userId}`, {
      eventsFound: events.length,
    });
    return true;
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

    logger.error(`${jobName} failed for user ${userId}`, { error: errorMessage });
    return false;
  }
}

export const calendarScan = schedules.task({
  id: 'calendar-scan',
  run: async () => {
    const supabase = createServiceClient();
    let usersProcessed = 0;

    // Scan Google Calendar integrations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: gcalIntegrations, error: gcalError } = await (supabase as any)
      .from('user_integrations')
      .select('user_id')
      .eq('provider', 'google_calendar')
      .eq('status', 'connected') as { data: Array<{ user_id: string }> | null; error: Error | null };

    if (gcalError) {
      logger.error('Failed to fetch Google Calendar integrations', { error: gcalError });
    }

    for (const integration of gcalIntegrations ?? []) {
      const success = await scanCalendarProvider(
        supabase,
        integration.user_id,
        'google_calendar',
        'calendar-scan',
        () => getTodaysParsedEvents(integration.user_id)
      );
      if (success) usersProcessed++;
    }

    // Scan Outlook Calendar integrations (uses the same 'microsoft' Nango connection)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: outlookIntegrations, error: outlookError } = await (supabase as any)
      .from('user_integrations')
      .select('user_id')
      .eq('provider', 'outlook')
      .eq('status', 'connected') as { data: Array<{ user_id: string }> | null; error: Error | null };

    if (outlookError) {
      logger.error('Failed to fetch Outlook integrations', { error: outlookError });
    }

    for (const integration of outlookIntegrations ?? []) {
      const success = await scanCalendarProvider(
        supabase,
        integration.user_id,
        'outlook',
        'outlook-calendar-scan',
        () => getTodaysOutlookEvents(integration.user_id)
      );
      if (success) usersProcessed++;
    }

    return { usersProcessed };
  },
});
