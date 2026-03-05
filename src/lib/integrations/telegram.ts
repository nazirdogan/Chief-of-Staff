import { env } from '@/lib/config';
import { createServiceClient } from '@/lib/db/client';
import { getTodaysBriefing } from '@/lib/db/queries/briefings';
import { sanitiseContent, buildSafeAIContext } from '@/lib/ai/safety/sanitise';
import { AI_MODELS } from '@/lib/ai/models';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';

const anthropic = new Anthropic();

// ── Core messaging ────────────────────────────────────────

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: {
    parse_mode?: 'HTML' | 'MarkdownV2';
    reply_markup?: unknown;
  }
): Promise<boolean> {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options?.parse_mode ?? 'HTML',
      reply_markup: options?.reply_markup,
    }),
  });

  if (!response.ok) {
    console.error('[Telegram] Failed to send message: HTTP', response.status);
    return false;
  }

  return true;
}

// ── Connect deep link ─────────────────────────────────────

export function generateConnectToken(userId: string): string {
  const payload = `${userId}:${Date.now()}`;
  const hmac = crypto
    .createHmac('sha256', env.TELEGRAM_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 16);
  // Base64url-encode the payload + hmac so it fits Telegram's 64-char start param
  return Buffer.from(`${payload}:${hmac}`).toString('base64url');
}

export function verifyConnectToken(token: string): { userId: string; timestamp: number } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const parts = decoded.split(':');
    if (parts.length < 3) return null;

    const hmac = parts.pop()!;
    const timestamp = parseInt(parts.pop()!, 10);
    const userId = parts.join(':');

    // Verify HMAC
    const expected = crypto
      .createHmac('sha256', env.TELEGRAM_WEBHOOK_SECRET)
      .update(`${userId}:${timestamp}`)
      .digest('hex')
      .slice(0, 16);

    if (hmac !== expected) return null;

    // Token expires after 15 minutes
    if (Date.now() - timestamp > 15 * 60 * 1000) return null;

    return { userId, timestamp };
  } catch {
    return null;
  }
}

export function getTelegramConnectUrl(token: string): string {
  // The bot username is derived from the bot token by calling getMe,
  // but for the connect URL we use the configured app URL pattern
  return `https://t.me/${env.TELEGRAM_BOT_USERNAME ?? 'ChiefOfStaffAIBot'}?start=${token}`;
}

// ── Briefing formatting ───────────────────────────────────

export interface FormattedBriefing {
  id: string;
  briefing_date: string;
  items: Array<{
    rank: number;
    title: string;
    summary: string;
    reasoning: string;
    section: string;
  }>;
}

export function formatBriefingForTelegram(briefing: FormattedBriefing): string {
  const dateStr = new Date(briefing.briefing_date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const lines: string[] = [
    `<b>Daily Briefing — ${dateStr}</b>`,
    '',
  ];

  const sectionLabels: Record<string, string> = {
    priority_inbox: 'Priority Inbox',
    todays_schedule: "Today's Schedule",
    commitment_queue: 'Commitment Queue',
    at_risk: 'At Risk',
    quick_wins: 'Quick Wins',
  };

  const grouped: Record<string, typeof briefing.items> = {};
  for (const item of briefing.items) {
    const section = item.section;
    if (!grouped[section]) grouped[section] = [];
    grouped[section].push(item);
  }

  for (const [section, items] of Object.entries(grouped)) {
    lines.push(`<b>${sectionLabels[section] ?? section}</b>`);
    for (const item of items) {
      lines.push(`${item.rank}. <b>${escapeHtml(item.title)}</b>`);
      lines.push(`   ${escapeHtml(item.summary)}`);
      lines.push(`   <i>${escapeHtml(item.reasoning)}</i>`);
      lines.push('');
    }
  }

  lines.push(
    'Reply <code>do N</code> to draft a reply for item N\n' +
    'Reply <code>skip N</code> to archive item N\n' +
    'Reply <code>remind N at TIME</code> to snooze'
  );

  return lines.join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Command handlers ──────────────────────────────────────

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; username?: string; first_name?: string };
    chat: { id: number; type: string };
    text?: string;
    date: number;
  };
}

interface CommandResult {
  reply: string;
  parse_mode?: 'HTML' | 'MarkdownV2';
}

export async function handleTelegramCommand(update: TelegramUpdate): Promise<CommandResult | null> {
  const message = update.message;
  if (!message?.text) return null;

  const chatId = message.chat.id.toString();
  const text = message.text.trim();

  // /start command — possibly with connect token
  if (text.startsWith('/start')) {
    return handleStartCommand(chatId, text, message.from?.username ?? null);
  }

  // /briefing command
  if (text === '/briefing') {
    return handleBriefingCommand(chatId);
  }

  // "do N" command
  const doMatch = text.match(/^do\s+(\d+)$/i);
  if (doMatch) {
    return handleDoCommand(chatId, parseInt(doMatch[1], 10));
  }

  // "skip N" command
  const skipMatch = text.match(/^skip\s+(\d+)$/i);
  if (skipMatch) {
    return handleSkipCommand(chatId, parseInt(skipMatch[1], 10));
  }

  // "remind N at TIME" command
  const remindMatch = text.match(/^remind\s+(\d+)\s+at\s+(.+)$/i);
  if (remindMatch) {
    return handleRemindCommand(chatId, parseInt(remindMatch[1], 10), remindMatch[2]);
  }

  return {
    reply: 'Commands:\n' +
      '/briefing — Get today\'s briefing\n' +
      '<code>do N</code> — Draft a reply for item #N\n' +
      '<code>skip N</code> — Archive item #N\n' +
      '<code>remind N at TIME</code> — Snooze item #N',
  };
}

async function handleStartCommand(
  chatId: string,
  text: string,
  username: string | null
): Promise<CommandResult> {
  const parts = text.split(/\s+/);
  const token = parts[1];

  if (!token) {
    return {
      reply: 'Welcome to Chief of Staff!\n\n' +
        'To connect your account, use the connect link from your dashboard at Settings > Integrations.\n\n' +
        'Once connected, you\'ll receive your daily briefing here.',
    };
  }

  // Verify the connect token
  const verified = verifyConnectToken(token);
  if (!verified) {
    return {
      reply: 'This connect link has expired or is invalid. Please generate a new one from Settings > Integrations.',
    };
  }

  const supabase = createServiceClient();

  // Save telegram_chat_id to profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('profiles')
    .update({
      telegram_chat_id: chatId,
      primary_channel: 'telegram',
    })
    .eq('id', verified.userId);

  // Create or update telegram session
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('telegram_sessions')
    .upsert({
      user_id: verified.userId,
      chat_id: chatId,
      username,
      is_active: true,
      last_message_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  return {
    reply: 'Connected! You\'ll receive your daily briefing here every morning.\n\n' +
      'Try <code>/briefing</code> to get today\'s briefing now.',
  };
}

async function getUserIdFromChatId(chatId: string): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('telegram_sessions')
    .select('user_id')
    .eq('chat_id', chatId)
    .eq('is_active', true)
    .single();

  if (!data) return null;
  return (data as { user_id: string }).user_id;
}

async function handleBriefingCommand(chatId: string): Promise<CommandResult> {
  const userId = await getUserIdFromChatId(chatId);
  if (!userId) {
    return {
      reply: 'Your Telegram is not connected to a Chief of Staff account.\n' +
        'Go to Settings > Integrations to connect.',
    };
  }

  const supabase = createServiceClient();
  const briefing = await getTodaysBriefing(supabase, userId);

  if (!briefing || briefing.items.length === 0) {
    return {
      reply: 'No briefing available for today. Your briefing will be generated at your configured time.',
    };
  }

  const formatted = formatBriefingForTelegram({
    id: briefing.id,
    briefing_date: briefing.briefing_date,
    items: briefing.items.map(item => ({
      rank: item.rank,
      title: item.title,
      summary: item.summary,
      reasoning: item.reasoning,
      section: item.section,
    })),
  });

  return { reply: formatted };
}

async function handleDoCommand(chatId: string, itemNumber: number): Promise<CommandResult> {
  const userId = await getUserIdFromChatId(chatId);
  if (!userId) {
    return { reply: 'Your Telegram is not connected. Go to Settings > Integrations to connect.' };
  }

  const supabase = createServiceClient();
  const briefing = await getTodaysBriefing(supabase, userId);

  if (!briefing) {
    return { reply: 'No briefing available for today.' };
  }

  const item = briefing.items.find(i => i.rank === itemNumber);
  if (!item) {
    return { reply: `Item #${itemNumber} not found in today's briefing.` };
  }

  // Generate a quick draft reply using FAST model
  if (item.item_type !== 'email') {
    return {
      reply: `<b>#${item.rank}: ${escapeHtml(item.title)}</b>\n\n` +
        `${escapeHtml(item.summary)}\n\n` +
        `<i>Action suggestion: ${escapeHtml(item.action_suggestion ?? 'Review this item in the dashboard')}</i>`,
    };
  }

  const { content: safeSummary } = sanitiseContent(
    item.summary,
    `briefing:${item.id}`
  );

  const context = buildSafeAIContext(
    DRAFT_REPLY_PROMPT,
    [{ label: 'email_summary', content: safeSummary, source: `briefing:${item.id}` }]
  );

  try {
    const response = await anthropic.messages.create({
      model: AI_MODELS.FAST,
      max_tokens: 300,
      messages: [{ role: 'user', content: context }],
    });

    const draft = response.content
      .filter(block => block.type === 'text')
      .map(block => {
        if (block.type === 'text') return block.text;
        return '';
      })
      .join('');

    return {
      reply: `<b>Draft reply for #${item.rank}: ${escapeHtml(item.title)}</b>\n\n` +
        `${escapeHtml(draft)}\n\n` +
        '<i>Review and send this reply from the dashboard.</i>',
    };
  } catch {
    return { reply: `Failed to generate draft for item #${itemNumber}. Try again from the dashboard.` };
  }
}

async function handleSkipCommand(chatId: string, itemNumber: number): Promise<CommandResult> {
  const userId = await getUserIdFromChatId(chatId);
  if (!userId) {
    return { reply: 'Your Telegram is not connected. Go to Settings > Integrations to connect.' };
  }

  const supabase = createServiceClient();
  const briefing = await getTodaysBriefing(supabase, userId);

  if (!briefing) {
    return { reply: 'No briefing available for today.' };
  }

  const item = briefing.items.find(i => i.rank === itemNumber);
  if (!item) {
    return { reply: `Item #${itemNumber} not found in today's briefing.` };
  }

  // Mark the item as actioned (archived)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('briefing_items')
    .update({ actioned_at: new Date().toISOString() })
    .eq('id', item.id)
    .eq('user_id', userId);

  return { reply: `Skipped item #${itemNumber}: ${item.title}` };
}

async function handleRemindCommand(
  chatId: string,
  itemNumber: number,
  timeStr: string
): Promise<CommandResult> {
  const userId = await getUserIdFromChatId(chatId);
  if (!userId) {
    return { reply: 'Your Telegram is not connected. Go to Settings > Integrations to connect.' };
  }

  const supabase = createServiceClient();
  const briefing = await getTodaysBriefing(supabase, userId);

  if (!briefing) {
    return { reply: 'No briefing available for today.' };
  }

  const item = briefing.items.find(i => i.rank === itemNumber);
  if (!item) {
    return { reply: `Item #${itemNumber} not found in today's briefing.` };
  }

  // Parse time string — supports formats like "3pm", "15:00", "3:30pm"
  const snoozeUntil = parseTimeToday(timeStr.trim());
  if (!snoozeUntil) {
    return { reply: `Could not parse time "${timeStr}". Try formats like "3pm", "15:00", or "3:30pm".` };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('briefing_items')
    .update({ snoozed_until: snoozeUntil.toISOString() })
    .eq('id', item.id)
    .eq('user_id', userId);

  const formatted = snoozeUntil.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return { reply: `Reminder set for item #${itemNumber} at ${formatted}: ${item.title}` };
}

function parseTimeToday(timeStr: string): Date | null {
  const now = new Date();

  // Try "3pm", "3:30pm", "15:00" formats
  const match12 = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2] ?? '0', 10);
    const period = match12[3].toLowerCase();

    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;

    const result = new Date(now);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);

    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      const result = new Date(now);
      result.setHours(hours, minutes, 0, 0);
      return result;
    }
  }

  return null;
}

const DRAFT_REPLY_PROMPT = `You are drafting a brief email reply on behalf of a busy professional.
Based on the email summary provided, write a short, direct reply (2-3 sentences).
Match a professional but friendly tone. Address the key point or question.
Return ONLY the reply text, no subject line or salutation.`;
