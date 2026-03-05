# Chief of Staff — Integrations Setup Guide

All OAuth tokens are managed by Nango. This application never stores OAuth tokens directly.
Each integration section covers: what to set up in the provider's developer console, what
environment variables to set, and how the integration works at runtime.

---

## Nango — OAuth Token Vault (Required First)

Nango manages all OAuth connections. Set this up before any integration.

**Console**: https://app.nango.dev  
**Docs**: https://docs.nango.dev

### Setup Steps
1. Create a Nango account and project
2. Navigate to **Settings > Secret Key** — copy the secret key
3. Navigate to **Settings > Public Key** — copy the public key
4. For each integration below, add the provider in Nango's **Integrations** tab

### Environment Variables
```
NANGO_SECRET_KEY=           # Server-side: used to retrieve tokens
NANGO_PUBLIC_KEY=           # Client-side: used to initiate OAuth flows
NANGO_WEBHOOK_SECRET=       # Verify Nango webhook events
```

### How It Works at Runtime
```typescript
// lib/integrations/nango.ts
import Nango from '@nangohq/node';

const nango = new Nango({ secretKey: process.env.NANGO_SECRET_KEY });

// Retrieve a valid access token for a user's integration
// Nango handles refresh automatically
export async function getAccessToken(
  userId: string,
  provider: string
): Promise<string> {
  const connection = await nango.getConnection(
    provider,
    `${userId}-${provider}`  // our connection ID format
  );
  return connection.credentials.access_token;
}

// Initiate an OAuth flow — returns a URL to redirect the user to
export async function getConnectUrl(
  userId: string,
  provider: string,
  scopes: string[]
): Promise<string> {
  const sessionToken = await nango.createConnectSession({
    end_user: { id: userId },
    allowed_integrations: [provider],
    default_integration: provider,
    default_scopes: scopes,
  });
  return `https://connect.nango.dev?session_token=${sessionToken.data.token}`;
}
```

---

## Gmail

**Provider key in Nango**: `google-mail`  
**API**: Google Gmail API v1  
**Scopes used (incremental)**:

| Scope | When Added | Feature |
|---|---|---|
| `https://www.googleapis.com/auth/gmail.readonly` | Initial connect | Inbox read, briefing |
| `https://www.googleapis.com/auth/gmail.sent` | Commitment Tracker activation | Commitment extraction |
| `https://www.googleapis.com/auth/gmail.send` | Send feature activation | Reply sending |
| `https://www.googleapis.com/auth/gmail.modify` | Archive/label feature | Inbox actions |

### Google Cloud Setup
1. Go to https://console.cloud.google.com
2. Create a new project: `chief-of-staff-prod`
3. Enable **Gmail API**
4. Enable **Google Calendar API** (used by the Google Calendar integration)
5. Navigate to **APIs & Services > Credentials > Create OAuth 2.0 Client ID**
6. Application type: **Web application**
7. Authorised redirect URIs: Add Nango's callback URL: `https://api.nango.dev/oauth/callback`
8. Copy **Client ID** and **Client Secret**

### Nango Configuration
In Nango dashboard, add `google-mail` integration:
- OAuth Client ID: (from above)
- OAuth Client Secret: (from above)
- Scopes: start with `gmail.readonly` only

### Environment Variables
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```
*(Set in Nango — not needed directly in the app since Nango manages the OAuth flow)*

### Gmail Push Notifications (Webhooks)
To receive real-time notifications for new messages (for VIP alerts):
1. In Google Cloud Console, enable **Cloud Pub/Sub API**
2. Create a Pub/Sub topic: `chief-of-staff-gmail-push`
3. Create a subscription pointing to: `https://yourdomain.com/api/webhooks/gmail`
4. In app, after connecting Gmail, call `gmail.users.watch()` to register the subscription

### Runtime Usage
```typescript
// lib/integrations/gmail.ts
import { google } from 'googleapis';
import { getAccessToken } from './nango';

export async function getGmailClient(userId: string) {
  const accessToken = await getAccessToken(userId, 'google-mail');
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth });
}

// Fetch recent inbox messages (metadata only — no raw body stored)
export async function fetchInboxMessages(userId: string, maxResults = 20) {
  const gmail = await getGmailClient(userId);
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    labelIds: ['INBOX'],
    q: 'is:unread',
  });
  return response.data.messages ?? [];
}

// Fetch message metadata + snippet (not full body)
export async function fetchMessageMetadata(userId: string, messageId: string) {
  const gmail = await getGmailClient(userId);
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'metadata',  // ← metadata only, never 'full'
    metadataHeaders: ['From', 'To', 'Subject', 'Date', 'Message-ID'],
  });
  return response.data;
}

// Fetch message body for AI processing ONLY — never store the raw body
export async function fetchMessageForProcessing(userId: string, messageId: string) {
  const gmail = await getGmailClient(userId);
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });
  // Returns full message — caller MUST process in memory and discard
  // Never write response.data.payload to database
  return response.data;
}
```

---

## Google Calendar

**Provider key in Nango**: `google-calendar`  
*(Uses the same Google OAuth client as Gmail — shares Client ID/Secret)*

| Scope | When Added | Feature |
|---|---|---|
| `https://www.googleapis.com/auth/calendar.readonly` | Initial connect | Calendar briefing, meeting prep |
| `https://www.googleapis.com/auth/calendar.events` | Scheduling feature activation | Reschedule meetings |

### Nango Configuration
Add `google-calendar` in Nango — same Client ID and Secret as Gmail.

### Runtime Usage
```typescript
// lib/integrations/google-calendar.ts
import { google } from 'googleapis';
import { getAccessToken } from './nango';

export async function getCalendarClient(userId: string) {
  const accessToken = await getAccessToken(userId, 'google-calendar');
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: 'v3', auth });
}

export async function getTodaysEvents(userId: string) {
  const calendar = await getCalendarClient(userId);
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 20,
  });
  return response.data.items ?? [];
}
```

---

## Microsoft Outlook + Calendar

**Provider key in Nango**: `microsoft`  
**API**: Microsoft Graph API v1.0

| Scope | When Added | Feature |
|---|---|---|
| `Mail.Read` | Initial connect | Inbox read |
| `Mail.ReadWrite` | Archive feature | Inbox actions |
| `Mail.Send` | Send feature | Reply sending |
| `Calendars.Read` | Initial connect | Calendar briefing |
| `Calendars.ReadWrite` | Scheduling feature | Reschedule meetings |
| `offline_access` | Always | Refresh token |

### Azure App Registration
1. Go to https://portal.azure.com > **Azure Active Directory > App registrations**
2. Click **New registration**
3. Name: `Chief of Staff`
4. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
5. Redirect URI: `https://api.nango.dev/oauth/callback`
6. After creation, go to **API permissions > Add permission > Microsoft Graph**
7. Add the scopes listed above as **Delegated permissions**
8. Go to **Certificates & secrets > New client secret** — copy the value immediately

### Environment Variables
```
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=common
```

### Nango Configuration
Add `microsoft` integration in Nango with the Azure credentials above.

### Runtime Usage
```typescript
// lib/integrations/outlook.ts
import { Client } from '@microsoft/microsoft-graph-client';
import { getAccessToken } from './nango';

export async function getGraphClient(userId: string) {
  const accessToken = await getAccessToken(userId, 'microsoft');
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}

export async function fetchOutlookInbox(userId: string) {
  const client = await getGraphClient(userId);
  return client
    .api('/me/mailFolders/inbox/messages')
    .select('id,subject,from,receivedDateTime,bodyPreview,isRead')
    .top(20)
    .filter('isRead eq false')
    .orderby('receivedDateTime DESC')
    .get();
}
```

---

## Slack

**Provider key in Nango**: `slack`  
**API**: Slack Web API

| Scope | When Added | Feature |
|---|---|---|
| `channels:history` | Initial connect | Read public channel messages |
| `im:history` | Initial connect | Read DMs |
| `users:read` | Initial connect | Contact resolution |
| `users:read.email` | Initial connect | Match Slack users to contacts |
| `chat:write` | Send feature | Send messages |

### Slack App Setup
1. Go to https://api.slack.com/apps > **Create New App > From scratch**
2. App Name: `Chief of Staff`, pick a workspace
3. Navigate to **OAuth & Permissions**
4. Add **Redirect URLs**: `https://api.nango.dev/oauth/callback`
5. Add the Bot Token Scopes listed above
6. Navigate to **Basic Information > App Credentials** — copy **Client ID** and **Client Secret**

### Environment Variables
```
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=    # For verifying slash commands/events
```

### Nango Configuration
Add `slack` integration in Nango with Client ID and Client Secret.

### Runtime Usage
```typescript
// lib/integrations/slack.ts
import { WebClient } from '@slack/web-api';
import { getAccessToken } from './nango';

export async function getSlackClient(userId: string) {
  const accessToken = await getAccessToken(userId, 'slack');
  return new WebClient(accessToken);
}

export async function fetchRecentDMs(userId: string) {
  const client = await getSlackClient(userId);
  const conversations = await client.conversations.list({ types: 'im' });
  const dms = conversations.channels ?? [];

  const messages = await Promise.all(
    dms.slice(0, 10).map(async (dm) => {
      const history = await client.conversations.history({
        channel: dm.id!,
        limit: 5,
      });
      return history.messages ?? [];
    })
  );
  return messages.flat();
}
```

---

## Notion

**Provider key in Nango**: `notion`  
**API**: Notion API v1

| Scope | When Added | Feature |
|---|---|---|
| `read_content` | Initial connect | Read pages, databases |
| `update_content` | Task creation feature | Create/update pages |

### Notion Integration Setup
1. Go to https://www.notion.so/my-integrations > **New integration**
2. Name: `Chief of Staff`
3. Capabilities: **Read content**, **Update content**, **Read user information including email**
4. Copy **OAuth Client ID** and **OAuth Client Secret**
5. Set **Redirect URI**: `https://api.nango.dev/oauth/callback`

### Environment Variables
```
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=
```

### Nango Configuration
Add `notion` integration in Nango.

### Runtime Usage
```typescript
// lib/integrations/notion.ts
import { Client } from '@notionhq/client';
import { getAccessToken } from './nango';

export async function getNotionClient(userId: string) {
  const accessToken = await getAccessToken(userId, 'notion');
  return new Client({ auth: accessToken });
}

export async function searchNotionPages(userId: string, query: string) {
  const notion = await getNotionClient(userId);
  return notion.search({
    query,
    filter: { value: 'page', property: 'object' },
    sort: { direction: 'descending', timestamp: 'last_edited_time' },
    page_size: 10,
  });
}
```

---

## Telegram Bot

**Not via Nango** — Telegram uses a bot token, not OAuth.

### Bot Setup
1. Open Telegram and message **@BotFather**
2. Send `/newbot`
3. Name: `Chief of Staff`
4. Username: `ChiefOfStaffAIBot` (or similar available name)
5. BotFather returns the **Bot Token** — save it immediately
6. Send `/setprivacy` to BotFather > select your bot > choose **DISABLE** (needed to read group messages if you add group support later)
7. Send `/setwebhook` — or use the runtime setup below

### Webhook Registration (run once on deploy)
```typescript
// scripts/setup-telegram-webhook.ts
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/telegram`;
const SECRET_TOKEN = process.env.TELEGRAM_WEBHOOK_SECRET;

await fetch(
  `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: WEBHOOK_URL,
      secret_token: SECRET_TOKEN,     // verifies all incoming webhook calls
      allowed_updates: ['message', 'callback_query'],
    }),
  }
);
```

### Environment Variables
```
TELEGRAM_BOT_TOKEN=          # From BotFather
TELEGRAM_WEBHOOK_SECRET=     # Random 256-bit string — you generate this
```

### Runtime Usage
```typescript
// lib/integrations/telegram.ts

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: {
    parse_mode?: 'MarkdownV2' | 'HTML';
    reply_markup?: unknown;
  }
) {
  const response = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parse_mode ?? 'HTML',
        reply_markup: options?.reply_markup,
      }),
    }
  );
  return response.json();
}

// Send the daily briefing as a formatted Telegram message
export function formatBriefingForTelegram(briefing: DailyBriefing): string {
  const lines: string[] = [];
  lines.push(`<b>☀️ Good morning — here's your briefing for ${briefing.date}</b>\n`);

  if (briefing.sections.todays_schedule.length > 0) {
    lines.push(`<b>📅 Today's Schedule</b>`);
    briefing.sections.todays_schedule.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.title}`);
    });
    lines.push('');
  }

  if (briefing.sections.at_risk.length > 0) {
    lines.push(`<b>⚠️ At Risk</b>`);
    briefing.sections.at_risk.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.title}`);
    });
    lines.push('');
  }

  if (briefing.sections.priority_inbox.length > 0) {
    lines.push(`<b>📬 Priority Inbox</b>`);
    briefing.sections.priority_inbox.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.title}`);
    });
    lines.push('');
  }

  lines.push(`Reply with a number to take action (e.g. <b>Do 3</b> or <b>Skip 2</b>)`);
  return lines.join('\n');
}
```

---

## AI — Anthropic

**API**: Anthropic Messages API  
**SDK**: `@anthropic-ai/sdk` (used via Vercel AI SDK)

### Setup
1. Go to https://console.anthropic.com > **API Keys** > **Create Key**
2. Name: `chief-of-staff-prod`

### Environment Variables
```
ANTHROPIC_API_KEY=
```

### Model Constants File
```typescript
// lib/ai/models.ts
// Import from here — never hardcode model strings in application code

export const AI_MODELS = {
  FAST: 'claude-haiku-4-5-20251001',     // ingestion, extraction pass 1, reply drafts
  STANDARD: 'claude-sonnet-4-6',         // briefing generation, meeting prep, extraction pass 2
  POWERFUL: 'claude-opus-4-6',           // complex analysis, used sparingly
} as const;

export type AIModel = typeof AI_MODELS[keyof typeof AI_MODELS];
```

---

## AI — OpenAI (Embeddings)

**API**: OpenAI Embeddings API  
**Model**: `text-embedding-3-small` (1536 dimensions — matches pgvector schema)

### Setup
1. Go to https://platform.openai.com/api-keys > **Create new secret key**
2. Name: `chief-of-staff-embeddings`

### Environment Variables
```
OPENAI_API_KEY=
```

### Embeddings Helper
```typescript
// lib/ai/embeddings.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8191),   // model token limit
  });
  return response.data[0].embedding;
}

export async function semanticSearch(
  userId: string,
  query: string,
  limit = 10
): Promise<DocumentChunk[]> {
  const { createClient } = await import('@/lib/db/client');
  const supabase = createClient();
  const queryEmbedding = await generateEmbedding(query);

  const { data } = await supabase.rpc('match_document_chunks', {
    query_embedding: queryEmbedding,
    match_user_id: userId,
    match_threshold: 0.78,
    match_count: limit,
  });
  return data ?? [];
}
```

### Supabase RPC Function for Vector Search
Add to migrations:
```sql
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  match_user_id uuid,
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  provider text,
  source_id text,
  content_summary text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.provider,
    dc.source_id,
    dc.content_summary,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  WHERE dc.user_id = match_user_id
    AND dc.expires_at > NOW()
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## Trigger.dev — Background Jobs

**API**: Trigger.dev v3  
**Docs**: https://trigger.dev/docs

### Setup
1. Go to https://cloud.trigger.dev > create project
2. Name: `chief-of-staff`
3. Copy **Project ID** and **Secret Key**
4. Install CLI: `npm install -g @trigger.dev/cli@latest`
5. Run `npx trigger.dev@latest init` in project root

### Environment Variables
```
TRIGGER_SECRET_KEY=
TRIGGER_PROJECT_ID=
```

### Heartbeat Job Pattern
```typescript
// trigger/heartbeat/gmail-scan.ts
import { schedules } from '@trigger.dev/sdk/v3';

export const gmailScan = schedules.task({
  id: 'gmail-scan',
  run: async (payload: { userId: string }) => {
    // Implementation in lib/ai/agents/ingestion.ts
  },
});
```

---

## WhatsApp (Twilio — apply in parallel, not needed for launch)

**Provider**: Twilio WhatsApp Business API  
**Status**: Apply for access on day 1. Telegram is the launch channel.

### Setup (when approved)
1. Create Twilio account at https://www.twilio.com
2. Navigate to **Messaging > WhatsApp > Senders** — request access
3. Create a **WhatsApp Message Service**
4. Configure webhook URL: `https://yourdomain.com/api/webhooks/whatsapp`
5. Message templates must be submitted and approved by Meta via Twilio before use

### Environment Variables
```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=    # Format: whatsapp:+1234567890
```

---

## Environment Variables — Complete Reference

Copy this to `.env.example` (with empty values):

```bash
# ── Application ──────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://your-app-url.com
NODE_ENV=development

# ── Supabase ─────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # Server-side only — never expose to client

# ── Nango (OAuth Token Vault) ────────────────────────────────
NANGO_SECRET_KEY=                  # Server-side only
NANGO_PUBLIC_KEY=                  # Safe to expose to client
NANGO_WEBHOOK_SECRET=

# ── AI Providers ─────────────────────────────────────────────
ANTHROPIC_API_KEY=                 # Server-side only
OPENAI_API_KEY=                    # Server-side only — for embeddings

# ── Telegram ─────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN=                # Server-side only
TELEGRAM_WEBHOOK_SECRET=           # Server-side only

# ── Trigger.dev ──────────────────────────────────────────────
TRIGGER_SECRET_KEY=
TRIGGER_PROJECT_ID=

# ── Google (set in Nango, but needed for push notifications) ─
GOOGLE_PUBSUB_TOPIC=               # projects/your-project/topics/gmail-push
GOOGLE_SERVICE_ACCOUNT_KEY=        # JSON — for Pub/Sub subscription

# ── WhatsApp / Twilio (apply in parallel, add when approved) ─
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=

# ── Monitoring ───────────────────────────────────────────────
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# ── Encryption ───────────────────────────────────────────────
ENCRYPTION_KEY=                    # 32-byte hex string — generated with: openssl rand -hex 32
```
