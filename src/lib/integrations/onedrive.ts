import { Client } from '@microsoft/microsoft-graph-client';
import { getAccessToken } from './nango';

// OneDrive integration via Nango 'microsoft' provider (same OAuth as Outlook).
// Indexes documents for vector search. Never stores raw file content.
// Read-only: we never create or modify OneDrive files.

export interface ParsedOneDriveFile {
  id: string;
  name: string;
  path: string;
  modifiedTime: string;
  webUrl: string;
  size: number;
  mimeType: string;
}

export async function getOneDriveClient(userId: string): Promise<Client> {
  const accessToken = await getAccessToken(userId, 'microsoft');
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}

/**
 * Lists recently modified files in OneDrive suitable for indexing.
 * Returns metadata only — content is fetched separately per file.
 */
export async function listRecentOneDriveFiles(
  userId: string,
  maxResults = 30
): Promise<ParsedOneDriveFile[]> {
  const client = await getOneDriveClient(userId);

  const response = await client
    .api('/me/drive/recent')
    .select('id,name,file,folder,lastModifiedDateTime,webUrl,size,parentReference')
    .top(maxResults)
    .get();

  const items = (response.value ?? []) as Array<Record<string, unknown>>;

  return items
    .filter((item) => item.file && isIndexableMimeType((item.file as { mimeType?: string }).mimeType ?? ''))
    .slice(0, maxResults)
    .map(parseOneDriveFile);
}

/**
 * Downloads a OneDrive file as text for AI processing.
 * Raw content is NEVER stored — caller processes in memory only.
 */
export async function downloadOneDriveFileText(
  userId: string,
  fileId: string
): Promise<string> {
  const client = await getOneDriveClient(userId);

  // Get download URL first
  const response = await client
    .api(`/me/drive/items/${fileId}/content`)
    .get();

  if (typeof response === 'string') return response;

  // For Office documents, use the text format conversion endpoint
  try {
    const textResponse = await client
      .api(`/me/drive/items/${fileId}/content?format=txt`)
      .get();
    return typeof textResponse === 'string' ? textResponse : '';
  } catch {
    return '';
  }
}

function isIndexableMimeType(mimeType: string): boolean {
  return (
    mimeType.includes('text/') ||
    mimeType.includes('application/vnd.openxmlformats') ||
    mimeType.includes('application/msword') ||
    mimeType.includes('application/vnd.ms-') ||
    mimeType === 'application/pdf'
  );
}

export function parseOneDriveFile(raw: Record<string, unknown>): ParsedOneDriveFile {
  const file = raw.file as { mimeType?: string } | undefined;

  return {
    id: (raw.id as string) ?? '',
    name: (raw.name as string) ?? '',
    path: ((raw.parentReference as { path?: string })?.path ?? '') + '/' + ((raw.name as string) ?? ''),
    modifiedTime: (raw.lastModifiedDateTime as string) ?? new Date().toISOString(),
    webUrl: (raw.webUrl as string) ?? '',
    size: (raw.size as number) ?? 0,
    mimeType: file?.mimeType ?? '',
  };
}
