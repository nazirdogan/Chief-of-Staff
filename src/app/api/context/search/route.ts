import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { queryContext } from '@/lib/context/query-engine';
import type { ContextChunkType, ContextImportance } from '@/lib/context/types';

export const GET = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('q');
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const result = await queryContext({
      userId: req.user.id,
      query,
      filters: {
        providers: url.searchParams.get('provider')?.split(','),
        chunkTypes: url.searchParams.get('type')?.split(',') as ContextChunkType[] | undefined,
        importance: url.searchParams.get('importance')?.split(',') as ContextImportance[] | undefined,
        projects: url.searchParams.get('project')?.split(','),
        people: url.searchParams.get('person')?.split(','),
        after: url.searchParams.get('after') ?? undefined,
        before: url.searchParams.get('before') ?? undefined,
      },
      limit: parseInt(url.searchParams.get('limit') ?? '20'),
      includePatterns: url.searchParams.get('patterns') === 'true',
      includeSnapshot: url.searchParams.get('snapshot') === 'true',
    });

    return NextResponse.json({
      chunks: result.chunks.map((c) => ({
        id: c.id,
        provider: c.provider,
        type: c.chunk_type,
        title: c.title,
        summary: c.content_summary,
        importance: c.importance,
        topics: c.topics,
        projects: c.projects,
        people: c.people,
        occurred_at: c.occurred_at,
        similarity: c.similarity,
      })),
      total: result.totalMatches,
      patterns: result.patterns ?? undefined,
      snapshot: result.snapshot ?? undefined,
    });
  } catch (error) {
    return handleApiError(error);
  }
}));
