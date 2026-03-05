import { WebClient } from '@slack/web-api';
import { getAccessToken } from './nango';

export async function getSlackClient(userId: string) {
  const accessToken = await getAccessToken(userId, 'slack');
  return new WebClient(accessToken);
}

export interface ParsedSlackMessage {
  id: string;
  channelId: string;
  from: string;
  fromName: string;
  text: string;
  date: string;
  threadTs: string | null;
}

export async function fetchRecentDMs(
  userId: string,
  limit = 10
): Promise<ParsedSlackMessage[]> {
  const client = await getSlackClient(userId);

  const conversations = await client.conversations.list({ types: 'im' });
  const dms = conversations.channels ?? [];

  // Build a user ID to display name map
  const userMap = new Map<string, string>();
  try {
    const usersResponse = await client.users.list({});
    for (const member of usersResponse.members ?? []) {
      if (member.id && (member.real_name || member.name)) {
        userMap.set(member.id, member.real_name ?? member.name ?? member.id);
      }
    }
  } catch {
    // users:read scope may not be available; fall back to IDs
  }

  const messages: ParsedSlackMessage[] = [];

  for (const dm of dms.slice(0, limit)) {
    if (!dm.id) continue;

    try {
      const history = await client.conversations.history({
        channel: dm.id,
        limit: 5,
      });

      for (const msg of history.messages ?? []) {
        if (!msg.ts || msg.subtype) continue;

        messages.push({
          id: msg.ts,
          channelId: dm.id,
          from: (msg.user as string) ?? '',
          fromName: userMap.get(msg.user ?? '') ?? (msg.user as string) ?? '',
          text: (msg.text as string) ?? '',
          date: new Date(parseFloat(msg.ts) * 1000).toISOString(),
          threadTs: (msg.thread_ts as string) ?? null,
        });
      }
    } catch {
      // Skip channels we can't access
    }
  }

  return messages;
}

export async function resolveSlackUserEmail(
  userId: string,
  slackUserId: string
): Promise<string | null> {
  try {
    const client = await getSlackClient(userId);
    const response = await client.users.info({ user: slackUserId });
    return response.user?.profile?.email ?? null;
  } catch {
    return null;
  }
}
