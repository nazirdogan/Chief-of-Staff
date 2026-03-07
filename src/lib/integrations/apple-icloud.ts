import { getAccessToken } from './nango';

// Apple iCloud Mail + Calendar via Nango 'icloud' provider
// Nango handles Apple OAuth PKCE flow; we receive an access token valid
// for iCloud IMAP (mail) and CalDAV (calendar) APIs.

export interface ParsedICloudMessage {
  id: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  snippet: string;
  body: string;
  date: string;
}

export interface ParsedICloudEvent {
  id: string;
  summary: string;
  description: string;
  start: string;
  end: string;
  location: string;
  attendees: Array<{ email: string; name: string }>;
  isAllDay: boolean;
}

/**
 * Returns an Authorization header value using the Nango-managed iCloud token.
 * iCloud REST endpoints accept Bearer tokens obtained via Apple OAuth.
 */
export async function getICloudAuthHeader(userId: string): Promise<string> {
  const accessToken = await getAccessToken(userId, 'icloud');
  return `Bearer ${accessToken}`;
}

/**
 * Fetches unread iCloud Mail messages via the iCloud Mail REST API.
 * Raw message bodies are NEVER stored; caller processes in memory only.
 */
export async function fetchICloudInboxMessages(
  userId: string,
  maxResults = 20
): Promise<ParsedICloudMessage[]> {
  const authHeader = await getICloudAuthHeader(userId);

  // iCloud Mail REST endpoint (requires Apple Business Manager account or personal iCloud)
  const response = await fetch(
    `https://p68-mailws.icloud.com/wm/mail/folder/INBOX/messages?limit=${maxResults}&unread=true`,
    {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`iCloud Mail API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    messages?: Array<Record<string, unknown>>;
  };

  return (data.messages ?? []).slice(0, maxResults).map(parseICloudMessage);
}

/**
 * Fetches upcoming iCloud Calendar events via CalDAV-based REST API.
 * Returns only the next 7 days of events.
 */
export async function fetchICloudCalendarEvents(
  userId: string,
  maxResults = 20
): Promise<ParsedICloudEvent[]> {
  const authHeader = await getICloudAuthHeader(userId);
  const now = new Date().toISOString();
  const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const response = await fetch(
    `https://caldav.icloud.com/events?start=${encodeURIComponent(now)}&end=${encodeURIComponent(weekLater)}&limit=${maxResults}`,
    {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`iCloud Calendar API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    events?: Array<Record<string, unknown>>;
  };

  return (data.events ?? []).slice(0, maxResults).map(parseICloudEvent);
}

export function parseICloudMessage(
  raw: Record<string, unknown>
): ParsedICloudMessage {
  const fromAddress = raw.from as { address?: string; name?: string } | string | undefined;
  const fromEmail = typeof fromAddress === 'string'
    ? fromAddress
    : (fromAddress?.address ?? '');
  const fromName = typeof fromAddress === 'object' && fromAddress !== null
    ? (fromAddress.name ?? fromEmail)
    : fromEmail;

  return {
    id: (raw.uid as string) ?? (raw.id as string) ?? '',
    from: fromEmail,
    fromName,
    to: (raw.to as string) ?? '',
    subject: (raw.subject as string) ?? '(No subject)',
    snippet: ((raw.preview ?? raw.snippet) as string) ?? '',
    // body is only fetched per-message when needed — never stored
    body: (raw.body as string) ?? ((raw.preview ?? raw.snippet) as string) ?? '',
    date: (raw.date as string) ?? new Date().toISOString(),
  };
}

export function parseICloudEvent(
  raw: Record<string, unknown>
): ParsedICloudEvent {
  const attendeesRaw = (raw.attendees ?? []) as Array<{
    email?: string;
    name?: string;
    cn?: string;
  }>;

  return {
    id: (raw.uid as string) ?? (raw.id as string) ?? '',
    summary: (raw.summary as string) ?? (raw.title as string) ?? '(No title)',
    description: (raw.description as string) ?? '',
    start: (raw.dtstart as string) ?? (raw.start as string) ?? '',
    end: (raw.dtend as string) ?? (raw.end as string) ?? '',
    location: (raw.location as string) ?? '',
    attendees: attendeesRaw.map((a) => ({
      email: a.email ?? '',
      name: a.name ?? a.cn ?? a.email ?? '',
    })),
    isAllDay: (raw.allDay as boolean) ?? false,
  };
}
