import { schedules, logger } from '@trigger.dev/sdk/v3';
import { createServiceClient } from '@/lib/db/client';
import {
  extractCommitmentsFromGmail,
  extractCommitmentsFromOutlook,
} from '@/lib/ai/agents/commitment';
import { getGmailClient } from '@/lib/integrations/gmail';
import type { IntegrationProvider } from '@/lib/db/types';

async function runCommitmentCheckForProvider(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  provider: IntegrationProvider,
  extractFn: () => Promise<{ extracted: number; total: number }>
): Promise<boolean> {
  const startedAt = Date.now();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: run } = await (supabase as any)
    .from('heartbeat_runs')
    .insert({
      user_id: userId,
      job_name: 'commitment-check',
      provider,
      status: 'running',
    })
    .select('id')
    .single();

  try {
    const result = await extractFn();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('heartbeat_runs')
      .update({
        status: 'completed',
        items_processed: result.total,
        items_found: result.extracted,
        duration_ms: Date.now() - startedAt,
        completed_at: new Date().toISOString(),
      })
      .eq('id', run?.id);

    logger.info(`Commitment check (${provider}) completed for user ${userId}`, result);
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

    logger.error(`Commitment check (${provider}) failed for user ${userId}`, { error: errorMessage });
    return false;
  }
}

export const commitmentCheck = schedules.task({
  id: 'commitment-check',
  run: async () => {
    const supabase = createServiceClient();
    let usersProcessed = 0;

    // Gmail commitment extraction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: gmailIntegrations, error: gmailError } = await (supabase as any)
      .from('user_integrations')
      .select('user_id')
      .eq('provider', 'gmail')
      .eq('status', 'connected') as { data: Array<{ user_id: string }> | null; error: Error | null };

    if (gmailError) {
      logger.error('Failed to fetch Gmail integrations', { error: gmailError });
    }

    for (const integration of gmailIntegrations ?? []) {
      const userId = integration.user_id;
      const success = await runCommitmentCheckForProvider(
        supabase,
        userId,
        'gmail',
        async () => {
          const gmail = await getGmailClient(userId);
          const response = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 20,
            labelIds: ['SENT'],
            q: 'newer_than:1d',
          });
          const messageIds = (response.data.messages ?? [])
            .map((m) => m.id)
            .filter((id): id is string => !!id);
          return extractCommitmentsFromGmail(userId, messageIds);
        }
      );
      if (success) usersProcessed++;
    }

    // Outlook commitment extraction
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
      const success = await runCommitmentCheckForProvider(
        supabase,
        integration.user_id,
        'outlook',
        () => extractCommitmentsFromOutlook(integration.user_id)
      );
      if (success) usersProcessed++;
    }

    return { usersProcessed };
  },
});
