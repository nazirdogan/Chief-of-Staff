import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { queryContext } from '@/lib/context/query-engine';
import { getContextChunksByUser } from '@/lib/db/queries/context';

export const GET = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    // Extract eventId from URL path
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const meetingsIdx = segments.indexOf('meetings');
    const eventId = segments[meetingsIdx + 1];

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const userId = req.user.id;

    // Find context chunks for this calendar event
    const eventChunks = await getContextChunksByUser(supabase, userId, {
      chunkType: 'calendar_event',
      limit: 50,
    });

    // Filter to chunks matching this event ID
    const matchingChunks = eventChunks.filter((c) => {
      const ref = c.source_ref as Record<string, unknown>;
      return (
        c.source_id === eventId ||
        ref.event_id === eventId ||
        ref.calendar_event_id === eventId
      );
    });

    if (matchingChunks.length === 0) {
      return NextResponse.json(
        { error: 'No context found for this meeting', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get related context (attendees, projects mentioned)
    const allPeople = [...new Set(matchingChunks.flatMap((c) => c.people))];
    const allProjects = [...new Set(matchingChunks.flatMap((c) => c.projects))];
    const meetingTitle = matchingChunks[0]?.title ?? 'Meeting';

    // Search for related context
    let relatedContext: Array<Record<string, unknown>> = [];
    if (meetingTitle) {
      try {
        const related = await queryContext({
          userId,
          query: meetingTitle,
          limit: 10,
          filters: {
            people: allPeople.length > 0 ? allPeople : undefined,
          },
        });
        relatedContext = related.chunks
          .filter((c) => !matchingChunks.some((m) => m.id === c.id))
          .map((c) => ({
            provider: c.provider,
            type: c.chunk_type,
            title: c.title,
            summary: c.content_summary,
            occurred_at: c.occurred_at,
            similarity: c.similarity,
          }));
      } catch {
        // Non-fatal
      }
    }

    return NextResponse.json({
      event_id: eventId,
      title: meetingTitle,
      chunks: matchingChunks.map((c) => ({
        id: c.id,
        provider: c.provider,
        title: c.title,
        summary: c.content_summary,
        importance: c.importance,
        entities: c.entities,
        topics: c.topics,
        projects: c.projects,
        people: c.people,
        occurred_at: c.occurred_at,
        source_ref: c.source_ref,
      })),
      attendees: allPeople,
      projects: allProjects,
      related_context: relatedContext,
    });
  } catch (error) {
    return handleApiError(error);
  }
}));
