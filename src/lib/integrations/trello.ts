import { getAccessToken } from './nango';

// Trello integration via Nango 'trello' provider.
// Fetches cards assigned to the authenticated user.
// Read-only: we never create or modify Trello cards without user confirmation.

export interface ParsedTrelloCard {
  id: string;
  name: string;
  description: string;
  boardName: string;
  boardId: string;
  listName: string;
  listId: string;
  dueDate: string | null;
  dueComplete: boolean;
  labels: string[];
  url: string;
  lastActivity: string;
  closed: boolean;
}

export async function getTrelloClient(userId: string): Promise<{
  token: string;
  baseUrl: string;
}> {
  const accessToken = await getAccessToken(userId, 'trello');
  return {
    token: accessToken,
    baseUrl: 'https://api.trello.com/1',
  };
}

/**
 * Fetches Trello cards assigned to the authenticated user.
 * Returns open (non-archived) cards across all boards.
 */
export async function fetchAssignedTrelloCards(
  userId: string,
  limit = 50
): Promise<ParsedTrelloCard[]> {
  const { token, baseUrl } = await getTrelloClient(userId);

  const params = new URLSearchParams({
    token,
    filter: 'open',
    fields: 'id,name,desc,idBoard,idList,due,dueComplete,labels,url,dateLastActivity,closed',
    limit: String(Math.min(limit, 1000)),
  });

  const response = await fetch(`${baseUrl}/members/me/cards?${params}`);

  if (!response.ok) {
    throw new Error(`Trello cards error: ${response.status}`);
  }

  const cards = (await response.json()) as Array<Record<string, unknown>>;

  // Resolve board and list names for context
  const boardCache = new Map<string, string>();
  const listCache = new Map<string, string>();

  const parsed: ParsedTrelloCard[] = [];

  for (const card of cards.slice(0, limit)) {
    const boardId = (card.idBoard as string) ?? '';
    const listId = (card.idList as string) ?? '';

    // Resolve board name
    if (boardId && !boardCache.has(boardId)) {
      try {
        const boardRes = await fetch(
          `${baseUrl}/boards/${boardId}?token=${token}&fields=name`
        );
        if (boardRes.ok) {
          const board = (await boardRes.json()) as { name?: string };
          boardCache.set(boardId, board.name ?? boardId);
        }
      } catch {
        boardCache.set(boardId, boardId);
      }
    }

    // Resolve list name
    if (listId && !listCache.has(listId)) {
      try {
        const listRes = await fetch(
          `${baseUrl}/lists/${listId}?token=${token}&fields=name`
        );
        if (listRes.ok) {
          const list = (await listRes.json()) as { name?: string };
          listCache.set(listId, list.name ?? listId);
        }
      } catch {
        listCache.set(listId, listId);
      }
    }

    parsed.push(
      parseTrelloCard(card, boardCache.get(boardId) ?? boardId, listCache.get(listId) ?? listId)
    );
  }

  return parsed;
}

export function parseTrelloCard(
  raw: Record<string, unknown>,
  boardName: string,
  listName: string
): ParsedTrelloCard {
  const labels = (raw.labels ?? []) as Array<{ name?: string }>;

  return {
    id: (raw.id as string) ?? '',
    name: (raw.name as string) ?? '',
    description: (raw.desc as string) ?? '',
    boardName,
    boardId: (raw.idBoard as string) ?? '',
    listName,
    listId: (raw.idList as string) ?? '',
    dueDate: (raw.due as string | null) ?? null,
    dueComplete: (raw.dueComplete as boolean) ?? false,
    labels: labels.map((l) => l.name ?? '').filter(Boolean),
    url: (raw.url as string) ?? (raw.shortUrl as string) ?? '',
    lastActivity: (raw.dateLastActivity as string) ?? new Date().toISOString(),
    closed: (raw.closed as boolean) ?? false,
  };
}
