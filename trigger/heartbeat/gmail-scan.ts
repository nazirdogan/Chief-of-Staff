import { schedules, logger } from '@trigger.dev/sdk/v3';
import { ingestGmailMessages } from '@/lib/ai/agents/ingestion';
import { createServiceClient } from '@/lib/db/client';
import {
  upsertEngagementSignal,
  getEngagementSignal,
  isColdStartComplete,
} from '@/lib/db/queries/engagement';
import { classifyAction } from '@/lib/actions/classifier';
import { executeIfTierOne } from '@/lib/actions/executor';
import { AutonomyTier } from '@/lib/db/types';
import type { UserAutonomySettings, InboxItem } from '@/lib/db/types';

// Keywords that indicate a commitment — simple keyword matching, no AI call
const COMMITMENT_KEYWORDS = [
  'please', 'could you', 'can you', 'by', 'deadline', 'due', 'confirm',
  'review', 'approve', 'reply', 'respond', 'action required', 'urgent',
];

function extractDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() ?? '';
}

function hasCommitmentKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return COMMITMENT_KEYWORDS.some((kw) => lower.includes(kw));
}

export const gmailScan = schedules.task({
  id: 'gmail-scan',
  run: async () => {
    const supabase = createServiceClient();

    // Get all users with a connected Gmail integration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: integrations, error } = await (supabase as any)
      .from('user_integrations')
      .select('user_id')
      .eq('provider', 'gmail')
      .eq('status', 'connected') as { data: Array<{ user_id: string }> | null; error: Error | null };

    if (error) {
      logger.error('Failed to fetch Gmail integrations', { error });
      throw error;
    }

    if (!integrations || integrations.length === 0) {
      logger.info('No connected Gmail integrations found');
      return { usersProcessed: 0 };
    }

    let usersProcessed = 0;

    for (const integration of integrations) {
      const userId = integration.user_id;
      const startedAt = Date.now();

      // Log heartbeat run
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: run } = await (supabase as any)
        .from('heartbeat_runs')
        .insert({
          user_id: userId,
          job_name: 'gmail-scan',
          provider: 'gmail',
          status: 'running',
        })
        .select('id')
        .single();

      try {
        const result = await ingestGmailMessages(userId);

        // ── Engagement tracking & archive_email classification ──
        await processEngagementAndArchiving(supabase, userId);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('heartbeat_runs')
          .update({
            status: 'completed',
            items_processed: result.processed,
            items_found: result.found,
            duration_ms: Date.now() - startedAt,
            completed_at: new Date().toISOString(),
          })
          .eq('id', run?.id);

        logger.info(`Gmail scan completed for user ${userId}`, result);
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

        logger.error(`Gmail scan failed for user ${userId}`, { error: errorMessage });
      }
    }

    return { usersProcessed };
  },
});

/**
 * Process engagement signals and create archive_email pending actions.
 * Runs after ingestion for each user.
 */
async function processEngagementAndArchiving(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<void> {
  try {
    // 1. Track engagement signals from inbox items
    const { data: inboxItems } = await supabase
      .from('inbox_items')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'gmail')
      .eq('is_archived', false);

    if (!inboxItems || inboxItems.length === 0) return;

    for (const item of inboxItems as InboxItem[]) {
      const domain = extractDomain(item.from_email);
      if (!domain) continue;

      // Track open events for read items
      if (item.is_read) {
        await upsertEngagementSignal(supabase, userId, domain, 'open');
      }

      // Track reply events — check if there's a reply in the same thread
      if (item.thread_id) {
        const { data: threadItems } = await supabase
          .from('inbox_items')
          .select('id')
          .eq('user_id', userId)
          .eq('thread_id', item.thread_id)
          .neq('id', item.id)
          .limit(1);

        if (threadItems && threadItems.length > 0) {
          await upsertEngagementSignal(supabase, userId, domain, 'reply');
        }
      }
    }

    // 2. Evaluate unread, low-engagement items for auto-archiving
    const coldStartComplete = await isColdStartComplete(supabase, userId);

    // Fetch user autonomy settings
    const { data: settingsData } = await supabase
      .from('user_autonomy_settings')
      .select('*')
      .eq('user_id', userId);
    const userSettings = (settingsData ?? []) as UserAutonomySettings[];

    // Fetch VIP contacts
    const { data: vipContacts } = await supabase
      .from('contacts')
      .select('email')
      .eq('user_id', userId)
      .eq('is_vip', true);
    const vipEmails = new Set(
      (vipContacts ?? []).map((c: { email: string }) => c.email.toLowerCase()),
    );

    for (const item of inboxItems as InboxItem[]) {
      // Skip already-read or starred items
      if (item.is_read || item.is_starred) continue;

      const domain = extractDomain(item.from_email);
      if (!domain) continue;

      const engagement = await getEngagementSignal(supabase, userId, domain);
      const engagementScore = engagement?.engagement_score ?? 0.5;

      // Check for commitment keywords in summary
      const summaryText = item.ai_summary ?? item.subject ?? '';
      const hasCommitment = hasCommitmentKeywords(summaryText);

      // Check if sender is VIP
      const senderIsVip = vipEmails.has(item.from_email.toLowerCase());

      // Check for active thread
      let hasActiveThread = false;
      if (item.thread_id) {
        const { data: activeThreadItems } = await supabase
          .from('inbox_items')
          .select('id')
          .eq('user_id', userId)
          .eq('thread_id', item.thread_id)
          .eq('is_archived', false)
          .eq('is_read', true)
          .neq('id', item.id)
          .limit(1);
        hasActiveThread = (activeThreadItems ?? []).length > 0;
      }

      // Check whitelist
      const archiveSettings = userSettings.find(
        (s) => s.action_type === 'archive_email',
      );
      const whitelistDomains = archiveSettings?.whitelist_domains ?? [];
      const senderIsWhitelisted = whitelistDomains.includes(domain);

      // Build payload
      const payload = {
        inbox_item_id: item.id,
        sender_domain: domain,
        engagement_score: engagementScore,
        cold_start_complete: coldStartComplete,
        has_commitment: hasCommitment,
        sender_is_vip: senderIsVip,
        has_active_thread: hasActiveThread,
        sender_is_whitelisted: senderIsWhitelisted,
      };

      // Classify before creating — skip if Tier 3 (no point creating actions users must manually review for archiving)
      const tier = classifyAction(
        { action_type: 'archive_email', payload },
        userSettings,
      );

      // Only create pending actions for Tier 1 and Tier 2 archive candidates
      if (tier === AutonomyTier.FULL) continue;

      // Create the pending action
      const { data: pendingAction } = await supabase
        .from('pending_actions')
        .insert({
          user_id: userId,
          action_type: 'archive_email',
          status: 'awaiting_confirmation',
          payload,
          source_context: {
            from: item.from_email,
            subject: item.subject,
            summary: item.ai_summary,
          },
          autonomy_tier: tier,
        })
        .select('id')
        .single();

      if (pendingAction && tier === AutonomyTier.SILENT) {
        await executeIfTierOne(pendingAction.id);
      }

      logger.info(`Archive candidate created for ${domain}`, {
        tier,
        engagement_score: engagementScore,
        item_id: item.id,
      });
    }
  } catch (err) {
    logger.error('Engagement/archiving processing failed', {
      error: err instanceof Error ? err.message : 'Unknown error',
      userId,
    });
    // Non-fatal — don't throw, let the scan complete
  }
}
