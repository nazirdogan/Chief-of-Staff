import { google } from 'googleapis';
import { getAccessToken } from './nango';

export async function getGmailClient(userId: string) {
  const accessToken = await getAccessToken(userId, 'google-mail');
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth });
}

export async function fetchInboxMessages(userId: string, maxResults = 20) {
  const gmail = await getGmailClient(userId);
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    labelIds: ['INBOX'],
    q: 'is:unread -category:promotions -category:social -category:forums -category:updates',
  });
  return response.data.messages ?? [];
}

export async function fetchMessageMetadata(userId: string, messageId: string) {
  const gmail = await getGmailClient(userId);
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'metadata',
    metadataHeaders: ['From', 'To', 'Subject', 'Date', 'Message-ID'],
  });
  return response.data;
}

export async function fetchMessageForProcessing(userId: string, messageId: string) {
  const gmail = await getGmailClient(userId);
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });
  // Returns full message — caller MUST process in memory and discard
  // Never write response.data.payload to database
  return response.data;
}

export interface ParsedGmailMessage {
  id: string;
  threadId: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  snippet: string;
  body: string;
  date: string;
  labelIds: string[];
}

function getHeader(
  headers: Array<{ name?: string | null; value?: string | null }> | undefined,
  name: string
): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function parseFromHeader(from: string): { email: string; name: string } {
  const match = from.match(/^(.+?)\s*<(.+)>$/);
  if (match) {
    return { name: match[1].replace(/^"|"$/g, '').trim(), email: match[2] };
  }
  return { name: from, email: from };
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

function extractBody(payload: {
  mimeType?: string | null;
  body?: { data?: string | null } | null;
  parts?: Array<{
    mimeType?: string | null;
    body?: { data?: string | null } | null;
    parts?: Array<{
      mimeType?: string | null;
      body?: { data?: string | null } | null;
    }>;
  }>;
}): string {
  if (payload.body?.data && payload.mimeType === 'text/plain') {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts) {
    // Prefer text/plain
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    // Fall back to nested parts
    for (const part of payload.parts) {
      if (part.parts) {
        const result = extractBody(part as typeof payload);
        if (result) return result;
      }
    }
  }

  return '';
}

/**
 * Fetch emails sent yesterday that have no reply in the thread yet.
 * Used for "Awaiting Reply" briefing section.
 */
export async function fetchSentAwaitingReply(userId: string, maxResults = 15): Promise<ParsedGmailMessage[]> {
  const gmail = await getGmailClient(userId);

  // Sent yesterday, in threads where we're waiting for a response
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    labelIds: ['SENT'],
    q: 'newer_than:2d older_than:0d',
  });

  const messageRefs = response.data.messages ?? [];
  const awaitingReply: ParsedGmailMessage[] = [];

  for (const ref of messageRefs) {
    if (!ref.id || !ref.threadId) continue;

    // Check thread — if the last message in the thread is ours, it's awaiting reply
    const thread = await gmail.users.threads.get({
      userId: 'me',
      id: ref.threadId,
      format: 'metadata',
      metadataHeaders: ['From'],
    });

    const messages = thread.data.messages ?? [];
    if (messages.length === 0) continue;

    const lastMessage = messages[messages.length - 1];
    // If the last message in thread is from "me", we're awaiting a reply
    const isFromMe = lastMessage.labelIds?.includes('SENT') ?? false;
    if (isFromMe && lastMessage.id === ref.id) {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: ref.id,
        format: 'full',
      });
      awaitingReply.push(parseGmailMessage(fullMessage.data));
    }
  }

  return awaitingReply;
}

/**
 * Fetch emails that arrived after working hours (8pm-7am).
 * Used for "After Hours" briefing section.
 */
export async function fetchAfterHoursMessages(userId: string, maxResults = 10): Promise<ParsedGmailMessage[]> {
  const gmail = await getGmailClient(userId);

  // Get unread primary inbox messages from last 12 hours
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 30,
    labelIds: ['INBOX'],
    q: 'is:unread newer_than:1d -category:promotions -category:social -category:forums -category:updates',
  });

  const messageRefs = response.data.messages ?? [];
  const afterHours: ParsedGmailMessage[] = [];

  for (const ref of messageRefs) {
    if (!ref.id) continue;
    if (afterHours.length >= maxResults) break;

    const fullMessage = await gmail.users.messages.get({
      userId: 'me',
      id: ref.id,
      format: 'full',
    });

    const parsed = parseGmailMessage(fullMessage.data);
    const receivedDate = new Date(parsed.date);
    const hour = receivedDate.getHours();

    // After hours = 8pm to 7am
    if (hour >= 20 || hour < 7) {
      afterHours.push(parsed);
    }
  }

  return afterHours;
}

export function parseGmailMessage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message: any
): ParsedGmailMessage {
  const headers = message.payload?.headers ?? [];
  const from = getHeader(headers, 'From');
  const parsed = parseFromHeader(from);

  return {
    id: message.id ?? '',
    threadId: message.threadId ?? '',
    from: parsed.email,
    fromName: parsed.name,
    to: getHeader(headers, 'To'),
    subject: getHeader(headers, 'Subject'),
    snippet: message.snippet ?? '',
    body: extractBody(message.payload ?? {}),
    date: getHeader(headers, 'Date'),
    labelIds: message.labelIds ?? [],
  };
}
