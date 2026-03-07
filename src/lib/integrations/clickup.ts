import { getAccessToken } from './nango';

// ClickUp integration via Nango 'clickup' provider.
// Fetches tasks assigned to the authenticated user.

export interface ParsedClickUpTask {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  spaceId: string;
  spaceName: string;
  listId: string;
  listName: string;
  folderId: string;
  folderName: string;
  assigneeEmail: string;
  assigneeName: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
}

export async function getClickUpClient(userId: string): Promise<{
  headers: Record<string, string>;
  baseUrl: string;
}> {
  const accessToken = await getAccessToken(userId, 'clickup');
  return {
    headers: {
      Authorization: accessToken,
      'Content-Type': 'application/json',
    },
    baseUrl: 'https://api.clickup.com/api/v2',
  };
}

/**
 * Fetches ClickUp tasks assigned to the authenticated user across all teams.
 */
export async function fetchAssignedClickUpTasks(
  userId: string,
  limit = 50
): Promise<ParsedClickUpTask[]> {
  const { headers, baseUrl } = await getClickUpClient(userId);

  // Get teams (workspaces) the user belongs to
  const teamsResponse = await fetch(`${baseUrl}/team`, { headers });
  if (!teamsResponse.ok) {
    throw new Error(`ClickUp /team error: ${teamsResponse.status}`);
  }

  const teamsData = (await teamsResponse.json()) as {
    teams?: Array<{ id?: string; name?: string }>;
  };

  const tasks: ParsedClickUpTask[] = [];

  for (const team of teamsData.teams ?? []) {
    const teamId = team.id ?? '';
    if (!teamId) continue;

    const params = new URLSearchParams({
      assignees: 'me',
      include_closed: 'false',
      subtasks: 'true',
      page: '0',
    });

    const taskResponse = await fetch(
      `${baseUrl}/team/${teamId}/task?${params}`,
      { headers }
    );

    if (!taskResponse.ok) continue;

    const taskData = (await taskResponse.json()) as {
      tasks?: Array<Record<string, unknown>>;
    };

    for (const task of taskData.tasks ?? []) {
      tasks.push(parseClickUpTask(task));
      if (tasks.length >= limit) break;
    }

    if (tasks.length >= limit) break;
  }

  return tasks.slice(0, limit);
}

export function parseClickUpTask(raw: Record<string, unknown>): ParsedClickUpTask {
  const status = raw.status as { status?: string } | undefined;
  const priority = raw.priority as { priority?: string } | undefined;
  const space = raw.space as { id?: string; name?: string } | undefined;
  const list = raw.list as { id?: string; name?: string } | undefined;
  const folder = raw.folder as { id?: string; name?: string } | undefined;

  const assignees = (raw.assignees ?? []) as Array<{
    email?: string;
    username?: string;
  }>;
  const firstAssignee = assignees[0];

  const dueDateMs = raw.due_date ? parseInt(raw.due_date as string, 10) : null;
  const dueDate = dueDateMs ? new Date(dueDateMs).toISOString() : null;

  const createdMs = raw.date_created ? parseInt(raw.date_created as string, 10) : Date.now();
  const updatedMs = raw.date_updated ? parseInt(raw.date_updated as string, 10) : Date.now();

  return {
    id: (raw.id as string) ?? '',
    name: (raw.name as string) ?? '',
    description: (raw.description as string) ?? '',
    status: status?.status ?? 'open',
    priority: priority?.priority ?? 'normal',
    spaceId: space?.id ?? '',
    spaceName: space?.name ?? '',
    listId: list?.id ?? '',
    listName: list?.name ?? '',
    folderId: folder?.id ?? '',
    folderName: folder?.name ?? '',
    assigneeEmail: firstAssignee?.email ?? '',
    assigneeName: firstAssignee?.username ?? '',
    dueDate,
    createdAt: new Date(createdMs).toISOString(),
    updatedAt: new Date(updatedMs).toISOString(),
    url: (raw.url as string) ?? '',
  };
}
