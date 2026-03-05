import OpenAI from 'openai';
import { createServiceClient } from '@/lib/db/client';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8191),
  });
  return response.data[0].embedding;
}

export async function semanticSearch(
  userId: string,
  query: string,
  limit = 10
): Promise<
  Array<{
    id: string;
    provider: string;
    source_id: string;
    content_summary: string;
    metadata: Record<string, unknown>;
    similarity: number;
  }>
> {
  const supabase = createServiceClient();
  const queryEmbedding = await generateEmbedding(query);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('match_document_chunks', {
    query_embedding: queryEmbedding,
    match_user_id: userId,
    match_threshold: 0.78,
    match_count: limit,
  });

  if (error) throw error;
  return data ?? [];
}
