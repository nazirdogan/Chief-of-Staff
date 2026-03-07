import { getAccessToken } from './nango';

// Linear integration via Nango 'linear' provider.
// Fetches issues assigned to the authenticated user.
// Uses Linear GraphQL API.

export interface ParsedLinearIssue {
  id: string;
  identifier: string;
  title: string;
  description: string;
  state: string;
  priority: string;
  priorityLabel: string;
  teamName: string;
  teamId: string;
  projectName: string;
  projectId: string;
  assigneeEmail: string;
  assigneeName: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
}

export async function getLinearClient(userId: string): Promise<{
  headers: Record<string, string>;
  endpoint: string;
}> {
  const accessToken = await getAccessToken(userId, 'linear');
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    endpoint: 'https://api.linear.app/graphql',
  };
}

async function linearQuery<T>(
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
    throw new Error(`Linear API error: ${response.status}`);
  }

  const data = (await response.json()) as { data?: T; errors?: unknown[] };
  if (data.errors?.length) {
    throw new Error(`Linear GraphQL error: ${JSON.stringify(data.errors)}`);
  }

  return data.data as T;
}

/**
 * Fetches Linear issues assigned to the authenticated user.
 * Returns open issues ordered by priority and updated time.
 */
export async function fetchAssignedLinearIssues(
  userId: string,
  limit = 50
): Promise<ParsedLinearIssue[]> {
  const { headers, endpoint } = await getLinearClient(userId);

  const data = await linearQuery<{
    viewer?: {
      assignedIssues?: {
        nodes?: Array<Record<string, unknown>>;
      };
    };
  }>(
    headers,
    endpoint,
    `query($first: Int) {
      viewer {
        assignedIssues(
          first: $first
          filter: { completedAt: { null: true }, canceledAt: { null: true } }
          orderBy: updatedAt
        ) {
          nodes {
            id
            identifier
            title
            description
            priority
            priorityLabel
            dueDate
            createdAt
            updatedAt
            url
            state { name }
            team { id name }
            project { id name }
            assignee { email name displayName }
          }
        }
      }
    }`,
    { first: Math.min(limit, 250) }
  );

  const issues = data.viewer?.assignedIssues?.nodes ?? [];
  return issues.map(parseLinearIssue);
}

export function parseLinearIssue(raw: Record<string, unknown>): ParsedLinearIssue {
  const state = raw.state as { name?: string } | undefined;
  const team = raw.team as { id?: string; name?: string } | undefined;
  const project = raw.project as { id?: string; name?: string } | null | undefined;
  const assignee = raw.assignee as {
    email?: string;
    name?: string;
    displayName?: string;
  } | undefined;

  return {
    id: (raw.id as string) ?? '',
    identifier: (raw.identifier as string) ?? '',
    title: (raw.title as string) ?? '',
    description: (raw.description as string) ?? '',
    state: state?.name ?? 'Todo',
    priority: String((raw.priority as number) ?? 0),
    priorityLabel: (raw.priorityLabel as string) ?? 'No Priority',
    teamName: team?.name ?? '',
    teamId: team?.id ?? '',
    projectName: project?.name ?? 'No Project',
    projectId: project?.id ?? '',
    assigneeEmail: assignee?.email ?? '',
    assigneeName: assignee?.displayName ?? assignee?.name ?? '',
    dueDate: (raw.dueDate as string | null) ?? null,
    createdAt: (raw.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (raw.updatedAt as string) ?? new Date().toISOString(),
    url: (raw.url as string) ?? '',
  };
}
