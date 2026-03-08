import { schedules, logger } from '@trigger.dev/sdk/v3';
import { generateDailyBriefing } from '@/lib/ai/agents/briefing';
import { createServiceClient } from '@/lib/db/client';
import { AutonomyTier } from '@/lib/db/types';
import { executeIfTierOne } from '@/lib/actions/executor';

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

        // ── Auto-execute Tier 1 pending actions created during briefing ──
        await autoExecuteTierOneActions(supabase, userId);

        // ── Append archive summary to briefing ──
        await appendArchiveSummary(supabase, userId, briefing.id);

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

/**
 * Auto-execute any Tier 1 pending actions that were created during briefing generation.
 */
async function autoExecuteTierOneActions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<void> {
  try {
    const { data: tierOneActions } = await supabase
      .from('pending_actions')
      .select('id')
      .eq('user_id', userId)
      .eq('autonomy_tier', AutonomyTier.SILENT)
      .eq('status', 'awaiting_confirmation');

    if (!tierOneActions || tierOneActions.length === 0) return;

    for (const action of tierOneActions as Array<{ id: string }>) {
      await executeIfTierOne(action.id);
    }

    logger.info(`Auto-executed ${tierOneActions.length} Tier 1 actions for user ${userId}`);
  } catch (err) {
    logger.error('Failed to auto-execute Tier 1 actions', {
      error: err instanceof Error ? err.message : 'Unknown error',
      userId,
    });
  }
}

/**
 * Append a 'Donna archived X emails this week' section to the daily briefing.
 */
async function appendArchiveSummary(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  briefingId: string,
): Promise<void> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: archives } = await supabase
      .from('audit_log')
      .select('action_id, created_at')
      .eq('user_id', userId)
      .eq('action_type', 'archive_email')
      .eq('tier', AutonomyTier.SILENT)
      .eq('outcome', 'executed')
      .gte('created_at', sevenDaysAgo);

    if (!archives || archives.length === 0) return;

    // Get sender domains from the archived actions
    const actionIds = (archives as Array<{ action_id: string }>).map((a) => a.action_id);
    const { data: actions } = await supabase
      .from('pending_actions')
      .select('payload')
      .in('id', actionIds);

    if (!actions || actions.length === 0) return;

    // Group by sender domain
    const domainCounts = new Map<string, number>();
    for (const action of actions as Array<{ payload: Record<string, unknown> }>) {
      const domain = (action.payload.sender_domain as string) ?? 'unknown';
      domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
    }

    // Build summary text
    const domainLines = Array.from(domainCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([domain, count]) => `${domain} x${count}`)
      .join(', ');

    const summary = `Donna archived ${archives.length} emails this week: ${domainLines}`;

    // Get the next rank for this briefing
    const { data: existingItems } = await supabase
      .from('briefing_items')
      .select('rank')
      .eq('briefing_id', briefingId)
      .order('rank', { ascending: false })
      .limit(1);

    const nextRank = ((existingItems?.[0] as { rank: number } | undefined)?.rank ?? 0) + 1;

    // Insert as a briefing item
    await supabase.from('briefing_items').insert({
      briefing_id: briefingId,
      user_id: userId,
      rank: nextRank,
      section: 'quick_wins',
      item_type: 'email',
      title: `Donna archived ${archives.length} emails this week`,
      summary,
      reasoning: 'Auto-archived low-engagement emails based on your autonomy settings.',
      source_ref: {
        provider: 'donna',
        message_id: 'archive-summary',
        excerpt: domainLines,
      },
      action_suggestion: 'Undo last 7 days of archives',
    });

    logger.info(`Archive summary appended to briefing for user ${userId}`, {
      archived_count: archives.length,
    });
  } catch (err) {
    logger.error('Failed to append archive summary', {
      error: err instanceof Error ? err.message : 'Unknown error',
      userId,
    });
  }
}
