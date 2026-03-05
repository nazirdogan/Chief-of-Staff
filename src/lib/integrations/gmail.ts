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
    q: 'is:unread',
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
