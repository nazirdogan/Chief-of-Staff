import { getAccessToken } from './nango';

// Calendly integration via Nango 'calendly' provider.
// Fetches upcoming scheduled events (bookings) for the authenticated user.
// Read-only: we never create or modify Calendly events on behalf of users.

export interface ParsedCalendlyBooking {
  id: string;
  name: string;
  guestEmail: string;
  guestName: string;
  startTime: string;
  endTime: string;
  location: string;
  eventType: string;
  status: string;
  cancelUrl: string;
  rescheduleUrl: string;
}

export async function getCalendlyClient(userId: string): Promise<{
  headers: Record<string, string>;
  baseUrl: string;
}> {
  const accessToken = await getAccessToken(userId, 'calendly');
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    baseUrl: 'https://api.calendly.com',
  };
}

/**
 * Retrieves the authenticated user's Calendly URI (required for event queries).
 */
async function getCalendlyUserUri(
  headers: Record<string, string>,
  baseUrl: string
): Promise<string> {
  const response = await fetch(`${baseUrl}/users/me`, { headers });
  if (!response.ok) {
    throw new Error(`Calendly /users/me error: ${response.status}`);
  }
  const data = (await response.json()) as { resource?: { uri?: string } };
  return data.resource?.uri ?? '';
}

/**
 * Fetches upcoming scheduled events for the authenticated Calendly user.
 * Returns only active (non-cancelled) future bookings.
 */
export async function fetchUpcomingBookings(
  userId: string,
  maxResults = 20
): Promise<ParsedCalendlyBooking[]> {
  const { headers, baseUrl } = await getCalendlyClient(userId);
  const userUri = await getCalendlyUserUri(headers, baseUrl);

  const now = new Date().toISOString();
  const params = new URLSearchParams({
    user: userUri,
    status: 'active',
    min_start_time: now,
    count: String(Math.min(maxResults, 100)),
    sort: 'start_time:asc',
  });

  const response = await fetch(`${baseUrl}/scheduled_events?${params}`, { headers });
  if (!response.ok) {
    throw new Error(`Calendly scheduled_events error: ${response.status}`);
  }

  const data = (await response.json()) as {
    collection?: Array<Record<string, unknown>>;
  };

  const events = data.collection ?? [];
  const bookings: ParsedCalendlyBooking[] = [];

  // Fetch invitees for each event to get guest info
  for (const event of events.slice(0, maxResults)) {
    const eventUri = (event.uri as string) ?? '';
    const eventUuid = eventUri.split('/').pop() ?? '';

    let guestEmail = '';
    let guestName = '';

    try {
      const inviteesRes = await fetch(
        `${baseUrl}/scheduled_events/${eventUuid}/invitees?count=1`,
        { headers }
      );
      if (inviteesRes.ok) {
        const inviteesData = (await inviteesRes.json()) as {
          collection?: Array<{ email?: string; name?: string }>;
        };
        const first = inviteesData.collection?.[0];
        guestEmail = first?.email ?? '';
        guestName = first?.name ?? '';
      }
    } catch {
      // Guest details unavailable — continue without them
    }

    bookings.push(parseCalendlyBooking(event, guestEmail, guestName));
  }

  return bookings;
}

export function parseCalendlyBooking(
  raw: Record<string, unknown>,
  guestEmail = '',
  guestName = ''
): ParsedCalendlyBooking {
  const location = raw.location as
    | { type?: string; location?: string; join_url?: string }
    | undefined;

  const locationStr =
    location?.join_url ?? location?.location ?? location?.type ?? '';

  return {
    id: (raw.uri as string)?.split('/').pop() ?? '',
    name: (raw.name as string) ?? 'Scheduled Meeting',
    guestEmail,
    guestName,
    startTime: (raw.start_time as string) ?? '',
    endTime: (raw.end_time as string) ?? '',
    location: locationStr,
    eventType: (raw.event_type as string)?.split('/').pop() ?? '',
    status: (raw.status as string) ?? 'active',
    cancelUrl: (raw.cancel_url as string) ?? '',
    rescheduleUrl: (raw.reschedule_url as string) ?? '',
  };
}
