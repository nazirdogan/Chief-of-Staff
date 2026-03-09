/**
 * App Parser Registry — matches incoming desktop context to the right parser.
 *
 * Parsers are tested in priority order (most specific first).
 * The first match wins. If nothing matches, a generic fallback is used.
 */

import type { AppParser, DesktopContextSnapshot, ParsedScreenContent } from './types';
import { redactPII } from '@/lib/ai/safety/sanitise';
import { emailParser } from './email-parser';
import { chatParser } from './chat-parser';
import { slackTeamsParser } from './slack-teams-parser';
import { codeParser } from './code-parser';
import { terminalParser } from './terminal-parser';
import { calendarParser } from './calendar-parser';
import { browserParser } from './browser-parser';

/**
 * Priority-ordered list of parsers. Tested from top to bottom — first match wins.
 * More specific parsers (email, slack, chat) must come BEFORE generic ones (browser).
 */
const PARSER_REGISTRY: AppParser[] = [
  emailParser,       // Gmail, Outlook, Mail (native + browser)
  slackTeamsParser,  // Slack, Teams (native + browser)
  chatParser,        // WhatsApp, Messages, Telegram, Signal, Discord
  calendarParser,    // Calendar apps + Google Calendar in browser
  codeParser,        // VS Code, Cursor, Xcode, IntelliJ, etc.
  terminalParser,    // Terminal, iTerm, Warp, etc.
  browserParser,     // Generic browser fallback (must be last of browser-capable parsers)
];

/** Fallback parser for unknown apps */
function fallbackParse(ctx: DesktopContextSnapshot): ParsedScreenContent {
  const contentParts: string[] = [];
  if (ctx.window_title) contentParts.push(ctx.window_title);
  if (ctx.focused_text) contentParts.push(ctx.focused_text);
  if (ctx.selected_text) contentParts.push(ctx.selected_text);
  if (ctx.visible_text.length > 0) contentParts.push(ctx.visible_text.slice(0, 30).join('\n'));

  // Try to classify from activity_type
  const categoryMap: Record<string, ParsedScreenContent['appCategory']> = {
    communicating: 'chat',
    coding: 'code',
    writing: 'document',
    designing: 'design',
    planning: 'calendar',
    browsing: 'browser',
    reading: 'browser',
  };

  return {
    appCategory: categoryMap[ctx.activity_type] ?? 'unknown',
    structuredData: {
      app: ctx.active_app,
      windowTitle: ctx.window_title,
    },
    rawText: redactPII(`[${ctx.active_app}] ${contentParts.join('\n')}`.slice(0, 1000)),
    people: [],
    actionItems: [],
    confidence: 0.2,
  };
}

/**
 * Run the given context through the parser registry.
 * Returns structured, app-aware parsed content.
 */
export function parseScreenContent(ctx: DesktopContextSnapshot): ParsedScreenContent {
  for (const parser of PARSER_REGISTRY) {
    if (parser.match(ctx)) {
      return parser.parse(ctx);
    }
  }
  return fallbackParse(ctx);
}
