import { getAccessToken } from './nango';

// Dropbox integration via Nango 'dropbox' provider.
// Indexes documents for vector search. Never stores raw file content.
// Read-only: we never create or modify Dropbox files.

export interface ParsedDropboxFile {
  id: string;
  name: string;
  path: string;
  modifiedTime: string;
  size: number;
  isFolder: boolean;
}

export async function getDropboxClient(userId: string): Promise<{
  headers: Record<string, string>;
  contentHeaders: Record<string, string>;
}> {
  const accessToken = await getAccessToken(userId, 'dropbox');
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  return {
    headers,
    contentHeaders: {
      Authorization: `Bearer ${accessToken}`,
      'Dropbox-API-Arg': '{}',
    },
  };
}

/**
 * Lists recently modified files in Dropbox suitable for indexing.
 * Returns metadata only — content is fetched separately per file.
 */
export async function listRecentDropboxFiles(
  userId: string,
  maxResults = 30
): Promise<ParsedDropboxFile[]> {
  const { headers } = await getDropboxClient(userId);

  // List folder contents recursively (limited depth)
  const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      path: '',
      recursive: true,
      include_media_info: false,
      include_deleted: false,
      include_has_explicit_shared_members: false,
      limit: maxResults,
    }),
  });

  if (!response.ok) {
    throw new Error(`Dropbox list_folder error: ${response.status}`);
  }

  const data = (await response.json()) as {
    entries?: Array<Record<string, unknown>>;
  };

  const files = (data.entries ?? [])
    .filter(
      (e) =>
        e['.tag'] === 'file' &&
        isIndexableExtension((e.name as string) ?? '')
    )
    .slice(0, maxResults);

  return files.map(parseDropboxFile);
}

/**
 * Downloads a Dropbox file as text for AI processing.
 * Raw content is NEVER stored — caller processes in memory only.
 */
export async function downloadDropboxFileText(
  userId: string,
  path: string
): Promise<string> {
  const accessToken = await getAccessToken(userId, 'dropbox');

  const response = await fetch(
    'https://content.dropboxapi.com/2/files/download',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path }),
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Dropbox download error: ${response.status}`);
  }

  return await response.text();
}

function isIndexableExtension(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return ['txt', 'md', 'markdown', 'csv', 'json', 'rst', 'html', 'htm'].includes(ext);
}

export function parseDropboxFile(raw: Record<string, unknown>): ParsedDropboxFile {
  return {
    id: (raw.id as string) ?? '',
    name: (raw.name as string) ?? '',
    path: (raw.path_display as string) ?? (raw.path_lower as string) ?? '',
    modifiedTime:
      (raw.client_modified as string) ??
      (raw.server_modified as string) ??
      new Date().toISOString(),
    size: (raw.size as number) ?? 0,
    isFolder: (raw['.tag'] as string) === 'folder',
  };
}
