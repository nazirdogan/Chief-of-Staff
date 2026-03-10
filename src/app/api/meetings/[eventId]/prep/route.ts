import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { generateMeetingPrep } from '@/lib/ai/agents/meeting-prep';
import { createServiceClient } from '@/lib/db/client';
import { getTodaysBriefing } from '@/lib/db/queries/briefings';
import type { MeetingPrep } from '@/lib/ai/agents/meeting-prep';

/**
 * POST /api/meetings/[eventId]/prep
 *
 * Generates a meeting prep brief on demand for a specific calendar event.
 * The result is cached back into today's briefing row so subsequent loads
 * don't re-trigger the AI call.
 *
 * Body: { event_title, start, end, description?, attendees, organizer }
 */
export const POST = withAuth(
  withRateLimit(10, '1 h', async (req: AuthenticatedRequest) => {
    try {
      // Extract eventId from URL path
      const url = new URL(req.url);
      const segments = url.pathname.split('/');
      const meetingsIdx = segments.indexOf('meetings');
      const eventId = segments[meetingsIdx + 1];

      if (!eventId) {
        return NextResponse.json(
          { error: 'Event ID is required', code: 'INVALID_INPUT' },
          { status: 400 }
        );
      }

      const userId = req.user.id;
      const body = await req.json();
      const { event_title, start, end, description, attendees, organizer } = body;

      if (!event_title || !start || !end) {
        return NextResponse.json(
          { error: 'Missing required fields: event_title, start, end', code: 'INVALID_INPUT' },
          { status: 400 }
        );
      }

      const event = {
        id: eventId,
        summary: event_title as string,
        description: (description as string) ?? '',
        start: start as string,
        end: end as string,
        attendees: (attendees as Array<{ email: string; name: string }>) ?? [],
        organizer: (organizer as { email: string; name: string }) ?? { email: '', name: '' },
      };

      const prep = await generateMeetingPrep(userId, event);

      // Cache the prep back into today's briefing row to avoid regenerating on reload
      try {
        const supabase = createServiceClient();
        const briefing = await getTodaysBriefing(supabase, userId);
        if (briefing) {
          const existing = (briefing.meeting_preps as MeetingPrep[]) ?? [];
          const updated = [
            ...existing.filter((p) => p.event_id !== eventId),
            prep,
          ];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('briefings')
            .update({ meeting_preps: updated })
            .eq('id', briefing.id);
        }
      } catch {
        // Cache write is non-fatal — prep is still returned to the client
      }

      return NextResponse.json({ prep });
    } catch (error) {
      console.error('[meetings/prep] Error generating meeting prep:', error);
      return NextResponse.json(
        { error: 'Failed to generate meeting prep', code: 'PREP_ERROR' },
        { status: 500 }
      );
    }
  })
);
