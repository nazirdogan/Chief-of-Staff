import { getAccessToken } from './nango';

// GitHub integration via Nango 'github' provider.
// Fetches PR reviews requested and @mentions for the authenticated user.
// Read-only: we never create or modify GitHub resources without user confirmation.

export interface ParsedGitHubPR {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  authorLogin: string;
  authorName: string;
  repoFullName: string;
  repoUrl: string;
  url: string;
  reviewState: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  labels: string[];
}

export interface ParsedGitHubMention {
  id: number;
  type: string;
  title: string;
  body: string;
  authorLogin: string;
  repoFullName: string;
  url: string;
  createdAt: string;
}

export async function getGitHubClient(userId: string): Promise<{
  headers: Record<string, string>;
  baseUrl: string;
}> {
  const accessToken = await getAccessToken(userId, 'github');
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    baseUrl: 'https://api.github.com',
  };
}

/**
 * Fetches pull requests where the authenticated user has been requested as reviewer.
 */
export async function fetchGitHubPRReviews(
  userId: string,
  limit = 30
): Promise<ParsedGitHubPR[]> {
  const { headers, baseUrl } = await getGitHubClient(userId);

  // Get the authenticated user's login
  const meResponse = await fetch(`${baseUrl}/user`, { headers });
  if (!meResponse.ok) {
    throw new Error(`GitHub /user error: ${meResponse.status}`);
  }

  const meData = (await meResponse.json()) as { login?: string; name?: string };
  const login = meData.login ?? '';

  const searchQuery = `is:open is:pr review-requested:${login}`;
  const params = new URLSearchParams({
    q: searchQuery,
    sort: 'updated',
    order: 'desc',
    per_page: String(Math.min(limit, 100)),
  });

  const searchResponse = await fetch(`${baseUrl}/search/issues?${params}`, { headers });

  if (!searchResponse.ok) {
    throw new Error(`GitHub search error: ${searchResponse.status}`);
  }

  const searchData = (await searchResponse.json()) as {
    items?: Array<Record<string, unknown>>;
  };

  return (searchData.items ?? []).map(parseGitHubPR);
}

/**
 * Fetches recent GitHub @mentions and review comments for the authenticated user.
 */
export async function fetchGitHubMentions(
  userId: string,
  limit = 30
): Promise<ParsedGitHubMention[]> {
  const { headers, baseUrl } = await getGitHubClient(userId);

  const meResponse = await fetch(`${baseUrl}/user`, { headers });
  if (!meResponse.ok) {
    throw new Error(`GitHub /user error: ${meResponse.status}`);
  }

  const meData = (await meResponse.json()) as { login?: string };
  const login = meData.login ?? '';

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const searchQuery = `mentions:${login} updated:>=${since.split('T')[0]}`;

  const params = new URLSearchParams({
    q: searchQuery,
    sort: 'updated',
    order: 'desc',
    per_page: String(Math.min(limit, 100)),
  });

  const searchResponse = await fetch(`${baseUrl}/search/issues?${params}`, { headers });

  if (!searchResponse.ok) {
    throw new Error(`GitHub mentions search error: ${searchResponse.status}`);
  }

  const searchData = (await searchResponse.json()) as {
    items?: Array<Record<string, unknown>>;
  };

  return (searchData.items ?? []).map(parseGitHubMention);
}

export function parseGitHubPR(raw: Record<string, unknown>): ParsedGitHubPR {
  const user = raw.user as { login?: string; name?: string } | undefined;
  const repo = raw.repository_url as string | undefined;
  const repoFullName = repo?.replace('https://api.github.com/repos/', '') ?? '';
  const labels = (raw.labels ?? []) as Array<{ name?: string }>;

  return {
    id: (raw.id as number) ?? 0,
    number: (raw.number as number) ?? 0,
    title: (raw.title as string) ?? '',
    body: ((raw.body as string) ?? '').slice(0, 2000), // Truncate for safety
    state: (raw.state as string) ?? 'open',
    authorLogin: user?.login ?? '',
    authorName: user?.name ?? user?.login ?? '',
    repoFullName,
    repoUrl: `https://github.com/${repoFullName}`,
    url: (raw.html_url as string) ?? '',
    reviewState: 'review_requested',
    isDraft: (raw.draft as boolean) ?? false,
    createdAt: (raw.created_at as string) ?? new Date().toISOString(),
    updatedAt: (raw.updated_at as string) ?? new Date().toISOString(),
    labels: labels.map((l) => l.name ?? '').filter(Boolean),
  };
}

export function parseGitHubMention(raw: Record<string, unknown>): ParsedGitHubMention {
  const user = raw.user as { login?: string } | undefined;
  const repo = raw.repository_url as string | undefined;
  const repoFullName = repo?.replace('https://api.github.com/repos/', '') ?? '';

  return {
    id: (raw.id as number) ?? 0,
    type: (raw.pull_request as unknown) ? 'pull_request' : 'issue',
    title: (raw.title as string) ?? '',
    body: ((raw.body as string) ?? '').slice(0, 1000),
    authorLogin: user?.login ?? '',
    repoFullName,
    url: (raw.html_url as string) ?? '',
    createdAt: (raw.created_at as string) ?? new Date().toISOString(),
  };
}
