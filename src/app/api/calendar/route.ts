import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';

// GET: List today's calendar events from connected providers
export const GET = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get('date');

    const events: Array<{
      id: string;
      summary: string;
      description: string;
      start: string;
      end: string;
      location: string;
      meetingLink: string;
      attendees: Array<{ email: string; name: string; responseStatus: string }>;
      organizer: { email: string; name: string };
      isAllDay: boolean;
      provider: string;
    }> = [];

    // Try Google Calendar
    try {
      const { getEventsForDateRange } = await import('@/lib/integrations/google-calendar');
      const targetDate = dateParam ? new Date(dateParam) : new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const gcalEvents = await getEventsForDateRange(req.user.id, startOfDay, endOfDay);
      events.push(...gcalEvents.map((e) => ({ ...e, provider: 'google_calendar' })));
    } catch {
      // Google Calendar not connected — skip
    }

    // Try Outlook Calendar
    try {
      const { getTodaysOutlookEvents } = await import('@/lib/integrations/outlook');
      const outlookEvents = await getTodaysOutlookEvents(req.user.id);
      events.push(...outlookEvents.map((e) => ({
        ...e,
        provider: 'microsoft_calendar',
      })));
    } catch {
      // Outlook not connected — skip
    }

    // Sort by start time
    events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return NextResponse.json({ events, count: events.length });
  } catch (err) {
    console.error('Failed to fetch calendar:', err);
    return NextResponse.json(
      { error: 'Failed to fetch calendar', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
}));
