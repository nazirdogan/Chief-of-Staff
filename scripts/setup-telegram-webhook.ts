/**
 * One-time script to register the Telegram webhook.
 * Run after deployment: npx tsx scripts/setup-telegram-webhook.ts
 *
 * Required env vars:
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_WEBHOOK_SECRET
 *   NEXT_PUBLIC_APP_URL
 */

async function setupWebhook() {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/telegram`;
  const SECRET_TOKEN = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not set');
    process.exit(1);
  }
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    console.error('NEXT_PUBLIC_APP_URL is not set');
    process.exit(1);
  }
  if (!SECRET_TOKEN) {
    console.error('TELEGRAM_WEBHOOK_SECRET is not set');
    process.exit(1);
  }

  console.log(`Setting webhook to: ${WEBHOOK_URL}`);

  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        secret_token: SECRET_TOKEN,
        allowed_updates: ['message', 'callback_query'],
      }),
    }
  );

  const result = await response.json();

  if (result.ok) {
    console.log('Webhook registered successfully!');
    console.log('Description:', result.description);
  } else {
    console.error('Failed to register webhook:', result);
    process.exit(1);
  }

  // Verify by getting webhook info
  const infoResponse = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
  );
  const info = await infoResponse.json();
  console.log('\nWebhook info:', JSON.stringify(info.result, null, 2));
}

setupWebhook().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
