import type { ContextAdapter, ContextPipelineInput } from '@/lib/context/types';

interface CodeActivityData {
  id: string;
  type: 'pr' | 'mention' | 'commit' | 'review';
  title?: string;
  body?: string;
  repoFullName?: string;
  authorLogin?: string;
  authorName?: string;
  authorEmail?: string;
  labels?: string[];
  number?: number;
  updatedAt?: string;
  createdAt?: string;
}

export const codeAdapter: ContextAdapter = {
  toContextInput(rawData: unknown): ContextPipelineInput[] {
    const items = Array.isArray(rawData) ? rawData : [rawData];

    return items
      .filter((item): item is CodeActivityData => !!item && typeof item === 'object' && 'id' in item)
      .map((item) => {
        const people: string[] = [];
        if (item.authorEmail) people.push(item.authorEmail);
        else if (item.authorLogin) people.push(`${item.authorLogin}@github`);

        const parts: string[] = [];
        if (item.repoFullName && item.number) {
          parts.push(`[${item.repoFullName}#${item.number}] ${item.title || ''}`);
        } else {
          parts.push(item.title || 'Code activity');
        }
        if (item.labels?.length) parts.push(`Labels: ${item.labels.join(', ')}`);
        if (item.body) parts.push(item.body.slice(0, 500));

        return {
          sourceId: item.id,
          sourceRef: {
            provider: 'github',
            id: item.id,
            type: item.type,
            repo: item.repoFullName,
            number: item.number,
            author: item.authorLogin,
          },
          title: item.title,
          rawContent: parts.join('\n'),
          occurredAt: (item.updatedAt || item.createdAt)
            ? new Date(item.updatedAt || item.createdAt!).toISOString()
            : new Date().toISOString(),
          people,
          chunkType: 'code_activity',
        };
      });
  },
};
