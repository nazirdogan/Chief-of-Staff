import { google } from 'googleapis';
import { getAccessToken } from './nango';

export async function getCalendarClient(userId: string) {
  const accessToken = await getAccessToken(userId, 'google-calendar');
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: 'v3', auth });
}

export async function getTodaysEvents(userId: string) {
  const calendar = await getCalendarClient(userId);
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 20,
  });
  return response.data.items ?? [];
}

export interface ParsedCalendarEvent {
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
}

export function parseCalendarEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: any
): ParsedCalendarEvent {
  const attendees = (event.attendees ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any) => ({
      email: a.email ?? '',
      name: a.displayName ?? a.email ?? '',
      responseStatus: a.responseStatus ?? 'needsAction',
    })
  );

  const meetingLink =
    event.hangoutLink ??
    event.conferenceData?.entryPoints?.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ep: any) => ep.entryPointType === 'video'
    )?.uri ??
    '';

  return {
    id: event.id ?? '',
    summary: event.summary ?? '(No title)',
    description: event.description ?? '',
    start: event.start?.dateTime ?? event.start?.date ?? '',
    end: event.end?.dateTime ?? event.end?.date ?? '',
    location: event.location ?? '',
    meetingLink,
    attendees,
    organizer: {
      email: event.organizer?.email ?? '',
      name: event.organizer?.displayName ?? event.organizer?.email ?? '',
    },
    isAllDay: !event.start?.dateTime,
  };
}

export async function getTodaysParsedEvents(
  userId: string
): Promise<ParsedCalendarEvent[]> {
  const events = await getTodaysEvents(userId);
  return events.map(parseCalendarEvent);
}
