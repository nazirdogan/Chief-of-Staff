import type { AppParser, DesktopContextSnapshot, ParsedScreenContent } from './types';
import { redactPII } from '@/lib/ai/safety/sanitise';

const TIMESTAMP_RE = /\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\b/;
const _PHONE_RE = /\+?\d[\d\s()-]{7,}/;

interface ChatMessage {
  sender: string;
  text: string;
  time?: string;
}

function extractConversationPartner(windowTitle: string, appName: string): string | null {
  const app = appName.toLowerCase();

  // WhatsApp: "WhatsApp" or "Contact Name — WhatsApp"
  if (app.includes('whatsapp')) {
    const match = windowTitle.match(/^(.+?)\s*[—–-]\s*WhatsApp/i);
    return match ? match[1].trim() : null;
  }

  // Messages: "Messages — Contact Name" or just "Contact Name"
  if (app === 'messages') {
    const match = windowTitle.match(/(?:Messages\s*[—–-]\s*)?(.+)/);
    return match ? match[1].trim() : null;
  }

  // Telegram: "Telegram — Contact Name"
  if (app.includes('telegram')) {
    const match = windowTitle.match(/^(.+?)\s*[—–-]\s*Telegram/i);
    return match ? match[1].trim() : null;
  }

  // Signal, Discord: "App — Contact/Channel"
  const generic = windowTitle.match(/^(.+?)\s*[—–-]\s*/);
  return generic ? generic[1].trim() : windowTitle || null;
}

function parseMessages(texts: string[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  let currentSender = '';

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];

    // Skip UI chrome
    if (text.length < 2) continue;
    if (/^(Type a message|Send|Attach|Search|Mute|Video|Call|Info|Back|Settings)$/i.test(text)) continue;

    // Detect timestamps (often on their own line or at end)
    const timeMatch = text.match(TIMESTAMP_RE);

    // Short text followed by longer text = likely sender name + message
    if (text.length < 30 && !timeMatch && i + 1 < texts.length && texts[i + 1].length > text.length) {
      currentSender = text;
      continue;
    }

    // Longer text = message body
    if (text.length > 5) {
      messages.push({
        sender: currentSender || 'Unknown',
        text: text.slice(0, 300),
        time: timeMatch?.[0],
      });
    }
  }

  return messages.slice(-20); // Keep last 20 messages
}

function detectGroupChat(texts: string[], windowTitle: string): boolean {
  // Group indicators in title
  if (/group|team|channel/i.test(windowTitle)) return true;

  // Multiple unique short strings (sender names) before longer strings
  const shortTexts = texts.filter(t => t.length > 2 && t.length < 25);
  const uniqueShort = new Set(shortTexts);
  return uniqueShort.size > 3;
}

export const chatParser: AppParser = {
  name: 'chat',

  match(ctx: DesktopContextSnapshot): boolean {
    const app = ctx.active_app.toLowerCase();
    const url = ctx.url?.toLowerCase() ?? '';

    const chatApps = ['whatsapp', 'messages', 'telegram', 'signal', 'discord', 'imessage'];
    if (chatApps.some(a => app.includes(a))) return true;

    // Browser versions
    if (url.includes('web.whatsapp.com') || url.includes('web.telegram.org') || url.includes('discord.com/channels')) {
      return true;
    }

    return false;
  },

  parse(ctx: DesktopContextSnapshot): ParsedScreenContent {
    const partner = extractConversationPartner(ctx.window_title, ctx.active_app);
    const messages = parseMessages(ctx.visible_text);
    const isGroup = detectGroupChat(ctx.visible_text, ctx.window_title);

    // Extract unique senders
    const senders = [...new Set(messages.map(m => m.sender).filter(s => s !== 'Unknown'))];

    const people: Array<{ name: string; email?: string }> = [];
    if (partner && !isGroup) {
      people.push({ name: partner });
    }
    for (const sender of senders) {
      if (!people.find(p => p.name === sender)) {
        people.push({ name: sender });
      }
    }

    const app = ctx.active_app.toLowerCase();
    const platform = app.includes('whatsapp') ? 'whatsapp'
      : app.includes('telegram') ? 'telegram'
      : app.includes('signal') ? 'signal'
      : app.includes('discord') ? 'discord'
      : app === 'messages' ? 'imessage'
      : 'chat';

    const messageText = messages.map(m =>
      `${m.sender}: ${m.text}${m.time ? ` (${m.time})` : ''}`
    ).join('\n');

    return {
      appCategory: 'chat',
      structuredData: {
        platform,
        conversationPartner: partner,
        isGroup,
        groupName: isGroup ? partner : null,
        participants: senders,
        messages: messages.slice(-10).map(m => ({ ...m, text: redactPII(m.text.slice(0, 300)) })), // Last 10 for storage
        messageCount: messages.length,
      },
      rawText: `[${platform.toUpperCase()} Chat${partner ? ` with ${partner}` : ''}${isGroup ? ' (group)' : ''}]\n${messageText}`,
      people,
      actionItems: [],
      confidence: messages.length > 0 ? 0.7 : 0.4,
    };
  },
};
