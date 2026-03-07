import { getAccessToken } from './nango';

// Twitter/X DMs integration via Nango 'twitter' provider.
// Uses Twitter API v2 to fetch unread Direct Messages.
// Read-only: we never send tweets or DMs without explicit user confirmation.

export interface ParsedTwitterDM {
  id: string;
  from: string;
  fromName: string;
  fromUsername: string;
  body: string;
  date: string;
  conversationId: string;
  mediaUrls: string[];
}

export async function getTwitterClient(userId: string): Promise<{
  headers: Record<string, string>;
  baseUrl: string;
}> {
  const accessToken = await getAccessToken(userId, 'twitter');
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    baseUrl: 'https://api.twitter.com/2',
  };
}

/**
 * Fetches unread Direct Messages from Twitter/X API v2.
 * Uses the dm_conversations endpoint with user context.
 */
export async function fetchUnreadTwitterDMs(
  userId: string,
  limit = 20
): Promise<ParsedTwitterDM[]> {
  const { headers, baseUrl } = await getTwitterClient(userId);

  // Get authenticated user ID first
  const meResponse = await fetch(`${baseUrl}/users/me?user.fields=id,name,username`, {
    headers,
  });

  if (!meResponse.ok) {
    throw new Error(`Twitter /users/me error: ${meResponse.status}`);
  }

  const meData = (await meResponse.json()) as { data?: { id?: string } };
  const twitterUserId = meData.data?.id ?? '';

  if (!twitterUserId) {
    throw new Error('Could not determine Twitter user ID');
  }

  // Fetch DM conversations
  const params = new URLSearchParams({
    'dm_event.fields': 'id,text,created_at,sender_id,attachments',
    'user.fields': 'id,name,username',
    'media.fields': 'url,type',
    expansions: 'sender_id,attachments.media_keys',
    max_results: String(Math.min(limit, 100)),
  });

  const dmResponse = await fetch(
    `${baseUrl}/dm_conversations/with/${twitterUserId}/dm_events?${params}`,
    { headers }
  );

  if (!dmResponse.ok) {
    // Try the alternative endpoint for OAuth 2.0 user context
    const altResponse = await fetch(
      `${baseUrl}/users/${twitterUserId}/dm_events?${params}`,
      { headers }
    );

    if (!altResponse.ok) {
      throw new Error(`Twitter DM events error: ${altResponse.status}`);
    }

    const altData = (await altResponse.json()) as {
      data?: Array<Record<string, unknown>>;
      includes?: { users?: Array<Record<string, unknown>> };
    };

    return parseTwitterDMResponse(altData, limit);
  }

  const data = (await dmResponse.json()) as {
    data?: Array<Record<string, unknown>>;
    includes?: { users?: Array<Record<string, unknown>> };
  };

  return parseTwitterDMResponse(data, limit);
}

function parseTwitterDMResponse(
  response: {
    data?: Array<Record<string, unknown>>;
    includes?: { users?: Array<Record<string, unknown>> };
  },
  limit: number
): ParsedTwitterDM[] {
  const events = response.data ?? [];
  const users = response.includes?.users ?? [];

  const userMap = new Map<string, { name: string; username: string }>();
  for (const user of users) {
    const id = user.id as string;
    if (id) {
      userMap.set(id, {
        name: (user.name as string) ?? '',
        username: (user.username as string) ?? '',
      });
    }
  }

  return events.slice(0, limit).map((event) => parseTwitterDM(event, userMap));
}

export function parseTwitterDM(
  raw: Record<string, unknown>,
  userMap: Map<string, { name: string; username: string }>
): ParsedTwitterDM {
  const senderId = (raw.sender_id as string) ?? '';
  const senderInfo = userMap.get(senderId);

  const attachments = raw.attachments as { media_keys?: string[] } | undefined;
  const mediaUrls: string[] = [];

  // Media URLs would need expansion from includes.media — simplified here
  if (attachments?.media_keys?.length) {
    mediaUrls.push(`[${attachments.media_keys.length} media attachment(s)]`);
  }

  return {
    id: (raw.id as string) ?? '',
    from: senderInfo?.username ?? senderId,
    fromName: senderInfo?.name ?? senderInfo?.username ?? senderId,
    fromUsername: senderInfo?.username ?? senderId,
    body: (raw.text as string) ?? '',
    date: (raw.created_at as string) ?? new Date().toISOString(),
    conversationId: (raw.conversation_id as string) ?? (raw.id as string) ?? '',
    mediaUrls,
  };
}
