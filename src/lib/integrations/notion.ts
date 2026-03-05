import { Client } from '@notionhq/client';
import { getAccessToken } from './nango';
import { sanitiseContent } from '@/lib/ai/safety/sanitise';

export async function getNotionClient(userId: string) {
  const accessToken = await getAccessToken(userId, 'notion');
  return new Client({ auth: accessToken });
}

export interface NotionPage {
  id: string;
  title: string;
  url: string;
  lastEditedTime: string;
  content: string;
}

export async function searchNotionPages(userId: string, query: string) {
  const notion = await getNotionClient(userId);
  return notion.search({
    query,
    filter: { value: 'page', property: 'object' },
    sort: { direction: 'descending', timestamp: 'last_edited_time' },
    page_size: 10,
  });
}

export async function listRecentPages(
  userId: string,
  pageSize = 50
): Promise<NotionPage[]> {
  const notion = await getNotionClient(userId);
  const response = await notion.search({
    filter: { value: 'page', property: 'object' },
    sort: { direction: 'descending', timestamp: 'last_edited_time' },
    page_size: pageSize,
  });

  const pages: NotionPage[] = [];

  for (const result of response.results) {
    if (result.object !== 'page') continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page = result as any;

    const titleProp = page.properties?.title ?? page.properties?.Name;
    let title = '(Untitled)';
    if (titleProp?.title?.[0]?.plain_text) {
      title = titleProp.title[0].plain_text;
    } else if (titleProp?.rich_text?.[0]?.plain_text) {
      title = titleProp.rich_text[0].plain_text;
    }

    const content = await fetchPageContent(notion, page.id);

    pages.push({
      id: page.id,
      title,
      url: page.url ?? '',
      lastEditedTime: page.last_edited_time ?? '',
      content,
    });
  }

  return pages;
}

async function fetchPageContent(
  notion: Client,
  pageId: string
): Promise<string> {
  const blocks: string[] = [];

  try {
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await notion.blocks.children.list({
        block_id: pageId,
        start_cursor: cursor,
        page_size: 100,
      });

      for (const block of response.results) {
        const text = extractBlockText(block);
        if (text) blocks.push(text);
      }

      hasMore = response.has_more;
      cursor = response.next_cursor ?? undefined;
    }
  } catch {
    // Page may not be accessible — return what we have
  }

  return blocks.join('\n');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractBlockText(block: any): string {
  const type = block.type;
  if (!type) return '';

  const content = block[type];
  if (!content) return '';

  // Handle rich_text array (most block types)
  if (content.rich_text) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return content.rich_text.map((t: any) => t.plain_text ?? '').join('');
  }

  // Handle specific block types
  if (type === 'child_page') return content.title ?? '';
  if (type === 'child_database') return content.title ?? '';

  return '';
}

const MAX_CHUNK_LENGTH = 1000;

export interface NotionChunk {
  pageId: string;
  pageTitle: string;
  pageUrl: string;
  chunkIndex: number;
  content: string;
  lastEditedTime: string;
}

export function chunkPageContent(page: NotionPage): NotionChunk[] {
  // Sanitise content before chunking
  const { content: safeContent } = sanitiseContent(page.content, `notion:${page.id}`);

  if (!safeContent.trim()) return [];

  const paragraphs = safeContent.split('\n').filter(p => p.trim());
  const chunks: NotionChunk[] = [];
  let current = '';
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    if (current.length + paragraph.length + 1 > MAX_CHUNK_LENGTH && current) {
      chunks.push({
        pageId: page.id,
        pageTitle: page.title,
        pageUrl: page.url,
        chunkIndex,
        content: current.trim(),
        lastEditedTime: page.lastEditedTime,
      });
      chunkIndex++;
      current = '';
    }
    current += (current ? '\n' : '') + paragraph;
  }

  if (current.trim()) {
    chunks.push({
      pageId: page.id,
      pageTitle: page.title,
      pageUrl: page.url,
      chunkIndex,
      content: current.trim(),
      lastEditedTime: page.lastEditedTime,
    });
  }

  return chunks;
}
