import { google } from 'googleapis';
import { getAccessToken, getAccessTokenByConnectionId } from './nango';

/**
 * Returns an authenticated Google Calendar client.
 * Pass nangoConnectionId when working in a multi-account context to target
 * a specific account. Without it, falls back to the user's first Calendar connection.
 */
export async function getCalendarClient(userId: string, nangoConnectionId?: string) {
  const accessToken = nangoConnectionId
    ? await getAccessTokenByConnectionId('google-calendar', nangoConnectionId)
    : await getAccessToken(userId, 'google-calendar');
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: 'v3', auth });
}

export async function getTodaysEvents(userId: string, nangoConnectionId?: string) {
  const calendar = await getCalendarClient(userId, nangoConnectionId);
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
  userId: string,
  nangoConnectionId?: string
): Promise<ParsedCalendarEvent[]> {
  const events = await getTodaysEvents(userId, nangoConnectionId);
  return events.map(parseCalendarEvent);
}

export async function getEventsForDateRange(
  userId: string,
  timeMin: Date,
  timeMax: Date,
  nangoConnectionId?: string
): Promise<ParsedCalendarEvent[]> {
  const calendar = await getCalendarClient(userId, nangoConnectionId);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 50,
  });

  return (response.data.items ?? []).map(parseCalendarEvent);
}

export async function createCalendarEvent(
  userId: string,
  event: {
    summary: string;
    description?: string;
    location?: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
    colorId?: string;
  }
): Promise<string> {
  const calendar = await getCalendarClient(userId);

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  });

  return response.data.id ?? '';
}
