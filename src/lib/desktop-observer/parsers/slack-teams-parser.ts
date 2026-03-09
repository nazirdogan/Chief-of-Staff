import type { AppParser, DesktopContextSnapshot, ParsedScreenContent } from './types';

interface SlackMessage {
  sender: string;
  text: string;
  time?: string;
}

function parseSlackChannel(windowTitle: string): { channel: string | null; isDm: boolean } {
  // Slack: "Slack — #channel-name" or "Slack — Person Name"
  const match = windowTitle.match(/(?:Slack|Teams)\s*[—–-]\s*(.+)/i);
  if (!match) return { channel: null, isDm: false };

  const name = match[1].trim();
  const isDm = !name.startsWith('#') && !name.startsWith('*');
  return { channel: name, isDm };
}

function parseSlackMessages(texts: string[]): SlackMessage[] {
  const messages: SlackMessage[] = [];
  const timeRe = /\b\d{1,2}:\d{2}\s*(?:AM|PM)?\b/;

  // Slack messages often appear as: sender name, then message text, then timestamp
  let currentSender = '';

  for (const text of texts) {
    if (text.length < 2) continue;

    // Skip Slack UI elements
    if (/^(Threads|Mentions|Drafts|Saved|Channels|Direct Messages|Apps|Huddle|Home|DMs|Activity|Later|More|Unreads)$/i.test(text)) {
      continue;
    }

    // Time-only text
    if (text.length < 10 && timeRe.test(text)) continue;

    // Short text without special chars = likely sender name
    if (text.length < 40 && !text.includes(' ') && !timeRe.test(text)) {
      currentSender = text;
      continue;
    }

    // Bolded display name pattern (Slack shows these)
    if (text.length < 50 && !text.includes('.') && !text.includes(',') && text.match(/^[A-Z][a-z]+ ?[A-Z]?[a-z]*$/)) {
      currentSender = text;
      continue;
    }

    if (text.length > 5) {
      messages.push({
        sender: currentSender || 'Unknown',
        text: text.slice(0, 500),
        time: text.match(timeRe)?.[0],
      });
    }
  }

  return messages.slice(-20);
}

export const slackTeamsParser: AppParser = {
  name: 'slack-teams',

  match(ctx: DesktopContextSnapshot): boolean {
    const app = ctx.active_app.toLowerCase();
    const url = ctx.url?.toLowerCase() ?? '';

    if (app.includes('slack') || app.includes('teams')) return true;
    if (url.includes('app.slack.com') || url.includes('teams.microsoft.com')) return true;

    return false;
  },

  parse(ctx: DesktopContextSnapshot): ParsedScreenContent {
    const { channel, isDm } = parseSlackChannel(ctx.window_title);
    const messages = parseSlackMessages(ctx.visible_text);
    const senders = [...new Set(messages.map(m => m.sender).filter(s => s !== 'Unknown'))];

    const isSlack = ctx.active_app.toLowerCase().includes('slack') ||
      (ctx.url?.includes('slack.com') ?? false);
    const platform = isSlack ? 'slack' : 'teams';

    const people = senders.map(name => ({ name }));

    const messageText = messages.map(m =>
      `${m.sender}: ${m.text}`
    ).join('\n');

    return {
      appCategory: 'chat',
      structuredData: {
        platform,
        channel,
        isDm,
        participants: senders,
        messages: messages.slice(-10),
        messageCount: messages.length,
        threadContext: ctx.focused_text?.slice(0, 500) || null,
      },
      rawText: `[${platform.toUpperCase()}${channel ? ` ${isDm ? 'DM' : channel}` : ''}]\n${messageText}`,
      people,
      actionItems: [],
      confidence: channel ? 0.7 : 0.4,
    };
  },
};
