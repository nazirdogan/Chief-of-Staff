import { schedules, logger } from '@trigger.dev/sdk/v3';
import { createServiceClient } from '@/lib/db/client';
import { listRecentPages, chunkPageContent } from '@/lib/integrations/notion';
import { generateEmbedding } from '@/lib/ai/embeddings';

export const documentIndex = schedules.task({
  id: 'document-index',
  run: async () => {
    const supabase = createServiceClient();

    // Get all users with a connected Notion integration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: integrations, error } = await (supabase as any)
      .from('user_integrations')
      .select('user_id')
      .eq('provider', 'notion')
      .eq('status', 'connected') as { data: Array<{ user_id: string }> | null; error: Error | null };

    if (error) {
      logger.error('Failed to fetch Notion integrations', { error });
      throw error;
    }

    if (!integrations || integrations.length === 0) {
      logger.info('No connected Notion integrations found');
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
          job_name: 'document-index',
          provider: 'notion',
          status: 'running',
        })
        .select('id')
        .single();

      try {
        const pages = await listRecentPages(userId, 50);
        let chunksIndexed = 0;

        for (const page of pages) {
          const chunks = chunkPageContent(page);

          for (const chunk of chunks) {
            const embedding = await generateEmbedding(chunk.content);

            // Upsert chunk into document_chunks
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: upsertError } = await (supabase as any)
              .from('document_chunks')
              .upsert(
                {
                  user_id: userId,
                  provider: 'notion',
                  source_id: chunk.pageId,
                  chunk_index: chunk.chunkIndex,
                  content_summary: chunk.content,
                  embedding,
                  metadata: {
                    title: chunk.pageTitle,
                    url: chunk.pageUrl,
                    last_edited_time: chunk.lastEditedTime,
                  },
                  expires_at: new Date(
                    Date.now() + 90 * 24 * 60 * 60 * 1000
                  ).toISOString(),
                },
                {
                  onConflict: 'user_id,provider,source_id,chunk_index',
                }
              );

            if (upsertError) {
              logger.warn(`Failed to upsert chunk for page ${chunk.pageId}`, {
                error: upsertError,
              });
              continue;
            }

            chunksIndexed++;
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('heartbeat_runs')
          .update({
            status: 'completed',
            items_processed: chunksIndexed,
            items_found: pages.length,
            duration_ms: Date.now() - startedAt,
            completed_at: new Date().toISOString(),
          })
          .eq('id', run?.id);

        logger.info(`Document index completed for user ${userId}`, {
          pages: pages.length,
          chunksIndexed,
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

        logger.error(`Document index failed for user ${userId}`, {
          error: errorMessage,
        });
      }
    }

    return { usersProcessed };
  },
});
