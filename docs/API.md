# Donna — API Endpoint Contracts

All routes are under `/api/`. All protected routes use the `withAuth` middleware.
All responses follow the standard shape defined below.

---

## Standard Response Shapes

```typescript
// Success
{ data: T, meta?: { page?: number, total?: number } }

// Error
{ error: string, code: string, details?: unknown }
```

### Error Codes
```
AUTH_REQUIRED          401 — No valid session
AUTH_FORBIDDEN         403 — Valid session but insufficient permission
NOT_FOUND              404 — Resource not found
VALIDATION_ERROR       422 — Request body failed Zod validation
RATE_LIMITED           429 — Too many requests
INTEGRATION_ERROR      502 — Third-party API call failed
INTERNAL_ERROR         500 — Unexpected server error
```

---

## Rate Limits

| Route Group | Limit |
|---|---|
| `/api/briefing/*` | 20 req/min per user |
| `/api/commitments/*` | 60 req/min per user |
| `/api/inbox/*` | 60 req/min per user |
| `/api/integrations/*` | 10 req/min per user |
| `/api/actions/*` | 30 req/min per user |
| `/api/webhooks/*` | 1000 req/min (verified by HMAC) |

---

## Auth Routes

### `POST /api/auth/signup`
**Public**
```typescript
// Request
{
  email: string;
  password: string;       // min 12 chars, 1 upper, 1 number, 1 special
  full_name?: string;
  timezone?: string;      // default: 'Asia/Dubai'
}

// Response 201
{
  data: {
    user_id: string;
    email: string;
    requires_email_verification: boolean;
  }
}
```

### `POST /api/auth/login`
**Public**
```typescript
// Request
{ email: string; password: string; totp_code?: string }

// Response 200
{ data: { session: SupabaseSession; profile: Profile } }
```

---

## Integration Routes

### `GET /api/integrations`
**Auth required**
Returns all integration connections for the current user.
```typescript
// Response 200
{
  data: Array<{
    id: string;
    provider: IntegrationProvider;
    status: IntegrationStatus;
    account_email: string | null;
    account_name: string | null;
    granted_scopes: string[];
    last_synced_at: string | null;
    connected_at: string;
  }>
}
```

### `POST /api/integrations/connect`
**Auth required**
Initiates an OAuth flow via Nango. Returns a Nango connect URL.
```typescript
// Request
{
  provider: IntegrationProvider;
  scopes?: string[];  // optional scope override; defaults to minimal initial scopes
}

// Response 200
{
  data: {
    connect_url: string;   // Nango hosted auth URL — redirect user here
    session_token: string; // Nango session token for this flow
  }
}
```

### `DELETE /api/integrations/disconnect`
**Auth required**
Revokes OAuth access and removes the integration. Triggers cleanup of ingested data.
```typescript
// Request
{ provider: IntegrationProvider }

// Response 200
{ data: { provider: IntegrationProvider; revoked_at: string } }
```

### `GET /api/integrations/[provider]/status`
**Auth required**
Returns health check for a specific integration.
```typescript
// Response 200
{
  data: {
    provider: IntegrationProvider;
    status: IntegrationStatus;
    last_synced_at: string | null;
    last_error: string | null;
    scope_coverage: {         // which features are available based on granted scopes
      inbox_read: boolean;
      sent_read: boolean;
      calendar_read: boolean;
      calendar_write: boolean;
      send_email: boolean;
    }
  }
}
```

### `POST /api/integrations/scopes/request`
**Auth required**
Requests additional OAuth scopes for an already-connected integration (incremental OAuth).
Only called when user activates a feature that needs additional scopes.
```typescript
// Request
{
  provider: IntegrationProvider;
  scope: string;             // the specific scope being requested
  feature_context: string;   // human-readable reason: "You're activating Commitment Tracker"
}

// Response 200
{ data: { connect_url: string } }   // Nango re-auth URL with additional scope
```

---

## Briefing Routes

### `GET /api/briefing/today`
**Auth required**
Returns today's briefing for the authenticated user. Generates it if not yet created.
```typescript
// Response 200
{
  data: {
    id: string;
    briefing_date: string;       // YYYY-MM-DD
    generated_at: string;
    sections: {
      todays_schedule: BriefingItem[];
      priority_inbox: BriefingItem[];
      commitment_queue: BriefingItem[];
      at_risk: BriefingItem[];
      decision_queue: BriefingItem[];
      quick_wins: BriefingItem[];
      people_context: BriefingItem[];
    };
    item_count: number;
    is_cached: boolean;          // true if retrieved from DB, false if freshly generated
  }
}

// BriefingItem shape
{
  id: string;
  rank: number;
  section: BriefingItemSection;
  item_type: BriefingItemType;
  title: string;
  summary: string;
  reasoning: string;             // shown in UI as "Why is this ranked here?"
  source_ref: {
    provider: string;
    message_id: string;
    url?: string;
    excerpt: string;             // short quote from source (< 15 words)
    sent_at?: string;
    from_name?: string;
  };
  action_suggestion: string | null;
  urgency_score: number;
  importance_score: number;
  risk_score: number;
  composite_score: number;
  user_feedback: -1 | 1 | null;
  snoozed_until: string | null;
}
```

### `POST /api/briefing/today/regenerate`
**Auth required** — Pro/Power tier only
Forces regeneration of today's briefing.
```typescript
// Response 202
{ data: { job_id: string; estimated_seconds: number } }
```

### `POST /api/briefing/feedback`
**Auth required**
Records thumbs up / down on a briefing item. Used to train the prioritisation model.
```typescript
// Request
{
  briefing_item_id: string;
  feedback: 1 | -1;             // 1 = thumbs up, -1 = thumbs down
}

// Response 200
{ data: { updated: true } }
```

### `POST /api/briefing/[item_id]/snooze`
**Auth required**
```typescript
// Request
{ snooze_until: string }  // ISO datetime

// Response 200
{ data: { snoozed_until: string } }
```

---

## Commitment Routes

### `GET /api/commitments`
**Auth required**
```typescript
// Query params
{
  status?: CommitmentStatus;     // default: 'open'
  page?: number;
  limit?: number;                // default 20, max 100
}

// Response 200
{
  data: CommitmentRecord[];
  meta: { page: number; total: number; overdue_count: number }
}

// CommitmentRecord shape
{
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  commitment_text: string;
  source_quote: string;          // always present — exact sentence from original
  source_ref: {
    provider: string;
    message_id: string;
    thread_id: string;
    sent_at: string;
  };
  confidence: CommitmentConfidence;
  confidence_score: number;
  implied_deadline: string | null;
  explicit_deadline: boolean;
  status: CommitmentStatus;
  days_overdue: number | null;   // computed, not stored
  resolved_at: string | null;
  snoozed_until: string | null;
  created_at: string;
}
```

### `PATCH /api/commitments/[id]`
**Auth required**
```typescript
// Request — one of:
{ action: 'resolve' }
{ action: 'snooze'; until: string }
{ action: 'delegate'; to: string }   // email address
{ action: 'dismiss' }
{ action: 'confirm' }                // user confirms AI extraction is correct
{ action: 'reject' }                 // user rejects AI extraction (trains model)

// Response 200
{ data: { id: string; status: CommitmentStatus; updated_at: string } }
```

---

## Inbox Routes

### `GET /api/inbox`
**Auth required**
```typescript
// Query params
{
  provider?: IntegrationProvider;
  filter?: 'all' | 'needs_reply' | 'starred' | 'snoozed';
  page?: number;
  limit?: number;   // default 20
}

// Response 200
{
  data: InboxItem[];
  meta: { page: number; total: number; needs_reply_count: number }
}

// InboxItem shape
{
  id: string;
  provider: IntegrationProvider;
  external_id: string;
  thread_id: string | null;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  ai_summary: string;            // AI summary — not raw body
  is_read: boolean;
  is_starred: boolean;
  needs_reply: boolean;
  reply_drafted: boolean;
  urgency_score: number | null;
  received_at: string;
  snoozed_until: string | null;
}
```

### `POST /api/inbox/[id]/draft`
**Auth required**
Generates a reply draft in the user's voice. Creates a `pending_actions` record.
```typescript
// Request
{
  instruction?: string;   // optional user instruction: "be brief", "ask about the timeline"
}

// Response 200
{
  data: {
    pending_action_id: string;  // user must confirm this before it is sent
    draft: {
      subject: string;
      body: string;
      tone: string;
      sources_used: number;     // how many messages informed this draft
    };
    expires_at: string;         // user has 24h to confirm or it's discarded
  }
}
```

### `POST /api/inbox/[id]/action`
**Auth required**
```typescript
// Request
{ action: 'archive' | 'star' | 'unstar' | 'snooze' | 'mark_read'; until?: string }

// Response 200
{ data: { id: string; action: string; applied_at: string } }
```

---

## People Routes

### `GET /api/people`
**Auth required**
```typescript
// Query params
{
  filter?: 'all' | 'vip' | 'cold';
  page?: number;
  limit?: number;   // default 20
}

// Response 200
{
  data: ContactSummary[];
  meta: { page: number; total: number; cold_count: number }
}

// ContactSummary
{
  id: string;
  email: string;
  name: string | null;
  organisation: string | null;
  is_vip: boolean;
  relationship_score: number | null;
  last_interaction_at: string | null;
  open_commitments_count: number;
  is_cold: boolean;
}
```

### `GET /api/people/[id]`
**Auth required**
Returns full contact profile with interaction history and open commitments.
```typescript
// Response 200
{
  data: {
    contact: ContactRecord;
    recent_interactions: ContactInteraction[];
    open_commitments: CommitmentRecord[];
    meeting_prep?: MeetingPrepCard;   // present if meeting with this person today
  }
}
```

---

## Actions Routes

### `POST /api/actions/confirm`
**Auth required**
User approves a pending action. Triggers execution.
```typescript
// Request
{ pending_action_id: string }

// Response 200
{
  data: {
    id: string;
    status: 'executed';
    executed_at: string;
    result_summary: string;   // "Email sent to sarah@acme.com"
  }
}
```

### `POST /api/actions/reject`
**Auth required**
User rejects a pending action. Records are kept for model feedback.
```typescript
// Request
{
  pending_action_id: string;
  reason?: string;  // optional feedback
}

// Response 200
{ data: { id: string; status: 'rejected' } }
```

---

## Telegram Routes

### `POST /api/webhooks/telegram`
**Public — HMAC verified**
Telegram sends all bot events here. MUST verify the `X-Telegram-Bot-Api-Secret-Token` header.
```typescript
// Telegram Update object (standard Telegram Bot API format)
// Internal — no consumer-facing request shape

// This route:
// 1. Verifies webhook secret token
// 2. Identifies user by chat_id
// 3. Parses command or free text
// 4. Routes to appropriate handler
// 5. Responds via Telegram API

// No response body needed — Telegram doesn't process it
// Returns 200 immediately to acknowledge receipt
```

### `POST /api/telegram/connect`
**Auth required**
Initiates Telegram connection. Returns a deep link for the user to open in Telegram.
```typescript
// Response 200
{
  data: {
    connect_url: string;    // https://t.me/DonnaBot?start=TOKEN
    token: string;          // one-time token, expires in 10 minutes
  }
}
```

---

## Heartbeat Routes

### `GET /api/heartbeat/config`
**Auth required**
```typescript
// Response 200
{ data: HeartbeatConfig }
```

### `PATCH /api/heartbeat/config`
**Auth required**
```typescript
// Request — partial update
{
  scan_frequency?: HeartbeatFrequency;
  vip_alerts_enabled?: boolean;
  commitment_check_enabled?: boolean;
  relationship_check_enabled?: boolean;
  document_index_enabled?: boolean;
  quiet_hours_start?: string;   // HH:MM
  quiet_hours_end?: string;     // HH:MM
  alert_channel?: MessageDeliveryChannel;
}

// Response 200
{ data: HeartbeatConfig }
```

### `GET /api/heartbeat/runs`
**Auth required**
Recent Heartbeat job executions (for the monitor dashboard).
```typescript
// Query params
{ limit?: number; job_name?: string }

// Response 200
{ data: HeartbeatRun[] }
```

---

## Settings Routes

### `GET /api/settings/sessions`
**Auth required**
All active sessions for the current user.
```typescript
// Response 200
{ data: UserSession[] }
```

### `DELETE /api/settings/sessions/[id]`
**Auth required**
Revoke a specific session.
```typescript
// Response 200
{ data: { revoked_at: string } }
```

### `GET /api/settings/audit-log`
**Auth required**
```typescript
// Query params
{ provider?: IntegrationProvider; limit?: number; page?: number }

// Response 200
{
  data: AuditLogEntry[];
  meta: { total: number; page: number }
}
```

### `DELETE /api/settings/account`
**Auth required** — requires password re-confirmation
Initiates account deletion. All user data deleted within 24 hours.
```typescript
// Request
{ password: string; confirmation: 'DELETE MY ACCOUNT' }

// Response 202
{ data: { deletion_scheduled_at: string; confirmation_email_sent: boolean } }
```

### `GET /api/settings/data-export`
**Auth required**
Triggers a full data export. User receives download link via email.
```typescript
// Response 202
{ data: { export_job_id: string; estimated_minutes: number } }
```
