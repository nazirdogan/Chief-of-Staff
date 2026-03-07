import type { ContextAdapter, ContextPipelineInput } from '@/lib/context/types';

interface SlackMessageData {
  id: string;
  threadTs?: string;
  from?: string;
  fromName?: string;
  text: string;
  channelName?: string;
  date: string;
}

export const slackAdapter: ContextAdapter = {
  toContextInput(rawData: unknown): ContextPipelineInput[] {
    const messages = Array.isArray(rawData) ? rawData : [rawData];

    return messages
      .filter((msg): msg is SlackMessageData => !!msg && typeof msg === 'object' && 'id' in msg)
      .map((msg) => {
        const people: string[] = [];
        if (msg.from) people.push(msg.from);

        return {
          sourceId: msg.id,
          sourceRef: {
            provider: 'slack',
            message_id: msg.id,
            thread_ts: msg.threadTs,
            channel: msg.channelName,
            from_name: msg.fromName,
          },
          threadId: msg.threadTs,
          title: msg.channelName
            ? `Slack: #${msg.channelName}`
            : `Slack DM from ${msg.fromName || 'unknown'}`,
          rawContent: msg.text,
          occurredAt: msg.date,
          people,
          chunkType: 'slack_conversation',
        };
      });
  },
};
