# Donna — Integrations Setup Guide

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
2. Create a new project: `donna-prod`
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
2. Create a Pub/Sub topic: `donna-gmail-push`
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
3. Name: `Donna`
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
2. App Name: `Donna`, pick a workspace
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
2. Name: `Donna`
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

## AI — Anthropic

**API**: Anthropic Messages API  
**SDK**: `@anthropic-ai/sdk` (used via Vercel AI SDK)

### Setup
1. Go to https://console.anthropic.com > **API Keys** > **Create Key**
2. Name: `donna-prod`

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
2. Name: `donna-embeddings`

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
2. Name: `donna`
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

## Apple iCloud Mail + Calendar (TIER 1)

**Provider key in Nango**: `icloud`
**API**: iCloud Mail REST API + CalDAV

| Scope | When Added | Feature |
|---|---|---|
| Mail read | Initial connect | Inbox read, briefing |
| Calendar read | Initial connect | Calendar events |

### Apple Developer Setup
1. Go to https://developer.apple.com > Certificates, Identifiers & Profiles
2. Register a new App ID with **Sign In with Apple** capability
3. Create a **Services ID** for web authentication
4. Configure redirect URI: `https://api.nango.dev/oauth/callback`
5. Generate a private key for client secret generation

### Nango Configuration
Add `icloud` integration in Nango with Apple credentials.

### Runtime Usage
```typescript
// lib/integrations/apple-icloud.ts
import { getAccessToken } from './nango';

export async function getICloudAuthHeader(userId: string): Promise<string> {
  const accessToken = await getAccessToken(userId, 'icloud');
  return `Bearer ${accessToken}`;
}

export async function fetchICloudInboxMessages(userId: string, maxResults = 20);
export async function fetchICloudCalendarEvents(userId: string, maxResults = 20);
```

---

## Calendly (TIER 1)

**Provider key in Nango**: `calendly`
**API**: Calendly API v2
**Read-only**: We never create or modify Calendly events.

| Scope | When Added | Feature |
|---|---|---|
| Default (read) | Initial connect | Fetch upcoming bookings |

### Calendly Setup
1. Go to https://developer.calendly.com > **My Apps** > **Create App**
2. Set redirect URI: `https://api.nango.dev/oauth/callback`
3. Copy **Client ID** and **Client Secret**

### Nango Configuration
Add `calendly` integration in Nango.

### Runtime Usage
```typescript
// lib/integrations/calendly.ts
import { getAccessToken } from './nango';

export async function fetchUpcomingBookings(userId: string, maxResults = 20);
```

---

## Microsoft Teams (TIER 1)

**Provider key in Nango**: `microsoft-teams`
**API**: Microsoft Graph API v1.0 (Chat & Teams endpoints)

| Scope | When Added | Feature |
|---|---|---|
| `Chat.Read` | Initial connect | Read Teams chats and DMs |
| `ChannelMessage.Read.All` | Initial connect | Read channel messages |
| `User.Read` | Initial connect | Identify user |
| `offline_access` | Always | Refresh token |

### Azure App Registration
Uses the same Azure app as Outlook. Add the Teams-specific scopes above.

### Nango Configuration
Add `microsoft-teams` integration in Nango with Azure credentials.

### Runtime Usage
```typescript
// lib/integrations/microsoft-teams.ts
import { Client } from '@microsoft/microsoft-graph-client';
import { getAccessToken } from './nango';

export async function fetchTeamsMessages(userId: string, limit = 20);
export async function fetchTeamsDMs(userId: string, limit = 20);
```

---

## LinkedIn Messages (TIER 1)

**Provider key in Nango**: `linkedin`
**API**: LinkedIn Messaging API v2
**Read-only**: We never send messages without explicit user confirmation.

| Scope | When Added | Feature |
|---|---|---|
| `r_liteprofile` | Initial connect | User identity |
| `r_emailaddress` | Initial connect | Email matching |
| `w_member_social` | Initial connect | Messaging access |

### LinkedIn Developer Setup
1. Go to https://www.linkedin.com/developers > **My Apps** > **Create App**
2. Request access to **Marketing Developer Platform** (for messaging)
3. Set redirect URI: `https://api.nango.dev/oauth/callback`
4. Copy **Client ID** and **Client Secret**

### Nango Configuration
Add `linkedin` integration in Nango.

### Runtime Usage
```typescript
// lib/integrations/linkedin.ts
import { getAccessToken } from './nango';

export async function fetchUnreadLinkedInMessages(userId: string, limit = 20);
```

---

## Twitter / X DMs (TIER 1)

**Provider key in Nango**: `twitter`
**API**: Twitter API v2
**Read-only**: We never send tweets or DMs without explicit user confirmation.

| Scope | When Added | Feature |
|---|---|---|
| `dm.read` | Initial connect | Read DMs |
| `users.read` | Initial connect | User identity |
| `tweet.read` | Initial connect | Required by API |
| `offline.access` | Always | Refresh token |

### Twitter Developer Setup
1. Go to https://developer.twitter.com > **Developer Portal** > **Projects & Apps**
2. Create a project and app with **OAuth 2.0** enabled
3. Set redirect URI: `https://api.nango.dev/oauth/callback`
4. Copy **Client ID** and **Client Secret**
5. Requires **Basic** or higher API tier for DM access

### Nango Configuration
Add `twitter` integration in Nango.

### Runtime Usage
```typescript
// lib/integrations/twitter.ts
import { getAccessToken } from './nango';

export async function fetchUnreadTwitterDMs(userId: string, limit = 20);
```

---

## Google Drive (TIER 2)

**Provider key in Nango**: `google-drive`
**API**: Google Drive API v3
*(Uses the same Google OAuth client as Gmail)*

| Scope | When Added | Feature |
|---|---|---|
| `https://www.googleapis.com/auth/drive.readonly` | Initial connect | Index documents |

### Nango Configuration
Add `google-drive` in Nango — same Client ID and Secret as Gmail.

### Runtime Usage
```typescript
// lib/integrations/google-drive.ts
import { google } from 'googleapis';
import { getAccessToken } from './nango';

export async function listRecentDriveDocuments(userId: string, maxResults = 30);
export async function exportDriveDocumentText(userId: string, fileId: string, mimeType: string);
```

---

## Dropbox (TIER 2)

**Provider key in Nango**: `dropbox`
**API**: Dropbox API v2

| Scope | When Added | Feature |
|---|---|---|
| `files.content.read` | Initial connect | Read and index files |
| `files.metadata.read` | Initial connect | List recent files |

### Dropbox Developer Setup
1. Go to https://www.dropbox.com/developers > **App Console** > **Create App**
2. Choose **Scoped access** > **Full Dropbox**
3. Add redirect URI: `https://api.nango.dev/oauth/callback`
4. Copy **App key** and **App secret**

### Nango Configuration
Add `dropbox` integration in Nango.

### Runtime Usage
```typescript
// lib/integrations/dropbox.ts
import { getAccessToken } from './nango';

export async function listRecentDropboxFiles(userId: string, maxResults = 30);
export async function downloadDropboxFileText(userId: string, path: string);
```

---

## OneDrive (TIER 2)

**Provider key in Nango**: `microsoft` (shared with Outlook)
**API**: Microsoft Graph API v1.0

| Scope | When Added | Feature |
|---|---|---|
| `Files.Read` | Initial connect | Read and index files |

### Azure App Registration
Uses the same Azure app as Outlook. Add the `Files.Read` scope.

### Runtime Usage
```typescript
// lib/integrations/onedrive.ts
import { Client } from '@microsoft/microsoft-graph-client';
import { getAccessToken } from './nango';

export async function listRecentOneDriveFiles(userId: string, maxResults = 30);
export async function downloadOneDriveFileText(userId: string, fileId: string);
```

---

## Asana (TIER 2)

**Provider key in Nango**: `asana`
**API**: Asana REST API v1

### Asana Developer Setup
1. Go to https://app.asana.com/0/developer-console > **Create New App**
2. Set redirect URI: `https://api.nango.dev/oauth/callback`
3. Copy **Client ID** and **Client Secret**

### Nango Configuration
Add `asana` integration in Nango.

### Runtime Usage
```typescript
// lib/integrations/asana.ts
import { getAccessToken } from './nango';

export async function fetchAssignedAsanaTasks(userId: string, limit = 50);
```

---

## Monday.com (TIER 2)

**Provider key in Nango**: `monday`
**API**: Monday.com GraphQL API

### Monday.com Developer Setup
1. Go to https://monday.com/developers/apps > **Create App**
2. Add OAuth scopes: `boards:read`, `workspaces:read`, `users:read`
3. Set redirect URI: `https://api.nango.dev/oauth/callback`
4. Copy **Client ID** and **Client Secret**

### Nango Configuration
Add `monday` integration in Nango.

### Runtime Usage
```typescript
// lib/integrations/monday.ts
import { getAccessToken } from './nango';

export async function fetchAssignedMondayItems(userId: string, limit = 50);
```

---

## Jira (TIER 2)

**Provider key in Nango**: `jira`
**API**: Jira REST API v3 (Atlassian Cloud)

### Atlassian Developer Setup
1. Go to https://developer.atlassian.com > **Developer Console** > **Create OAuth 2.0 App**
2. Add scopes: `read:jira-work`, `read:jira-user`
3. Set redirect URI: `https://api.nango.dev/oauth/callback`
4. Copy **Client ID** and **Client Secret**

### Nango Configuration
Add `jira` integration in Nango.

### Runtime Usage
```typescript
// lib/integrations/jira.ts
import { getAccessToken } from './nango';

export async function fetchAssignedJiraIssues(userId: string, limit = 50);
```

---

## Linear (TIER 2)

**Provider key in Nango**: `linear`
**API**: Linear GraphQL API

### Linear Developer Setup
1. Go to https://linear.app/settings/api > **OAuth Applications** > **Create**
2. Set redirect URI: `https://api.nango.dev/oauth/callback`
3. Copy **Client ID** and **Client Secret**

### Nango Configuration
Add `linear` integration in Nango.

### Runtime Usage
```typescript
// lib/integrations/linear.ts
import { getAccessToken } from './nango';

export async function fetchAssignedLinearIssues(userId: string, limit = 50);
```

---

## ClickUp (TIER 2)

**Provider key in Nango**: `clickup`
**API**: ClickUp API v2

### ClickUp Developer Setup
1. Go to https://app.clickup.com/settings/integrations > **ClickUp API** > **Create App**
2. Set redirect URI: `https://api.nango.dev/oauth/callback`
3. Copy **Client ID** and **Client Secret**

### Nango Configuration
Add `clickup` integration in Nango.

### Runtime Usage
```typescript
// lib/integrations/clickup.ts
import { getAccessToken } from './nango';

export async function fetchAssignedClickUpTasks(userId: string, limit = 50);
```

---

## Trello (TIER 2)

**Provider key in Nango**: `trello`
**API**: Trello REST API

### Trello Developer Setup
1. Go to https://trello.com/power-ups/admin > **New Power-Up**
2. Set redirect URI: `https://api.nango.dev/oauth/callback`
3. Copy **API Key** and **API Secret**

### Nango Configuration
Add `trello` integration in Nango.

### Runtime Usage
```typescript
// lib/integrations/trello.ts
import { getAccessToken } from './nango';

export async function fetchAssignedTrelloCards(userId: string, limit = 50);
```

---

## HubSpot (TIER 2)

**Provider key in Nango**: `hubspot`
**API**: HubSpot CRM API v3

| Scope | When Added | Feature |
|---|---|---|
| `crm.objects.deals.read` | Initial connect | Read deals |
| `crm.objects.contacts.read` | Initial connect | Read contacts |
| `crm.objects.owners.read` | Initial connect | Match tasks to user |

### HubSpot Developer Setup
1. Go to https://developers.hubspot.com > **Manage Apps** > **Create App**
2. Add the scopes listed above
3. Set redirect URI: `https://api.nango.dev/oauth/callback`
4. Copy **Client ID** and **Client Secret**

### Nango Configuration
Add `hubspot` integration in Nango.

### Runtime Usage
```typescript
// lib/integrations/hubspot.ts
import { getAccessToken } from './nango';

export async function fetchHubSpotDeals(userId: string, limit = 25);
export async function fetchHubSpotTasks(userId: string, limit = 25);
```

---

## Salesforce (TIER 2)

**Provider key in Nango**: `salesforce`
**API**: Salesforce REST API + SOQL

| Scope | When Added | Feature |
|---|---|---|
| `api` | Initial connect | REST API access |
| `refresh_token` | Always | Offline access |

### Salesforce Developer Setup
1. Go to Salesforce Setup > **App Manager** > **New Connected App**
2. Enable OAuth and add the scopes listed above
3. Set redirect URI: `https://api.nango.dev/oauth/callback`
4. Copy **Consumer Key** (Client ID) and **Consumer Secret**

### Nango Configuration
Add `salesforce` integration in Nango.

### Runtime Usage
```typescript
// lib/integrations/salesforce.ts
import { getAccessToken } from './nango';

export async function fetchSalesforceOpportunities(userId: string, limit = 25);
export async function fetchSalesforceTasks(userId: string, limit = 25);
```

---

## Pipedrive (TIER 2)

**Provider key in Nango**: `pipedrive`
**API**: Pipedrive REST API v1

### Pipedrive Developer Setup
1. Go to https://developers.pipedrive.com > **Developer Hub** > **Create App**
2. Choose **OAuth** app type
3. Set redirect URI: `https://api.nango.dev/oauth/callback`
4. Copy **Client ID** and **Client Secret**

### Nango Configuration
Add `pipedrive` integration in Nango.

### Runtime Usage
```typescript
// lib/integrations/pipedrive.ts
import { getAccessToken } from './nango';

export async function fetchPipedriveDeals(userId: string, limit = 25);
export async function fetchPipedriveActivities(userId: string, limit = 25);
```

---

## GitHub (TIER 2)

**Provider key in Nango**: `github`
**API**: GitHub REST API v3

| Scope | When Added | Feature |
|---|---|---|
| `repo` | Initial connect | Read PR reviews |
| `notifications` | Initial connect | Read @mentions |

### GitHub Developer Setup
1. Go to https://github.com/settings/developers > **OAuth Apps** > **New OAuth App**
2. Set redirect URI: `https://api.nango.dev/oauth/callback`
3. Copy **Client ID** and **Client Secret**

### Nango Configuration
Add `github` integration in Nango.

### Runtime Usage
```typescript
// lib/integrations/github.ts
import { getAccessToken } from './nango';

export async function fetchGitHubPRReviews(userId: string, limit = 20);
export async function fetchGitHubMentions(userId: string, limit = 20);
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

---

## TIER 1 Integrations

### Apple iCloud Mail + Calendar

**Nango Provider:** `icloud`

Apple iCloud Mail and Calendar are accessed via Apple's OAuth 2.0 flow (Sign in with Apple / iCloud auth), managed entirely through Nango.

**Setup in Nango:**
1. Create an Apple Services ID in the Apple Developer portal
2. Enable "Sign in with Apple" capability
3. Add the Nango callback URL as a return URL
4. Configure the `icloud` provider in your Nango dashboard

**Scopes requested:**
- `mail.read` — Read iCloud Mail inbox
- `calendar.read` — Read iCloud Calendar events

**What we read:** Unread iCloud Mail messages (metadata + body for AI summarisation only, never stored). Upcoming calendar events for meeting prep.

---

### Calendly

**Nango Provider:** `calendly`

Fetches upcoming scheduled events (bookings) for the authenticated user. Read-only.

**Setup in Nango:**
1. Create an OAuth app at [developer.calendly.com](https://developer.calendly.com)
2. Add credentials to Nango as `CALENDLY_CLIENT_ID` / `CALENDLY_CLIENT_SECRET`
3. Set redirect URI to your Nango callback URL

**Scopes requested:**
- `default` — Read scheduled events and invitee info

**What we read:** Upcoming active bookings with guest name/email and event type.

---

### Microsoft Teams

**Nango Provider:** `microsoft-teams`

Uses Microsoft Graph API (same Azure AD OAuth as Outlook) to fetch Teams messages and @mentions.

**Setup in Nango:**
Uses the same Microsoft OAuth app as Outlook. Ensure the following scopes are added in addition to mail/calendar scopes:
- `Chat.Read` — Read Teams chat messages
- `ChannelMessage.Read.All` — Read Teams channel messages

**What we read:** Recent Teams DMs and channel messages where the user is mentioned. Message bodies are never stored — only AI summaries.

---

### LinkedIn Messages

**Nango Provider:** `linkedin`

Fetches unread LinkedIn conversation messages via the LinkedIn Messaging API v2.

**Setup in Nango:**
1. Create a LinkedIn Developer App at [developer.linkedin.com](https://developer.linkedin.com)
2. Request access to the Sign In with LinkedIn and Messaging APIs
3. Add credentials as `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`

**Scopes requested:**
- `r_liteprofile` — Read basic profile
- `r_emailaddress` — Read email
- `w_member_social` — Required by LinkedIn for messaging access
- `r_messages` — Read messages (requires LinkedIn approval)

**What we read:** Unread conversation threads and their most recent messages. Bodies are never stored — only AI summaries.

---

### Twitter / X DMs

**Nango Provider:** `twitter`

Fetches unread Direct Messages from Twitter/X API v2.

**Setup in Nango:**
1. Create a Twitter Developer App at [developer.x.com](https://developer.x.com)
2. Enable OAuth 2.0 with PKCE
3. Add credentials as `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET`

**Scopes requested:**
- `dm.read` — Read Direct Messages
- `tweet.read` — Read tweets (required baseline)
- `users.read` — Read user profiles

**What we read:** Unread DMs from the last 24 hours. Message bodies are never stored — only AI summaries.

---

## TIER 2 Integrations

### Google Drive

**Nango Provider:** `google-drive`

Uses the same Google OAuth flow as Gmail. No additional app credentials needed — just enable the Drive API scope.

**Additional scopes required:**
- `https://www.googleapis.com/auth/drive.readonly` — Read Drive files

**What we read:** Recently modified Docs, Presentations, and text files. Files are exported as plain text for AI indexing — raw content is never stored.

---

### Dropbox

**Nango Provider:** `dropbox`

Indexes text-based documents from Dropbox for meeting prep and context retrieval.

**Setup in Nango:**
1. Create an app at [dropbox.com/developers](https://dropbox.com/developers)
2. Add credentials as `DROPBOX_CLIENT_ID` / `DROPBOX_CLIENT_SECRET`

**Scopes requested:**
- `files.content.read` — Read file content
- `files.metadata.read` — Read file metadata

**What we read:** Recently modified `.txt`, `.md`, `.csv`, and similar text files. Raw content is never stored — only AI-generated summaries.

---

### OneDrive

**Nango Provider:** `microsoft` (same as Outlook)

Uses the same Microsoft OAuth app. Add the following scope:
- `Files.Read` — Read OneDrive files

**What we read:** Recently modified Office documents and text files. Raw content is never stored — only AI-generated summaries.

---

### Asana

**Nango Provider:** `asana`

Fetches tasks assigned to the authenticated user across all workspaces.

**Setup in Nango:**
1. Create an OAuth app at [app.asana.com/0/developer-console](https://app.asana.com/0/developer-console)
2. Add credentials as `ASANA_CLIENT_ID` / `ASANA_CLIENT_SECRET`

**Scopes requested:**
- `default` — Read tasks, projects, and workspaces

**What we read:** Open (incomplete) tasks assigned to the user, with project and due date context.

---

### Monday.com

**Nango Provider:** `monday`

Fetches board items assigned to the authenticated user via Monday.com's GraphQL API.

**Setup in Nango:**
1. Create an OAuth app at [monday.com/developers](https://monday.com/developers)
2. Add credentials as `MONDAY_CLIENT_ID` / `MONDAY_CLIENT_SECRET`

**Scopes requested:**
- `boards:read` — Read boards and items
- `users:read` — Read user profile

**What we read:** Items across all accessible boards with status, due date, and assignee context.

---

### Jira

**Nango Provider:** `jira`

Fetches issues assigned to the authenticated user via the Atlassian REST API (Jira Cloud).

**Setup in Nango:**
1. Create an OAuth 2.0 app at [developer.atlassian.com](https://developer.atlassian.com)
2. Add credentials as `ATLASSIAN_CLIENT_ID` / `ATLASSIAN_CLIENT_SECRET`

**Scopes requested:**
- `read:jira-work` — Read issues and projects
- `read:jira-user` — Read user profile
- `offline_access` — Refresh tokens

**What we read:** Open (unresolved) issues assigned to the user, with priority, status, and project context.

---

### Linear

**Nango Provider:** `linear`

Fetches issues assigned to the authenticated user via Linear's GraphQL API.

**Setup in Nango:**
1. Create an OAuth app at [linear.app/settings/api](https://linear.app/settings/api)
2. Add credentials as `LINEAR_CLIENT_ID` / `LINEAR_CLIENT_SECRET`

**Scopes requested:**
- `read` — Read issues, teams, and projects

**What we read:** Open issues assigned to the user, with team, project, priority, and due date context.

---

### ClickUp

**Nango Provider:** `clickup`

Fetches tasks assigned to the authenticated user across all ClickUp teams.

**Setup in Nango:**
1. Create an OAuth app at [app.clickup.com/settings/integrations](https://app.clickup.com/settings/integrations)
2. Add credentials as `CLICKUP_CLIENT_ID` / `CLICKUP_CLIENT_SECRET`

**Scopes requested:**
- ClickUp's default OAuth scope (all workspaces the user belongs to)

**What we read:** Open tasks assigned to the user, with space, folder, list, and due date context.

---

### Trello

**Nango Provider:** `trello`

Fetches cards assigned to the authenticated user across all boards.

**Setup in Nango:**
1. Create a Power-Up at [trello.com/power-ups/admin](https://trello.com/power-ups/admin)
2. Generate an API key — Nango handles the OAuth token exchange

**Scopes requested:**
- `read` — Read boards, lists, and cards

**What we read:** Open (non-archived) cards assigned to the user, with board, list, label, and due date context.

---

### HubSpot

**Nango Provider:** `hubspot`

Fetches deals, contacts, and tasks from HubSpot CRM.

**Setup in Nango:**
1. Create an OAuth app in [HubSpot Developer portal](https://developers.hubspot.com)
2. Add credentials as `HUBSPOT_CLIENT_ID` / `HUBSPOT_CLIENT_SECRET`

**Scopes requested:**
- `crm.objects.deals.read` — Read deals
- `crm.objects.contacts.read` — Read contacts
- `crm.objects.tasks.read` — Read tasks

**What we read:** Open deals and incomplete tasks. Deal amounts, stages, and close dates surface in your pipeline briefing.

---

### Salesforce

**Nango Provider:** `salesforce`

Fetches opportunities, tasks, and contacts from Salesforce CRM.

**Setup in Nango:**
1. Create a Connected App in Salesforce Setup → App Manager
2. Enable OAuth, add Nango callback URL
3. Add credentials as `SALESFORCE_CLIENT_ID` / `SALESFORCE_CLIENT_SECRET`
4. Set `SALESFORCE_INSTANCE_URL` to your Salesforce domain (e.g. `https://yourorg.my.salesforce.com`)

**Scopes requested:**
- `api` — Full API access (read only via SOQL)
- `refresh_token` — Token refresh

**What we read:** Open opportunities and incomplete tasks assigned to the user.

---

### Pipedrive

**Nango Provider:** `pipedrive`

Fetches open deals and upcoming activities for the authenticated Pipedrive user.

**Setup in Nango:**
1. Create an OAuth app at [pipedrive.com/developer](https://pipedrive.com/developer)
2. Add credentials as `PIPEDRIVE_CLIENT_ID` / `PIPEDRIVE_CLIENT_SECRET`

**Scopes requested:**
- `deals:read` — Read deals
- `activities:read` — Read activities
- `contacts:read` — Read contacts

**What we read:** Open deals and pending activities (calls, meetings, emails) with person and organisation context.

---

### GitHub

**Nango Provider:** `github`

Fetches pull requests awaiting review and @mentions for the authenticated GitHub user.

**Setup in Nango:**
1. Create an OAuth App at [github.com/settings/developers](https://github.com/settings/developers)
2. Add credentials as `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`

**Scopes requested:**
- `repo` — Read access to repositories (for PR reviews)
- `notifications` — Read notification subscriptions
- `user:email` — Read email for contact matching

**What we read:** PRs where the user is requested as reviewer, and issues/PRs where the user is @mentioned in the last 7 days.
