import { NextRequest, NextResponse } from 'next/server';
import { verifyTelegramWebhook } from '@/lib/middleware/withWebhookVerification';
import { handleTelegramCommand, sendTelegramMessage } from '@/lib/integrations/telegram';
import type { TelegramUpdate } from '@/lib/integrations/telegram';

// Public route — Telegram webhook. Verified via X-Telegram-Bot-Api-Secret-Token header.
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Verify the webhook secret token
  if (!verifyTelegramWebhook(req)) {
    console.warn('[Telegram Webhook] Rejected: invalid or missing secret token');
    return NextResponse.json(
      { error: 'Unauthorized', code: 'WEBHOOK_VERIFICATION_FAILED' },
      { status: 401 }
    );
  }

  let update: TelegramUpdate;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON', code: 'INVALID_BODY' },
      { status: 400 }
    );
  }

  // Only handle messages with text
  if (!update.message?.text || !update.message.chat) {
    return NextResponse.json({ ok: true });
  }

  const chatId = update.message.chat.id.toString();

  try {
    const result = await handleTelegramCommand(update);

    if (result) {
      await sendTelegramMessage(chatId, result.reply, {
        parse_mode: result.parse_mode ?? 'HTML',
      });
    }
  } catch (err) {
    console.error('[Telegram Webhook] Error handling command:', err);
    await sendTelegramMessage(
      chatId,
      'Something went wrong. Please try again.',
      { parse_mode: 'HTML' }
    );
  }

  // Telegram expects 200 OK quickly — always return success
  return NextResponse.json({ ok: true });
}
