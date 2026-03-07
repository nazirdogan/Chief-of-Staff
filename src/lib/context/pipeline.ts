import { createHash } from 'crypto';
import { createServiceClient } from '@/lib/db/client';
import { extractContext } from '@/lib/ai/agents/context-extractor';
import {
  upsertContextChunk,
  getExistingChunkHash,
  upsertContextThread,
} from '@/lib/db/queries/context';
import type {
  ContextPipelineInput,
  ProcessContextResult,
} from '@/lib/context/types';

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 100;

async function getUserContext(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
): Promise<{ activeProjects: string[]; vipContacts: string[] }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('onboarding_data')
    .select('active_projects, vip_contacts')
    .eq('user_id', userId)
    .single();

  return {
    activeProjects: data?.active_projects ?? [],
    vipContacts: data?.vip_contacts ?? [],
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processContextFromScan(params: {
  userId: string;
  provider: string;
  items: ContextPipelineInput[];
}): Promise<ProcessContextResult> {
  const { userId, provider, items } = params;
  const supabase = createServiceClient();

  const { activeProjects, vipContacts } = await getUserContext(supabase, userId);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  // Process in batches
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (item) => {
        // Dedup check: skip if content hash hasn't changed
        const contentHash = createHash('sha256').update(item.rawContent).digest('hex');
        const existingHash = await getExistingChunkHash(supabase, userId, provider, item.sourceId);

        if (existingHash === contentHash) {
          skipped++;
          return;
        }

        // Extract context via AI
        const { extraction, embedding, expiresAt } = await extractContext(
          item,
          provider,
          activeProjects,
          vipContacts
        );

        // Skip noise items to save storage
        if (extraction.importance === 'noise' && extraction.importance_score <= 2) {
          skipped++;
          return;
        }

        // Upsert context chunk
        const result = await upsertContextChunk(supabase, {
          userId,
          provider,
          sourceId: item.sourceId,
          sourceRef: item.sourceRef,
          threadId: item.threadId,
          chunkType: item.chunkType,
          title: item.title,
          extraction,
          contentHash,
          embedding,
          occurredAt: item.occurredAt,
          expiresAt,
        });

        if (!result) {
          errors++;
          return;
        }

        // If this chunk belongs to a thread, upsert the thread
        if (item.threadId) {
          await upsertContextThread(supabase, {
            userId,
            threadKey: `${provider}:${item.threadId}`,
            title: item.title ?? `${provider} thread`,
            participants: extraction.people,
          });
        }

        processed++;
      })
    );

    // Count rejected promises as errors
    for (const r of results) {
      if (r.status === 'rejected') {
        console.error('[context-pipeline] Item processing failed:', r.reason);
        errors++;
      }
    }

    // Rate limit delay between batches
    if (i + BATCH_SIZE < items.length) {
      await delay(BATCH_DELAY_MS);
    }
  }

  return { processed, skipped, errors };
}
