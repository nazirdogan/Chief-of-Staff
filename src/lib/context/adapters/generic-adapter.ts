import type { ContextAdapter, ContextPipelineInput, ContextChunkType } from '@/lib/context/types';

interface GenericData {
  id: string;
  title?: string;
  content?: string;
  body?: string;
  text?: string;
  from?: string;
  fromEmail?: string;
  date?: string;
  updatedAt?: string;
  provider: string;
  chunkType?: ContextChunkType;
}

export const genericAdapter: ContextAdapter = {
  toContextInput(rawData: unknown): ContextPipelineInput[] {
    const items = Array.isArray(rawData) ? rawData : [rawData];

    return items
      .filter((item): item is GenericData => !!item && typeof item === 'object' && 'id' in item)
      .map((item) => {
        const people: string[] = [];
        if (item.fromEmail) people.push(item.fromEmail);
        else if (item.from) people.push(item.from);

        const rawContent = item.content || item.body || item.text || item.title || '';

        return {
          sourceId: item.id,
          sourceRef: {
            provider: item.provider,
            id: item.id,
            title: item.title,
          },
          title: item.title,
          rawContent,
          occurredAt: (item.date || item.updatedAt)
            ? new Date(item.date || item.updatedAt!).toISOString()
            : new Date().toISOString(),
          people,
          chunkType: item.chunkType || 'general_note',
        };
      });
  },
};
