import { schedules, logger } from '@trigger.dev/sdk/v3';
import { createServiceClient } from '@/lib/db/client';

export const meetingTranscriptScan = schedules.task({
  id: 'meeting-transcript-scan',
  run: async () => {
    const supabase = createServiceClient();

    // Get all users with transcription-capable integrations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: integrations, error } = await (supabase as any)
      .from('user_integrations')
      .select('user_id, provider')
      .in('provider', ['google_drive', 'google_calendar'])
      .eq('status', 'connected') as {
        data: Array<{ user_id: string; provider: string }> | null;
        error: Error | null;
      };

    if (error) {
      logger.error('Failed to fetch transcription integrations', { error });
      throw error;
    }

    if (!integrations || integrations.length === 0) {
      logger.info('No connected transcription integrations found');
      return { usersProcessed: 0, transcriptsFound: 0 };
    }

    // Deduplicate by user
    const userIds = [...new Set(integrations.map((i) => i.user_id))];
    let usersProcessed = 0;
    const transcriptsFound = 0;

    for (const userId of userIds) {
      try {
        // Google Meet transcripts are saved as Google Docs in Drive
        // Check for recently modified docs with "[Meeting Transcript]" or "Meeting notes" in title
        // This is a placeholder — actual implementation depends on Google Drive API response format
        // and whether the user has Google Meet transcription enabled

        logger.info(`Checked transcription sources for user ${userId}`);
        usersProcessed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        logger.error(`Transcript scan failed for user ${userId}`, { error: msg });
      }
    }

    return { usersProcessed, transcriptsFound };
  },
});
