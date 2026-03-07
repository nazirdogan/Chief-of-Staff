import { getAccessToken } from './nango';

// Monday.com integration via Nango 'monday' provider.
// Fetches items (tasks) assigned to the authenticated user.
// Uses Monday.com GraphQL API.

export interface ParsedMondayItem {
  id: string;
  name: string;
  boardName: string;
  boardId: string;
  groupName: string;
  status: string;
  dueDate: string | null;
  assigneeName: string;
  assigneeEmail: string;
  updatedAt: string;
  url: string;
}

export async function getMondayClient(userId: string): Promise<{
  headers: Record<string, string>;
  endpoint: string;
}> {
  const accessToken = await getAccessToken(userId, 'monday');
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'API-Version': '2024-01',
    },
    endpoint: 'https://api.monday.com/v2',
  };
}

async function mondayQuery<T>(
  headers: Record<string, string>,
  endpoint: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Monday.com API error: ${response.status}`);
  }

  const data = (await response.json()) as { data?: T; errors?: unknown[] };
  if (data.errors?.length) {
    throw new Error(`Monday.com GraphQL error: ${JSON.stringify(data.errors)}`);
  }

  return data.data as T;
}

/**
 * Fetches board items assigned to the authenticated Monday.com user.
 */
export async function fetchAssignedMondayItems(
  userId: string,
  limit = 50
): Promise<ParsedMondayItem[]> {
  const { headers, endpoint } = await getMondayClient(userId);

  // Get current user info
  const meData = await mondayQuery<{ me?: { id?: string; email?: string } }>(
    headers,
    endpoint,
    `query { me { id email name } }`
  );

  const userEmail = meData.me?.email ?? '';

  // Fetch boards and items assigned to this user
  const boardData = await mondayQuery<{
    boards?: Array<{
      id?: string;
      name?: string;
      items_page?: {
        items?: Array<Record<string, unknown>>;
      };
    }>;
  }>(
    headers,
    endpoint,
    `query($limit: Int) {
      boards(limit: 20, order_by: last_updated) {
        id
        name
        items_page(limit: $limit) {
          items {
            id
            name
            updated_at
            group { id title }
            column_values {
              id
              type
              text
              value
            }
          }
        }
      }
    }`,
    { limit: Math.min(limit, 100) }
  );

  const allItems: ParsedMondayItem[] = [];

  for (const board of boardData.boards ?? []) {
    const items = board.items_page?.items ?? [];
    for (const item of items) {
      const parsed = parseMondayItem(item, board.id ?? '', board.name ?? '', userEmail);
      allItems.push(parsed);
    }
  }

  return allItems.slice(0, limit);
}

export function parseMondayItem(
  raw: Record<string, unknown>,
  boardId: string,
  boardName: string,
  userEmail: string
): ParsedMondayItem {
  const group = raw.group as { id?: string; title?: string } | undefined;
  const columnValues = (raw.column_values ?? []) as Array<{
    id?: string;
    type?: string;
    text?: string;
    value?: string;
  }>;

  let status = '';
  let dueDate: string | null = null;
  let assigneeName = '';
  const assigneeEmail = userEmail;

  for (const col of columnValues) {
    if (col.type === 'status' && col.text) {
      status = col.text;
    }
    if (col.type === 'date' && col.text) {
      dueDate = col.text;
    }
    if (col.type === 'people' && col.text) {
      assigneeName = col.text.split(',')[0]?.trim() ?? '';
    }
  }

  const itemId = (raw.id as string) ?? '';

  return {
    id: itemId,
    name: (raw.name as string) ?? '',
    boardName,
    boardId,
    groupName: group?.title ?? '',
    status,
    dueDate,
    assigneeName,
    assigneeEmail,
    updatedAt: (raw.updated_at as string) ?? new Date().toISOString(),
    url: `https://monday.com/boards/${boardId}/pulses/${itemId}`,
  };
}
