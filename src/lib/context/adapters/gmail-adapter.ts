import type { ContextAdapter, ContextPipelineInput } from '@/lib/context/types';

interface GmailMessageData {
  id: string;
  threadId?: string;
  from?: string;
  fromName?: string;
  to?: string;
  subject?: string;
  body?: string;
  snippet?: string;
  date?: string;
}

export const gmailAdapter: ContextAdapter = {
  toContextInput(rawData: unknown): ContextPipelineInput[] {
    const messages = Array.isArray(rawData) ? rawData : [rawData];

    return messages
      .filter((msg): msg is GmailMessageData => !!msg && typeof msg === 'object' && 'id' in msg)
      .map((msg) => {
        const people: string[] = [];
        if (msg.from) people.push(msg.from);
        if (msg.to) people.push(msg.to);

        return {
          sourceId: msg.id,
          sourceRef: {
            provider: 'gmail',
            message_id: msg.id,
            thread_id: msg.threadId,
            from_name: msg.fromName,
            subject: msg.subject,
          },
          threadId: msg.threadId,
          title: msg.subject,
          rawContent: msg.body || msg.snippet || '',
          occurredAt: msg.date ? new Date(msg.date).toISOString() : new Date().toISOString(),
          people,
          chunkType: 'email_thread',
        };
      });
  },
};
