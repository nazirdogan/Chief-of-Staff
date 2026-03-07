import { google } from 'googleapis';
import { getAccessToken } from './nango';

// Google Drive integration via Nango 'google-drive' provider.
// Indexes documents for vector search. Never stores raw file content.
// Read-only: we never create or modify Drive files.

export interface ParsedDriveDocument {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
  excerpt: string;
  size: number;
}

export async function getDriveClient(userId: string) {
  const accessToken = await getAccessToken(userId, 'google-drive');
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
}

/**
 * Lists recently modified Google Drive documents suitable for indexing.
 * Returns metadata only — content is fetched separately per document.
 */
export async function listRecentDriveDocuments(
  userId: string,
  maxResults = 30
): Promise<ParsedDriveDocument[]> {
  const drive = await getDriveClient(userId);

  const response = await drive.files.list({
    pageSize: maxResults,
    orderBy: 'modifiedTime desc',
    q: "trashed = false and (mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/vnd.google-apps.presentation' or mimeType = 'text/plain' or mimeType = 'application/pdf')",
    fields: 'files(id,name,mimeType,modifiedTime,webViewLink,size)',
  });

  return (response.data.files ?? []).map(parseDriveFile);
}

/**
 * Exports a Google Drive document as plain text for AI processing.
 * Raw content is NEVER stored — caller processes in memory only.
 */
export async function exportDriveDocumentText(
  userId: string,
  fileId: string,
  mimeType: string
): Promise<string> {
  const drive = await getDriveClient(userId);

  if (mimeType === 'application/vnd.google-apps.document') {
    const response = await drive.files.export(
      { fileId, mimeType: 'text/plain' },
      { responseType: 'text' }
    );
    return (response.data as string) ?? '';
  }

  if (mimeType === 'application/vnd.google-apps.presentation') {
    const response = await drive.files.export(
      { fileId, mimeType: 'text/plain' },
      { responseType: 'text' }
    );
    return (response.data as string) ?? '';
  }

  if (mimeType === 'text/plain') {
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'text' }
    );
    return (response.data as string) ?? '';
  }

  // PDF and other binary types: return placeholder
  return `[Binary file — indexing not supported for ${mimeType}]`;
}

function parseDriveFile(
  file: {
    id?: string | null;
    name?: string | null;
    mimeType?: string | null;
    modifiedTime?: string | null;
    webViewLink?: string | null;
    size?: string | null;
  }
): ParsedDriveDocument {
  return {
    id: file.id ?? '',
    name: file.name ?? '(Untitled)',
    mimeType: file.mimeType ?? '',
    modifiedTime: file.modifiedTime ?? new Date().toISOString(),
    webViewLink: file.webViewLink ?? '',
    excerpt: '',
    size: parseInt(file.size ?? '0', 10),
  };
}
