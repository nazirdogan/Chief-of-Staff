import type { AppParser, DesktopContextSnapshot, ParsedScreenContent } from './types';

const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const TIMESTAMP_PATTERN = /\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\b/;
const _DATE_PATTERN = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i;

function extractEmailAddresses(texts: string[]): string[] {
  const all = texts.join(' ');
  return [...new Set(all.match(EMAIL_PATTERN) ?? [])];
}

function extractSubjectFromTitle(windowTitle: string): string | null {
  // Gmail: "Subject - email@gmail.com - Gmail"
  // Outlook: "Subject - Outlook"
  // Apple Mail: "Subject"
  const gmailMatch = windowTitle.match(/^(.+?)\s*-\s*[\w.+-]+@[\w-]+\.[\w.-]+\s*-\s*Gmail$/);
  if (gmailMatch) return gmailMatch[1].trim();

  const outlookMatch = windowTitle.match(/^(.+?)\s*-\s*(?:Outlook|Mail)$/);
  if (outlookMatch) return outlookMatch[1].trim();

  return null;
}

function extractSenderFromVisible(texts: string[]): { name: string; email?: string } | null {
  for (const text of texts) {
    // Look for "From: Name <email>" or "Name <email>"
    const fromMatch = text.match(/(?:From:\s*)?([^<]+?)\s*<([\w.+-]+@[\w-]+\.[\w.-]+)>/);
    if (fromMatch) return { name: fromMatch[1].trim(), email: fromMatch[2] };
  }
  return null;
}

function parseEmailContent(texts: string[]): {
  bodyPreview: string;
  threadParticipants: string[];
  hasAttachment: boolean;
} {
  const bodyParts: string[] = [];
  const participants: string[] = [];
  let hasAttachment = false;

  for (const text of texts) {
    if (text.match(/attachment|attached|📎/i)) hasAttachment = true;

    const emails = text.match(EMAIL_PATTERN);
    if (emails) participants.push(...emails);

    // Skip UI chrome (buttons, nav items)
    if (text.length < 3 || text.match(/^(Reply|Forward|Archive|Delete|Mark|More|Undo|Send|Compose|Inbox|Sent|Drafts|Starred|Spam|Trash|All Mail|Labels)$/i)) {
      continue;
    }

    // Body text tends to be longer lines without timestamps at the start
    if (text.length > 20 && !TIMESTAMP_PATTERN.test(text.slice(0, 10))) {
      bodyParts.push(text);
    }
  }

  return {
    bodyPreview: bodyParts.slice(0, 5).join(' ').slice(0, 500),
    threadParticipants: [...new Set(participants)],
    hasAttachment,
  };
}

export const emailParser: AppParser = {
  name: 'email',

  match(ctx: DesktopContextSnapshot): boolean {
    const app = ctx.active_app.toLowerCase();
    const title = ctx.window_title.toLowerCase();
    const url = ctx.url?.toLowerCase() ?? '';

    // Native mail apps
    if (app === 'mail' || app.includes('outlook') || app.includes('spark') || app.includes('airmail')) {
      return true;
    }

    // Gmail/Outlook in browser
    if (url.includes('mail.google.com') || url.includes('outlook.live.com') || url.includes('outlook.office.com')) {
      return true;
    }

    // Window title hints
    if (title.includes('gmail') || title.includes('inbox') && title.includes('mail')) {
      return true;
    }

    return false;
  },

  parse(ctx: DesktopContextSnapshot): ParsedScreenContent {
    const subject = extractSubjectFromTitle(ctx.window_title);
    const sender = extractSenderFromVisible(ctx.visible_text);
    const emails = extractEmailAddresses(ctx.visible_text);
    const { bodyPreview, threadParticipants, hasAttachment } = parseEmailContent(ctx.visible_text);

    // Include focused/selected text as part of body
    const fullBody = [ctx.focused_text, ctx.selected_text, bodyPreview]
      .filter(Boolean)
      .join('\n')
      .slice(0, 1000);

    const people: Array<{ name: string; email?: string }> = [];
    if (sender) people.push(sender);
    for (const email of emails) {
      if (!people.find(p => p.email === email)) {
        people.push({ name: email.split('@')[0], email });
      }
    }

    const provider = ctx.url?.includes('mail.google.com') ? 'gmail'
      : ctx.url?.includes('outlook') ? 'outlook'
      : ctx.active_app.toLowerCase().includes('outlook') ? 'outlook'
      : 'email';

    return {
      appCategory: 'email',
      structuredData: {
        provider,
        subject,
        from: sender,
        bodyPreview: fullBody,
        threadParticipants,
        hasAttachment,
        emailAddresses: emails,
        url: ctx.url,
      },
      rawText: `[Email${subject ? `: ${subject}` : ''}]\n${sender ? `From: ${sender.name}${sender.email ? ` <${sender.email}>` : ''}\n` : ''}${fullBody}`,
      people,
      actionItems: [],
      confidence: subject ? 0.8 : 0.5,
    };
  },
};
