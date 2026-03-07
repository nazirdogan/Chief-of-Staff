import { Client } from '@microsoft/microsoft-graph-client';
import { getAccessToken } from './nango';

export async function getGraphClient(userId: string) {
  const accessToken = await getAccessToken(userId, 'microsoft');
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}

export interface ParsedOutlookMessage {
  id: string;
  conversationId: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  bodyPreview: string;
  body: string;
  date: string;
  isRead: boolean;
  isSent: boolean;
}

export interface ParsedOutlookEvent {
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

export async function fetchOutlookInbox(userId: string, maxResults = 20) {
  const client = await getGraphClient(userId);
  const response = await client
    .api('/me/mailFolders/inbox/messages')
    .select('id,subject,from,receivedDateTime,bodyPreview,isRead,conversationId')
    .top(maxResults)
    .filter("isRead eq false and inferenceClassification eq 'focused'")
    .orderby('receivedDateTime DESC')
    .get();

  return (response.value ?? []) as Array<Record<string, unknown>>;
}

export async function fetchOutlookMessageForProcessing(
  userId: string,
  messageId: string
) {
  const client = await getGraphClient(userId);
  // Fetch full message body for AI processing — never store raw body
  const response = await client
    .api(`/me/messages/${messageId}`)
    .select(
      'id,subject,from,toRecipients,receivedDateTime,body,bodyPreview,conversationId,parentFolderId'
    )
    .get();

  return response as Record<string, unknown>;
}

export async function fetchOutlookSentMessages(
  userId: string,
  maxResults = 20
) {
  const client = await getGraphClient(userId);
  const response = await client
    .api('/me/mailFolders/sentItems/messages')
    .select(
      'id,subject,from,toRecipients,receivedDateTime,body,bodyPreview,conversationId'
    )
    .top(maxResults)
    .filter(`receivedDateTime ge ${new Date(Date.now() - 86400000).toISOString()}`)
    .orderby('receivedDateTime DESC')
    .get();

  return (response.value ?? []) as Array<Record<string, unknown>>;
}

/**
 * Fetch sent emails from yesterday that haven't received a reply.
 */
export async function fetchOutlookSentAwaitingReply(
  userId: string,
  maxResults = 15
): Promise<ParsedOutlookMessage[]> {
  const client = await getGraphClient(userId);
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();

  // Get sent messages from yesterday
  const sentResponse = await client
    .api('/me/mailFolders/sentItems/messages')
    .select('id,subject,from,toRecipients,receivedDateTime,bodyPreview,conversationId')
    .top(maxResults)
    .filter(`receivedDateTime ge ${twoDaysAgo} and receivedDateTime le ${yesterday}`)
    .orderby('receivedDateTime DESC')
    .get();

  const sentMessages = (sentResponse.value ?? []) as Array<Record<string, unknown>>;
  const awaiting: ParsedOutlookMessage[] = [];

  for (const sent of sentMessages) {
    const conversationId = sent.conversationId as string;
    if (!conversationId) continue;

    // Check if there's a reply in the inbox for this conversation
    const replyResponse = await client
      .api('/me/mailFolders/inbox/messages')
      .select('id')
      .top(1)
      .filter(`conversationId eq '${conversationId}' and receivedDateTime ge ${yesterday}`)
      .get();

    const replies = (replyResponse.value ?? []) as Array<Record<string, unknown>>;
    if (replies.length === 0) {
      awaiting.push(parseOutlookMessage(sent, true));
    }
  }

  return awaiting;
}

export function parseOutlookMessage(
  message: Record<string, unknown>,
  isSent = false
): ParsedOutlookMessage {
  const from = message.from as
    | { emailAddress?: { address?: string; name?: string } }
    | undefined;
  const toRecipients = (message.toRecipients ?? []) as Array<{
    emailAddress?: { address?: string; name?: string };
  }>;
  const body = message.body as { content?: string } | undefined;

  return {
    id: (message.id as string) ?? '',
    conversationId: (message.conversationId as string) ?? '',
    from: from?.emailAddress?.address ?? '',
    fromName: from?.emailAddress?.name ?? '',
    to: toRecipients.map((r) => r.emailAddress?.address ?? '').join(', '),
    subject: (message.subject as string) ?? '',
    bodyPreview: (message.bodyPreview as string) ?? '',
    body: body?.content ?? (message.bodyPreview as string) ?? '',
    date: (message.receivedDateTime as string) ?? '',
    isRead: (message.isRead as boolean) ?? false,
    isSent,
  };
}

export async function getTodaysOutlookEvents(
  userId: string
): Promise<ParsedOutlookEvent[]> {
  const client = await getGraphClient(userId);
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const response = await client
    .api('/me/calendarView')
    .query({
      startDateTime: now.toISOString(),
      endDateTime: endOfDay.toISOString(),
    })
    .select(
      'id,subject,body,start,end,location,attendees,organizer,isAllDay,onlineMeeting'
    )
    .top(20)
    .orderby('start/dateTime')
    .get();

  const events = (response.value ?? []) as Array<Record<string, unknown>>;
  return events.map(parseOutlookEvent);
}

function parseOutlookEvent(
  event: Record<string, unknown>
): ParsedOutlookEvent {
  const start = event.start as { dateTime?: string; timeZone?: string } | undefined;
  const end = event.end as { dateTime?: string; timeZone?: string } | undefined;
  const location = event.location as { displayName?: string } | undefined;
  const organizer = event.organizer as {
    emailAddress?: { address?: string; name?: string };
  } | undefined;
  const onlineMeeting = event.onlineMeeting as { joinUrl?: string } | undefined;

  const rawAttendees = (event.attendees ?? []) as Array<{
    emailAddress?: { address?: string; name?: string };
    status?: { response?: string };
  }>;

  const attendees = rawAttendees.map((a) => ({
    email: a.emailAddress?.address ?? '',
    name: a.emailAddress?.name ?? a.emailAddress?.address ?? '',
    responseStatus: a.status?.response ?? 'none',
  }));

  return {
    id: (event.id as string) ?? '',
    summary: (event.subject as string) ?? '(No title)',
    description: ((event.body as { content?: string })?.content) ?? '',
    start: start?.dateTime ?? '',
    end: end?.dateTime ?? '',
    location: location?.displayName ?? '',
    meetingLink: onlineMeeting?.joinUrl ?? '',
    attendees,
    organizer: {
      email: organizer?.emailAddress?.address ?? '',
      name: organizer?.emailAddress?.name ?? organizer?.emailAddress?.address ?? '',
    },
    isAllDay: (event.isAllDay as boolean) ?? false,
  };
}
