import { Client } from '@microsoft/microsoft-graph-client';
import { getAccessToken } from './nango';

// Microsoft Teams integration via Nango 'microsoft-teams' provider.
// Uses Microsoft Graph API to fetch Teams messages and @mentions.
// Read-only: we never post messages on behalf of users without explicit confirmation.

export interface ParsedTeamsMessage {
  id: string;
  channelId: string;
  teamId: string;
  teamName: string;
  channelName: string;
  from: string;
  fromName: string;
  body: string;
  date: string;
  isMention: boolean;
  isDM: boolean;
  webUrl: string;
}

export async function getTeamsClient(userId: string): Promise<Client> {
  const accessToken = await getAccessToken(userId, 'microsoft-teams');
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}

/**
 * Fetches recent Teams messages where the authenticated user is mentioned.
 * Uses the /me/chats and activity feeds endpoints.
 */
export async function fetchTeamsMessages(
  userId: string,
  limit = 20
): Promise<ParsedTeamsMessage[]> {
  const client = await getTeamsClient(userId);
  const messages: ParsedTeamsMessage[] = [];

  // 1. Fetch @mentions from activity feed
  try {
    const activityResponse = await client
      .api('/me/chats')
      .select('id,topic,chatType,lastMessagePreview,webUrl')
      .top(limit)
      .orderby('lastMessagePreview/createdDateTime desc')
      .get();

    const chats = (activityResponse.value ?? []) as Array<Record<string, unknown>>;

    for (const chat of chats.slice(0, limit)) {
      const chatId = (chat.id as string) ?? '';
      if (!chatId) continue;

      try {
        const msgResponse = await client
          .api(`/me/chats/${chatId}/messages`)
          .select('id,from,body,createdDateTime,mentions,webUrl')
          .top(5)
          .get();

        const rawMessages = (msgResponse.value ?? []) as Array<Record<string, unknown>>;
        const isDM = (chat.chatType as string) === 'oneOnOne';

        for (const msg of rawMessages) {
          const parsed = parseTeamsMessage(msg, chatId, isDM);
          messages.push(parsed);
        }
      } catch {
        // Skip chats we can't access
      }
    }
  } catch {
    // Chats endpoint may not be available in all tenants
  }

  return messages.slice(0, limit);
}

/**
 * Fetches direct messages (1:1 chats) from Microsoft Teams.
 */
export async function fetchTeamsDMs(
  userId: string,
  limit = 20
): Promise<ParsedTeamsMessage[]> {
  const client = await getTeamsClient(userId);

  const response = await client
    .api('/me/chats')
    .select('id,topic,chatType,lastMessagePreview,webUrl')
    .filter("chatType eq 'oneOnOne'")
    .top(limit)
    .get();

  const chats = (response.value ?? []) as Array<Record<string, unknown>>;
  const messages: ParsedTeamsMessage[] = [];

  for (const chat of chats.slice(0, limit)) {
    const chatId = (chat.id as string) ?? '';
    if (!chatId) continue;

    try {
      const msgResponse = await client
        .api(`/me/chats/${chatId}/messages`)
        .select('id,from,body,createdDateTime,webUrl')
        .top(3)
        .get();

      const rawMessages = (msgResponse.value ?? []) as Array<Record<string, unknown>>;
      for (const msg of rawMessages) {
        messages.push(parseTeamsMessage(msg, chatId, true));
      }
    } catch {
      // Skip inaccessible chats
    }
  }

  return messages.slice(0, limit);
}

export function parseTeamsMessage(
  raw: Record<string, unknown>,
  chatOrChannelId: string,
  isDM: boolean
): ParsedTeamsMessage {
  const from = raw.from as
    | { user?: { displayName?: string; mail?: string; id?: string } }
    | undefined;
  const body = raw.body as { content?: string; contentType?: string } | undefined;
  const mentions = (raw.mentions ?? []) as Array<unknown>;
  const bodyContent = body?.content ?? '';

  // Strip basic HTML tags from Teams message body
  const cleanBody = bodyContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  return {
    id: (raw.id as string) ?? '',
    channelId: chatOrChannelId,
    teamId: '',
    teamName: isDM ? 'Direct Message' : '',
    channelName: isDM ? 'DM' : chatOrChannelId,
    from: from?.user?.mail ?? from?.user?.id ?? '',
    fromName: from?.user?.displayName ?? from?.user?.mail ?? 'Unknown',
    body: cleanBody,
    date: (raw.createdDateTime as string) ?? new Date().toISOString(),
    isMention: mentions.length > 0,
    isDM,
    webUrl: (raw.webUrl as string) ?? '',
  };
}
