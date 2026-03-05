import { schedules, logger } from '@trigger.dev/sdk/v3';
import { computeRelationshipUpdates } from '@/lib/ai/agents/relationship';
import { createServiceClient } from '@/lib/db/client';
import { getAllContactsForScoring, updateContact } from '@/lib/db/queries/contacts';

export const relationshipCheck = schedules.task({
  id: 'relationship-check',
  run: async () => {
    const supabase = createServiceClient();

    // Get all users with at least one connected integration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: integrations, error } = await (supabase as any)
      .from('user_integrations')
      .select('user_id')
      .eq('status', 'connected') as { data: Array<{ user_id: string }> | null; error: Error | null };

    if (error) {
      logger.error('Failed to fetch integrations', { error });
      throw error;
    }

    if (!integrations || integrations.length === 0) {
      logger.info('No connected integrations found');
      return { usersProcessed: 0, contactsUpdated: 0 };
    }

    // Deduplicate user IDs
    const userIds = [...new Set(integrations.map(i => i.user_id))];

    let totalContactsUpdated = 0;

    for (const userId of userIds) {
      const startedAt = Date.now();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: run } = await (supabase as any)
        .from('heartbeat_runs')
        .insert({
          user_id: userId,
          job_name: 'relationship-check',
          status: 'running',
        })
        .select('id')
        .single();

      try {
        const contacts = await getAllContactsForScoring(supabase, userId);

        if (contacts.length === 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('heartbeat_runs')
            .update({
              status: 'completed',
              items_processed: 0,
              items_found: 0,
              duration_ms: Date.now() - startedAt,
              completed_at: new Date().toISOString(),
            })
            .eq('id', run?.id);
          continue;
        }

        const updates = computeRelationshipUpdates(contacts);

        for (const update of updates) {
          await updateContact(supabase, userId, update.contactId, {
            relationship_score: update.newScore,
            is_cold: update.isCold,
            cold_flagged_at: update.coldFlaggedAt,
          });
        }

        totalContactsUpdated += updates.length;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('heartbeat_runs')
          .update({
            status: 'completed',
            items_processed: updates.length,
            items_found: contacts.length,
            duration_ms: Date.now() - startedAt,
            completed_at: new Date().toISOString(),
          })
          .eq('id', run?.id);

        logger.info(`Relationship check completed for user ${userId}`, {
          contacts: contacts.length,
          updated: updates.length,
          coldFlagged: updates.filter(u => u.isCold).length,
        });
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

        logger.error(`Relationship check failed for user ${userId}`, { error: errorMessage });
      }
    }

    return { usersProcessed: userIds.length, contactsUpdated: totalContactsUpdated };
  },
});
