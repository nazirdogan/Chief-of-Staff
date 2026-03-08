import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ContextChunkType,
  ContextImportance,
  ContextExtractionResult,
  ContextChunk,
  ContextThread,
  WorkingPatterns,
  MemorySnapshot,
} from '@/lib/context/types';

// ── Context Chunks ──────────────────────────────────────────

export async function upsertContextChunk(
  supabase: SupabaseClient,
  params: {
    userId: string;
    provider: string;
    sourceId: string;
    sourceRef: Record<string, unknown>;
    threadId?: string;
    chunkType: ContextChunkType;
    title?: string;
    extraction: ContextExtractionResult;
    contentHash: string;
    embedding: number[];
    occurredAt: string;
    expiresAt: string | null;
  }
): Promise<{ id: string } | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('context_chunks')
    .upsert(
      {
        user_id: params.userId,
        provider: params.provider,
        source_id: params.sourceId,
        source_ref: params.sourceRef,
        thread_id: params.threadId ?? null,
        chunk_type: params.chunkType,
        title: params.title ?? null,
        content_summary: params.extraction.content_summary,
        raw_content_hash: params.contentHash,
        entities: params.extraction.entities,
        sentiment: params.extraction.sentiment,
        importance: params.extraction.importance,
        importance_score: params.extraction.importance_score,
        topics: params.extraction.topics,
        projects: params.extraction.projects,
        people: params.extraction.people,
        embedding: params.embedding,
        occurred_at: params.occurredAt,
        expires_at: params.expiresAt,
      },
      { onConflict: 'user_id,provider,source_id' }
    )
    .select('id')
    .single();

  if (error) {
    console.error('[context] Failed to upsert context chunk:', error.message);
    return null;
  }
  return data;
}

export async function getExistingChunkHash(
  supabase: SupabaseClient,
  userId: string,
  provider: string,
  sourceId: string
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('context_chunks')
    .select('raw_content_hash')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('source_id', sourceId)
    .single();

  return data?.raw_content_hash ?? null;
}

export async function getContextChunksByUser(
  supabase: SupabaseClient,
  userId: string,
  opts?: {
    chunkType?: ContextChunkType;
    importance?: ContextImportance;
    after?: string;
    before?: string;
    limit?: number;
  }
): Promise<ContextChunk[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('context_chunks')
    .select('*')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false });

  if (opts?.chunkType) query = query.eq('chunk_type', opts.chunkType);
  if (opts?.importance) query = query.eq('importance', opts.importance);
  if (opts?.after) query = query.gte('occurred_at', opts.after);
  if (opts?.before) query = query.lte('occurred_at', opts.before);
  query = query.limit(opts?.limit ?? 100);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getContextChunksByPeople(
  supabase: SupabaseClient,
  userId: string,
  email: string,
  limit = 20
): Promise<ContextChunk[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('context_chunks')
    .select('*')
    .eq('user_id', userId)
    .contains('people', [email])
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getContextChunksByProject(
  supabase: SupabaseClient,
  userId: string,
  project: string,
  limit = 20
): Promise<ContextChunk[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('context_chunks')
    .select('*')
    .eq('user_id', userId)
    .contains('projects', [project])
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getContextChunksByThread(
  supabase: SupabaseClient,
  userId: string,
  threadId: string
): Promise<ContextChunk[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('context_chunks')
    .select('*')
    .eq('user_id', userId)
    .eq('thread_id', threadId)
    .order('occurred_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// ── Context Threads ──────────────────────────────────────────

export async function upsertContextThread(
  supabase: SupabaseClient,
  params: {
    userId: string;
    threadKey: string;
    title: string;
    summary?: string;
    participants: string[];
  }
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('context_threads')
    .upsert(
      {
        user_id: params.userId,
        thread_key: params.threadKey,
        title: params.title,
        summary: params.summary ?? null,
        last_chunk_at: new Date().toISOString(),
        chunk_count: 1, // will be incremented via raw SQL in a future optimization
        participants: params.participants,
        is_active: true,
      },
      { onConflict: 'user_id,thread_key' }
    );

  if (error) {
    console.error('[context] Failed to upsert context thread:', error.message);
  }
}

export async function getContextThread(
  supabase: SupabaseClient,
  userId: string,
  threadKey: string
): Promise<ContextThread | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('context_threads')
    .select('*')
    .eq('user_id', userId)
    .eq('thread_key', threadKey)
    .single();

  return data ?? null;
}

export async function getActiveContextThreads(
  supabase: SupabaseClient,
  userId: string,
  limit = 20
): Promise<ContextThread[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('context_threads')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('last_chunk_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

// ── Working Patterns ──────────────────────────────────────────

export async function upsertWorkingPatterns(
  supabase: SupabaseClient,
  userId: string,
  patterns: Omit<WorkingPatterns, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('working_patterns')
    .upsert(
      {
        user_id: userId,
        ...patterns,
        last_analyzed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('[context] Failed to upsert working patterns:', error.message);
  }
}

export async function getWorkingPatterns(
  supabase: SupabaseClient,
  userId: string
): Promise<WorkingPatterns | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('working_patterns')
    .select('*')
    .eq('user_id', userId)
    .single();

  return data ?? null;
}

// ── Memory Snapshots ──────────────────────────────────────────

export async function upsertMemorySnapshot(
  supabase: SupabaseClient,
  userId: string,
  snapshot: Omit<MemorySnapshot, 'id' | 'user_id' | 'created_at'>
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('memory_snapshots')
    .upsert(
      {
        user_id: userId,
        ...snapshot,
      },
      { onConflict: 'user_id,snapshot_date' }
    );

  if (error) {
    console.error('[context] Failed to upsert memory snapshot:', error.message);
  }
}

export async function getMemorySnapshot(
  supabase: SupabaseClient,
  userId: string,
  date: string
): Promise<MemorySnapshot | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('memory_snapshots')
    .select('*')
    .eq('user_id', userId)
    .eq('snapshot_date', date)
    .single();

  return data ?? null;
}

export async function getRecentMemorySnapshots(
  supabase: SupabaseClient,
  userId: string,
  days = 7
): Promise<MemorySnapshot[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('memory_snapshots')
    .select('*')
    .eq('user_id', userId)
    .gte('snapshot_date', since.toISOString().split('T')[0])
    .order('snapshot_date', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// ── Desktop Observer Queries ─────────────────────────────────

/**
 * Fetch recent desktop observer context chunks, optionally filtered by activity type.
 * Used by briefing generation and operations to include desktop-captured data
 * (e.g. WhatsApp messages, iMessage, Slack desktop) alongside OAuth-integrated sources.
 */
export async function getDesktopObserverChunks(
  supabase: SupabaseClient,
  userId: string,
  opts?: {
    activityTypes?: string[];
    after?: string;
    before?: string;
    minImportance?: ContextImportance;
    limit?: number;
  }
): Promise<ContextChunk[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('context_chunks')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'desktop_observer')
    .order('occurred_at', { ascending: false });

  if (opts?.after) query = query.gte('occurred_at', opts.after);
  if (opts?.before) query = query.lte('occurred_at', opts.before);
  if (opts?.minImportance) {
    const importanceOrder: ContextImportance[] = ['critical', 'important', 'background', 'noise'];
    const minIdx = importanceOrder.indexOf(opts.minImportance);
    const allowed = importanceOrder.slice(0, minIdx + 1);
    query = query.in('importance', allowed);
  }
  query = query.limit(opts?.limit ?? 50);

  const { data, error } = await query;
  if (error) throw error;

  let chunks = (data ?? []) as ContextChunk[];

  // Client-side filter for activity types (stored in source_ref.activity_type)
  if (opts?.activityTypes?.length) {
    chunks = chunks.filter((c) => {
      const activityType = (c.source_ref as Record<string, unknown>)?.activity_type as string | undefined;
      return activityType && opts.activityTypes!.includes(activityType);
    });
  }

  return chunks;
}

// ── Semantic Search ──────────────────────────────────────────

export async function matchContextChunks(
  supabase: SupabaseClient,
  params: {
    queryEmbedding: number[];
    userId: string;
    threshold?: number;
    limit?: number;
    filterType?: ContextChunkType;
    filterImportance?: ContextImportance;
    filterAfter?: string;
  }
): Promise<Array<ContextChunk & { similarity: number }>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('match_context_chunks', {
    query_embedding: params.queryEmbedding,
    match_user_id: params.userId,
    match_threshold: params.threshold ?? 0.72,
    match_count: params.limit ?? 20,
    filter_type: params.filterType ?? null,
    filter_importance: params.filterImportance ?? null,
    filter_after: params.filterAfter ?? null,
  });

  if (error) throw error;
  return data ?? [];
}
