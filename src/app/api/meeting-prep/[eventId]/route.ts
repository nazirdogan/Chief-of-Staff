import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { getMeetingPrep } from '@/lib/db/queries/meeting-preps';

/**
 * GET /api/meeting-prep/[eventId]
 *
 * Fetch a stored meeting prep by event ID.
 * Returns { data: MeetingPrepRow } or { data: null } if not found.
 */
export const GET = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const eventId = segments[segments.indexOf('meeting-prep') + 1];

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const prep = await getMeetingPrep(supabase, req.user.id, eventId);

    return NextResponse.json({ data: prep });
  } catch (error) {
    return handleApiError(error);
  }
}));

/**
 * POST /api/meeting-prep/[eventId]
 *
 * Generate a meeting prep on demand for a calendar event.
 *
 * Body: {
 *   event_title: string,
 *   start: string (ISO),
 *   end: string (ISO),
 *   description?: string,
 *   attendees?: Array<{ email: string; name: string }>,
 *   organizer?: { email: string; name: string },
 * }
 */
export const POST = withAuth(withRateLimit(5, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const eventId = segments[segments.indexOf('meeting-prep') + 1];

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { event_title, start, end, description, attendees, organizer } = body as {
      event_title?: string;
      start?: string;
      end?: string;
      description?: string;
      attendees?: Array<{ email: string; name: string }>;
      organizer?: { email: string; name: string };
    };

    if (!event_title || !start || !end) {
      return NextResponse.json(
        { error: 'Missing required fields: event_title, start, end', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const { generateMeetingPrep } = await import('@/lib/ai/agents/meeting-prep');
    const prep = await generateMeetingPrep(req.user.id, {
      id: eventId,
      summary: event_title,
      description: description ?? '',
      start,
      end,
      attendees: attendees ?? [],
      organizer: organizer ?? { email: '', name: '' },
    });

    return NextResponse.json({ data: prep });
  } catch (error) {
    console.error('[meeting-prep] Generation failed:', error);
    return handleApiError(error);
  }
}));
