import { getAccessToken } from './nango';

// Asana integration via Nango 'asana' provider.
// Fetches tasks assigned to the authenticated user.
// Read-only: we never create or modify Asana tasks without user confirmation.

export interface ParsedAsanaTask {
  id: string;
  name: string;
  notes: string;
  dueOn: string | null;
  dueAt: string | null;
  projectName: string;
  projectId: string;
  assigneeEmail: string;
  assigneeName: string;
  completed: boolean;
  priority: string;
  createdAt: string;
  modifiedAt: string;
  permalink: string;
}

export async function getAsanaClient(userId: string): Promise<{
  headers: Record<string, string>;
  baseUrl: string;
}> {
  const accessToken = await getAccessToken(userId, 'asana');
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    baseUrl: 'https://app.asana.com/api/1.0',
  };
}

/**
 * Fetches tasks assigned to the authenticated Asana user.
 * Returns only incomplete tasks, ordered by due date.
 */
export async function fetchAssignedAsanaTasks(
  userId: string,
  limit = 50
): Promise<ParsedAsanaTask[]> {
  const { headers, baseUrl } = await getAsanaClient(userId);

  // Get the authenticated user's workspace
  const meResponse = await fetch(`${baseUrl}/users/me?opt_fields=gid,email,name,workspaces`, {
    headers,
  });

  if (!meResponse.ok) {
    throw new Error(`Asana /users/me error: ${meResponse.status}`);
  }

  const meData = (await meResponse.json()) as {
    data?: { gid?: string; workspaces?: Array<{ gid?: string; name?: string }> };
  };

  const workspaces = meData.data?.workspaces ?? [];
  if (workspaces.length === 0) return [];

  const workspaceGid = workspaces[0].gid ?? '';
  const userGid = meData.data?.gid ?? '';

  const params = new URLSearchParams({
    assignee: userGid,
    workspace: workspaceGid,
    completed_since: 'now',
    limit: String(Math.min(limit, 100)),
    opt_fields: 'gid,name,notes,due_on,due_at,projects.name,projects.gid,assignee.email,assignee.name,completed,created_at,modified_at,permalink_url',
  });

  const response = await fetch(`${baseUrl}/tasks?${params}`, { headers });

  if (!response.ok) {
    throw new Error(`Asana tasks error: ${response.status}`);
  }

  const data = (await response.json()) as {
    data?: Array<Record<string, unknown>>;
  };

  return (data.data ?? []).map(parseAsanaTask);
}

export function parseAsanaTask(raw: Record<string, unknown>): ParsedAsanaTask {
  const projects = (raw.projects ?? []) as Array<{ name?: string; gid?: string }>;
  const assignee = raw.assignee as { email?: string; name?: string } | undefined;

  return {
    id: (raw.gid as string) ?? '',
    name: (raw.name as string) ?? '',
    notes: (raw.notes as string) ?? '',
    dueOn: (raw.due_on as string | null) ?? null,
    dueAt: (raw.due_at as string | null) ?? null,
    projectName: projects[0]?.name ?? 'No Project',
    projectId: projects[0]?.gid ?? '',
    assigneeEmail: assignee?.email ?? '',
    assigneeName: assignee?.name ?? '',
    completed: (raw.completed as boolean) ?? false,
    priority: '', // Asana custom fields — requires separate API call
    createdAt: (raw.created_at as string) ?? new Date().toISOString(),
    modifiedAt: (raw.modified_at as string) ?? new Date().toISOString(),
    permalink: (raw.permalink_url as string) ?? '',
  };
}
