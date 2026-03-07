import type { ContextAdapter, ContextPipelineInput } from '@/lib/context/types';

interface NotionPageData {
  id: string;
  title?: string;
  content?: string;
  lastEditedTime?: string;
  lastEditedBy?: string;
  url?: string;
}

export const notionAdapter: ContextAdapter = {
  toContextInput(rawData: unknown): ContextPipelineInput[] {
    const pages = Array.isArray(rawData) ? rawData : [rawData];

    return pages
      .filter((page): page is NotionPageData => !!page && typeof page === 'object' && 'id' in page)
      .map((page) => {
        const people: string[] = [];
        if (page.lastEditedBy) people.push(page.lastEditedBy);

        return {
          sourceId: page.id,
          sourceRef: {
            provider: 'notion',
            page_id: page.id,
            title: page.title,
            url: page.url,
          },
          title: page.title,
          rawContent: page.content || page.title || '',
          occurredAt: page.lastEditedTime
            ? new Date(page.lastEditedTime).toISOString()
            : new Date().toISOString(),
          people,
          chunkType: 'document_edit',
        };
      });
  },
};
