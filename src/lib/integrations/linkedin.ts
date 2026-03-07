import { getAccessToken } from './nango';

// LinkedIn Messages integration via Nango 'linkedin' provider.
// Uses LinkedIn Messaging API to fetch unread DMs.
// Read-only: we never send messages without explicit user confirmation.

export interface ParsedLinkedInMessage {
  id: string;
  from: string;
  fromName: string;
  fromProfileUrl: string;
  subject: string;
  body: string;
  date: string;
  isUnread: boolean;
  conversationId: string;
}

export async function getLinkedInClient(userId: string): Promise<{
  headers: Record<string, string>;
  baseUrl: string;
}> {
  const accessToken = await getAccessToken(userId, 'linkedin');
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202401',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    baseUrl: 'https://api.linkedin.com/v2',
  };
}

/**
 * Fetches unread LinkedIn conversations (messages) for the authenticated user.
 * Uses the LinkedIn Messaging API v2.
 */
export async function fetchUnreadLinkedInMessages(
  userId: string,
  limit = 20
): Promise<ParsedLinkedInMessage[]> {
  const { headers, baseUrl } = await getLinkedInClient(userId);

  // Fetch conversation threads (unread first)
  const convoResponse = await fetch(
    `${baseUrl}/conversations?keyVersion=LEGACY_INBOX&q=participants&start=0&count=${limit}`,
    { headers }
  );

  if (!convoResponse.ok) {
    throw new Error(`LinkedIn conversations error: ${convoResponse.status}`);
  }

  const convoData = (await convoResponse.json()) as {
    elements?: Array<Record<string, unknown>>;
  };

  const conversations = convoData.elements ?? [];
  const messages: ParsedLinkedInMessage[] = [];

  for (const convo of conversations.slice(0, limit)) {
    const convoId = (convo.entityUrn as string)?.split(':').pop() ?? '';
    const unreadCount = (convo.unreadCount as number) ?? 0;
    const lastActivity = (convo.lastActivityAt as number) ?? Date.now();

    // Get the most recent message in this conversation
    const msgResponse = await fetch(
      `${baseUrl}/conversations/${convoId}/events?keyVersion=LEGACY_INBOX&q=participants&start=0&count=3`,
      { headers }
    );

    if (!msgResponse.ok) continue;

    const msgData = (await msgResponse.json()) as {
      elements?: Array<Record<string, unknown>>;
    };

    for (const event of (msgData.elements ?? []).slice(0, 1)) {
      messages.push(parseLinkedInMessage(event, convoId, unreadCount > 0, lastActivity));
    }
  }

  return messages;
}

export function parseLinkedInMessage(
  raw: Record<string, unknown>,
  conversationId: string,
  isUnread: boolean,
  fallbackDate: number
): ParsedLinkedInMessage {
  const actor = raw.from as {
    com_linkedin_voyager_messaging_MessagingMember?: {
      miniProfile?: {
        publicIdentifier?: string;
        firstName?: string;
        lastName?: string;
      };
    };
  } | undefined;

  const miniProfile =
    actor?.['com_linkedin_voyager_messaging_MessagingMember']?.miniProfile;
  const firstName = miniProfile?.firstName ?? '';
  const lastName = miniProfile?.lastName ?? '';
  const fromName = `${firstName} ${lastName}`.trim() || 'LinkedIn Member';
  const profileId = miniProfile?.publicIdentifier ?? '';
  const fromProfileUrl = profileId
    ? `https://www.linkedin.com/in/${profileId}`
    : '';

  const messageBody = raw.eventContent as {
    com_linkedin_voyager_messaging_event_MessageEvent?: {
      attributedBody?: { text?: string };
    };
  } | undefined;

  const bodyText =
    messageBody?.['com_linkedin_voyager_messaging_event_MessageEvent']
      ?.attributedBody?.text ?? '';

  const createdAt = (raw.createdAt as number) ?? fallbackDate;

  return {
    id: (raw.entityUrn as string)?.split(':').pop() ?? '',
    from: fromProfileUrl || profileId,
    fromName,
    fromProfileUrl,
    subject: `LinkedIn message from ${fromName}`,
    body: bodyText,
    date: new Date(createdAt).toISOString(),
    isUnread,
    conversationId,
  };
}
