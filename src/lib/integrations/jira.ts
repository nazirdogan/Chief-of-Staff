import { getAccessToken } from './nango';

// Jira integration via Nango 'jira' provider (Atlassian OAuth 2.0).
// Fetches issues assigned to the authenticated user.
// Read-only: we never create or modify Jira issues without user confirmation.

export interface ParsedJiraIssue {
  id: string;
  key: string;
  summary: string;
  description: string;
  status: string;
  priority: string;
  issueType: string;
  projectName: string;
  projectKey: string;
  assigneeEmail: string;
  assigneeName: string;
  reporterEmail: string;
  reporterName: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
}

export async function getJiraClient(userId: string): Promise<{
  headers: Record<string, string>;
  cloudId: string;
  baseUrl: string;
}> {
  const accessToken = await getAccessToken(userId, 'jira');

  // First, get the accessible Jira cloud ID
  const resourcesResponse = await fetch(
    'https://api.atlassian.com/oauth/token/accessible-resources',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    }
  );

  if (!resourcesResponse.ok) {
    throw new Error(`Jira accessible-resources error: ${resourcesResponse.status}`);
  }

  const resources = (await resourcesResponse.json()) as Array<{
    id?: string;
    url?: string;
    name?: string;
  }>;

  if (!resources.length) {
    throw new Error('No Jira cloud instances accessible');
  }

  const cloudId = resources[0].id ?? '';
  const baseUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`;

  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    cloudId,
    baseUrl,
  };
}

/**
 * Fetches Jira issues assigned to the authenticated user.
 * Returns open (non-done) issues ordered by priority and update time.
 */
export async function fetchAssignedJiraIssues(
  userId: string,
  limit = 50
): Promise<ParsedJiraIssue[]> {
  const { headers, baseUrl } = await getJiraClient(userId);

  const jql = 'assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC';
  const fields = [
    'summary', 'description', 'status', 'priority', 'issuetype',
    'project', 'assignee', 'reporter', 'duedate', 'created', 'updated',
  ].join(',');

  const params = new URLSearchParams({
    jql,
    maxResults: String(Math.min(limit, 100)),
    fields,
  });

  const response = await fetch(`${baseUrl}/search?${params}`, { headers });

  if (!response.ok) {
    throw new Error(`Jira search error: ${response.status}`);
  }

  const data = (await response.json()) as {
    issues?: Array<Record<string, unknown>>;
    total?: number;
  };

  return (data.issues ?? []).map((issue) => parseJiraIssue(issue, baseUrl.split('/ex/jira/')[0] ?? ''));
}

export function parseJiraIssue(
  raw: Record<string, unknown>,
  atlassianDomain: string
): ParsedJiraIssue {
  const fields = raw.fields as Record<string, unknown> | undefined;
  const status = fields?.status as { name?: string } | undefined;
  const priority = fields?.priority as { name?: string } | undefined;
  const issueType = fields?.issuetype as { name?: string } | undefined;
  const project = fields?.project as { name?: string; key?: string } | undefined;
  const assignee = fields?.assignee as {
    emailAddress?: string;
    displayName?: string;
  } | undefined;
  const reporter = fields?.reporter as {
    emailAddress?: string;
    displayName?: string;
  } | undefined;

  const issueKey = (raw.key as string) ?? '';
  const issueId = (raw.id as string) ?? '';

  return {
    id: issueId,
    key: issueKey,
    summary: (fields?.summary as string) ?? '',
    description: extractJiraDescription(fields?.description),
    status: status?.name ?? 'Unknown',
    priority: priority?.name ?? 'Medium',
    issueType: issueType?.name ?? 'Task',
    projectName: project?.name ?? '',
    projectKey: project?.key ?? '',
    assigneeEmail: assignee?.emailAddress ?? '',
    assigneeName: assignee?.displayName ?? '',
    reporterEmail: reporter?.emailAddress ?? '',
    reporterName: reporter?.displayName ?? '',
    dueDate: (fields?.duedate as string | null) ?? null,
    createdAt: (fields?.created as string) ?? new Date().toISOString(),
    updatedAt: (fields?.updated as string) ?? new Date().toISOString(),
    url: `https://${atlassianDomain}/browse/${issueKey}`,
  };
}

/**
 * Extracts plain text from Jira's Atlassian Document Format (ADF).
 */
function extractJiraDescription(description: unknown): string {
  if (typeof description === 'string') return description;

  if (typeof description === 'object' && description !== null) {
    const adf = description as { content?: Array<{ content?: Array<{ text?: string }> }> };
    const texts: string[] = [];
    for (const block of adf.content ?? []) {
      for (const inline of block.content ?? []) {
        if (inline.text) texts.push(inline.text);
      }
    }
    return texts.join(' ').trim();
  }

  return '';
}
