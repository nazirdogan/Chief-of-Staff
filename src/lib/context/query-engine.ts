import { createServiceClient } from '@/lib/db/client';
import { generateEmbedding } from '@/lib/ai/embeddings';
import {
  matchContextChunks,
  getWorkingPatterns,
  getMemorySnapshot,
  getContextChunksByThread,
} from '@/lib/db/queries/context';
import type {
  ContextChunk,
  ContextChunkType,
  ContextImportance,
  WorkingPatterns,
  MemorySnapshot,
  ContextThread,
} from '@/lib/context/types';

export interface ContextQuery {
  userId: string;
  query: string;
  filters?: {
    providers?: string[];
    chunkTypes?: ContextChunkType[];
    importance?: ContextImportance[];
    projects?: string[];
    people?: string[];
    after?: string;
    before?: string;
  };
  limit?: number;
  includePatterns?: boolean;
  includeSnapshot?: boolean;
  includeThreads?: boolean;
}

export interface ContextQueryResult {
  chunks: Array<ContextChunk & { similarity: number }>;
  patterns?: WorkingPatterns | null;
  snapshot?: MemorySnapshot | null;
  threads?: ContextThread[];
  totalMatches: number;
  queryEmbedding: number[];
}

export async function queryContext(params: ContextQuery): Promise<ContextQueryResult> {
  const supabase = createServiceClient();
  const queryEmbedding = await generateEmbedding(params.query);

  // Determine the most restrictive filter for the RPC call
  // (RPC supports single type/importance filter, so we use the first if multiple)
  const filterType = params.filters?.chunkTypes?.[0] ?? undefined;
  const filterImportance = params.filters?.importance?.[0] ?? undefined;
  const filterAfter = params.filters?.after ?? undefined;

  let chunks = await matchContextChunks(supabase, {
    queryEmbedding,
    userId: params.userId,
    limit: params.limit ?? 20,
    filterType,
    filterImportance,
    filterAfter: filterAfter ? new Date(filterAfter).toISOString() : undefined,
  });

  // Apply client-side filters the RPC doesn't handle
  if (params.filters?.providers?.length) {
    chunks = chunks.filter((c) => params.filters!.providers!.includes(c.provider));
  }
  if (params.filters?.chunkTypes && params.filters.chunkTypes.length > 1) {
    chunks = chunks.filter((c) => params.filters!.chunkTypes!.includes(c.chunk_type));
  }
  if (params.filters?.importance && params.filters.importance.length > 1) {
    chunks = chunks.filter((c) => params.filters!.importance!.includes(c.importance));
  }
  if (params.filters?.projects?.length) {
    chunks = chunks.filter((c) =>
      c.projects.some((p) => params.filters!.projects!.includes(p))
    );
  }
  if (params.filters?.people?.length) {
    chunks = chunks.filter((c) =>
      c.people.some((p) => params.filters!.people!.includes(p))
    );
  }
  if (params.filters?.before) {
    const before = new Date(params.filters.before).getTime();
    chunks = chunks.filter((c) => new Date(c.occurred_at).getTime() <= before);
  }

  const result: ContextQueryResult = {
    chunks,
    totalMatches: chunks.length,
    queryEmbedding,
  };

  // Optionally load working patterns
  if (params.includePatterns) {
    result.patterns = await getWorkingPatterns(supabase, params.userId);
  }

  // Optionally load today's snapshot
  if (params.includeSnapshot) {
    const today = new Date().toISOString().split('T')[0];
    result.snapshot = await getMemorySnapshot(supabase, params.userId, today);
  }

  // Optionally expand thread context for matched chunks
  if (params.includeThreads) {
    const threadIds = [...new Set(chunks.map((c) => c.thread_id).filter(Boolean))] as string[];
    const threadChunksMap = new Map<string, ContextChunk[]>();

    for (const threadId of threadIds.slice(0, 5)) {
      const threadChunks = await getContextChunksByThread(supabase, params.userId, threadId);
      threadChunksMap.set(threadId, threadChunks);
    }

    // Build thread objects from the chunks
    result.threads = threadIds.slice(0, 5).map((threadId) => {
      const tChunks = threadChunksMap.get(threadId) ?? [];
      return {
        id: threadId,
        user_id: params.userId,
        thread_key: threadId,
        title: tChunks[0]?.title ?? 'Thread',
        summary: null,
        last_chunk_at: tChunks[tChunks.length - 1]?.occurred_at ?? new Date().toISOString(),
        chunk_count: tChunks.length,
        participants: [...new Set(tChunks.flatMap((c) => c.people))],
        is_active: true,
        created_at: tChunks[0]?.captured_at ?? new Date().toISOString(),
        updated_at: tChunks[tChunks.length - 1]?.captured_at ?? new Date().toISOString(),
      };
    });
  }

  return result;
}

export async function summarizeContext(params: {
  chunks: ContextChunk[];
  purpose: string;
  maxLength?: number;
  userId: string;
}): Promise<{
  summary: string;
  sources: Array<{ title: string; source_ref: Record<string, unknown> }>;
}> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const { AI_MODELS } = await import('@/lib/ai/models');

  const anthropic = new Anthropic();

  const chunkTexts = params.chunks.map((c, i) => {
    return `[${i + 1}] (${c.provider}, ${c.occurred_at}) ${c.title ?? ''}: ${c.content_summary}`;
  });

  const response = await anthropic.messages.create({
    model: AI_MODELS.STANDARD,
    max_tokens: params.maxLength ? Math.max(300, params.maxLength) : 800,
    system: `You are a context summarizer. Given a set of context chunks, produce a coherent summary for a specific purpose. Always reference sources by their number [1], [2], etc. Be concise and actionable.`,
    messages: [
      {
        role: 'user',
        content: `Purpose: ${params.purpose}\n\nContext chunks:\n${chunkTexts.join('\n\n')}`,
      },
    ],
  });

  const textBlock = response.content.find((c) => c.type === 'text');
  const summary = textBlock && textBlock.type === 'text' ? textBlock.text : 'No summary generated.';

  const sources = params.chunks.map((c) => ({
    title: c.title ?? `${c.provider}:${c.source_id}`,
    source_ref: c.source_ref,
  }));

  return { summary, sources };
}
