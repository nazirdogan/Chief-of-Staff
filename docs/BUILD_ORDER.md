# Donna — Claude Code Build Order

This is the sequenced build plan for Claude Code sessions. Each session has a
focused scope, clear inputs, and a definition of done. Do not skip sessions or
combine sessions — each one builds on the last.

Before every session: re-read CLAUDE.md.
After every session: run `npm run typecheck` and `npm run lint`. Fix all errors before next session.

---

## Session 0 — Project Scaffolding (Do this manually, not via Claude Code)

```bash
npx create-next-app@latest donna --typescript --tailwind --app --src-dir no --import-alias "@/*"
cd donna
npx shadcn@latest init
npm install @supabase/supabase-js @supabase/ssr
npm install @nangohq/node nango
npm install @anthropic-ai/sdk openai
npm install @trigger.dev/sdk @trigger.dev/nextjs
npm install @upstash/ratelimit @upstash/redis
npm install googleapis @microsoft/microsoft-graph-client
npm install @slack/web-api @notionhq/client
npm install react-hook-form @hookform/resolvers zod
npm install zustand
npm install date-fns
npm install @sentry/nextjs
npx supabase init
```

Copy `CLAUDE.md` into project root.  
Copy all files from `docs/` into `docs/` in project root.  
Create `.env.example` from the variables listed in `docs/INTEGRATIONS.md`.  
Create `.env.local` with actual values for local development.

---

## Session 1 — Configuration, Types & Database Client

**Goal**: All foundational infrastructure in place. No features yet.

**What to build**:
1. `lib/config.ts` — Zod-validated environment variables. All env vars accessed through this.
2. `lib/errors.ts` — Typed error classes (`AppError`, `AuthError`, `IntegrationError`, etc.)
3. `lib/db/client.ts` — Supabase browser and server clients
4. `lib/db/types.ts` — TypeScript types matching every database table (see DATABASE.md)
5. `lib/ai/models.ts` — AI model constants (FAST, STANDARD, POWERFUL)
6. `supabase/migrations/001_initial_schema.sql` — Full schema from DATABASE.md
7. `supabase/migrations/002_vector_search_function.sql` — The `match_document_chunks` RPC function
8. `.env.example` — All env vars with empty values and comments

**Definition of done**:
- `npm run typecheck` passes
- `supabase db push` applies migrations without errors
- All tables exist with RLS enabled (verify in Supabase dashboard)
- `lib/config.ts` throws a clear error at startup if any required env var is missing

---

## Session 2 — Auth & Middleware

**Goal**: Authentication works end-to-end. All middleware in place.

**What to build**:
1. `lib/middleware/withAuth.ts` — Auth middleware (see SECURITY.md)
2. `lib/middleware/withRateLimit.ts` — Rate limiting middleware
3. `lib/middleware/withWebhookVerification.ts` — HMAC webhook verification
4. `lib/utils/encryption.ts` — AES-256 encrypt/decrypt utilities
5. `middleware.ts` (Next.js root) — Protect all `/dashboard` routes, redirect unauthenticated to `/login`
6. `app/(auth)/login/page.tsx` — Login page (email + password + TOTP if enabled)
7. `app/(auth)/signup/page.tsx` — Signup page
8. `app/api/auth/[...supabase]/route.ts` — Supabase auth callback handler
9. `app/(dashboard)/layout.tsx` — Dashboard shell with nav sidebar (no features yet, just layout)

**Definition of done**:
- Can sign up with email and password
- Email verification flow works
- Login redirects to `/` (dashboard)
- Unauthenticated visit to `/` redirects to `/login`
- `withAuth` middleware correctly returns 401 on missing/invalid session
- Security headers present on all responses (verify with curl)

---

## Session 3 — Nango Integration Layer

**Goal**: OAuth connection flow works for Gmail. Foundation for all integrations.

**What to build**:
1. `lib/integrations/nango.ts` — Nango client, `getAccessToken()`, `getConnectUrl()` (see INTEGRATIONS.md)
2. `app/api/integrations/connect/route.ts` — POST: initiate OAuth via Nango
3. `app/api/integrations/disconnect/route.ts` — DELETE: revoke integration
4. `app/api/integrations/route.ts` — GET: list user's integrations
5. `app/api/webhooks/nango/route.ts` — Nango webhook handler (token refresh events)
6. `app/(dashboard)/settings/integrations/page.tsx` — Integrations settings page
7. `components/onboarding/OAuthConsentScreen.tsx` — Pre-consent education screen (see Section 4.3 of MVP doc)

**Definition of done**:
- Can navigate to Settings > Integrations
- Clicking "Connect Gmail" shows the OAuthConsentScreen with permission explanations
- After consenting, redirects to Nango's OAuth flow
- After OAuth completes, integration appears as "connected" in the UI
- `nango.getAccessToken()` returns a valid token without error
- Disconnecting removes the integration and shows "disconnected"

---

## Session 4 — Gmail Integration & Ingestion

**Goal**: Gmail messages are fetched, processed, and stored. No AI briefing yet.

**What to build**:
1. `lib/ai/safety/sanitise.ts` — `sanitiseContent()` and `buildSafeAIContext()` (see SECURITY.md)
2. `lib/integrations/gmail.ts` — Gmail API wrappers (see INTEGRATIONS.md)
3. `lib/ai/agents/ingestion.ts` — `ingestGmailMessages()` with AI summarisation
4. `lib/ai/prompts/briefing.ts` — `INGESTION_PROMPT` constant
5. `lib/db/queries/inbox.ts` — Typed query functions for inbox_items table
6. `trigger/heartbeat/gmail-scan.ts` — Trigger.dev job for Gmail scanning
7. `app/api/integrations/[provider]/status/route.ts` — Integration health check

**Definition of done**:
- Gmail scan job runs successfully (trigger it manually via Trigger.dev dashboard)
- Inbox items appear in `inbox_items` table with `ai_summary` populated
- Raw email body is NOT stored anywhere in the database
- `sanitiseContent()` is called before every AI call — verify in code review
- Injection pattern in a test email is sanitised (write a unit test for this)

---

## Session 5 — Google Calendar Integration

**Goal**: Calendar events are fetched and today's schedule is available.

**What to build**:
1. `lib/integrations/google-calendar.ts` — Calendar API wrappers
2. `trigger/heartbeat/calendar-scan.ts` — Trigger.dev job for calendar scanning
3. Add Google Calendar to the integrations connect flow (Session 3 built the framework)

**Definition of done**:
- After connecting Google Calendar, today's events appear
- Events include attendee names and meeting links
- Calendar scan job runs without errors

---

## Session 6 — Commitment Extraction Agent

**Goal**: The Commitment Tracker works end-to-end.

**What to build**:
1. `lib/ai/prompts/commitment-extraction.ts` — Both pass prompts (see AGENTS.md)
2. `lib/ai/agents/commitment.ts` — Two-pass extraction agent (see AGENTS.md)
3. `lib/ai/safety/citation-validator.ts` — Citation validation (see SECURITY.md)
4. `lib/db/queries/commitments.ts` — Typed query functions for commitments table
5. `trigger/heartbeat/commitment-check.ts` — Trigger.dev job
6. `app/api/commitments/route.ts` — GET list, POST manual add
7. `app/api/commitments/[id]/route.ts` — PATCH (resolve/snooze/dismiss/confirm/reject)
8. `components/commitments/CommitmentCard.tsx` — Shows source_quote + actions
9. `components/commitments/CommitmentQueue.tsx` — List component
10. `app/(dashboard)/commitments/page.tsx` — Commitments page

**Definition of done**:
- Commitment extraction runs on outbound Gmail messages
- Commitments appear in the UI with source_quote (the exact sentence) visible
- High confidence commitments (8+) show in main queue; medium (6-7) labelled "Possible"
- One-tap resolve/snooze/dismiss works
- Dismissing a commitment writes the feedback signal (for model training)
- `validateBriefingItem()` is called before every DB insert — write a test for this

---

## Session 7 — Daily Briefing Generation

**Goal**: Full daily briefing generates and displays in the dashboard.

**What to build**:
1. `lib/ai/agents/prioritisation.ts` — 5-dimension scoring engine (see AGENTS.md)
2. `lib/ai/agents/briefing.ts` — Briefing orchestrator (see AGENTS.md)
3. `lib/db/queries/briefings.ts` — Typed query functions
4. `trigger/briefing/generate-daily-briefing.ts` — Daily briefing job
5. `app/api/briefing/today/route.ts` — GET today's briefing
6. `app/api/briefing/feedback/route.ts` — POST thumbs up/down
7. `components/briefing/BriefingItem.tsx` — Single item with reasoning + citation
8. `components/briefing/CitationDrawer.tsx` — Slide-up panel showing source content
9. `components/briefing/BriefingSection.tsx` — Section container
10. `app/(dashboard)/page.tsx` — Daily Briefing home page

**Definition of done**:
- Briefing generates with items from inbox and calendar
- Each item shows: title, summary, one-line reasoning ("Ranked #1 because...")
- Tapping an item shows the CitationDrawer with source excerpt
- Thumbs up/down works and writes to database
- All briefing items have `source_ref` — verify no item inserts without one
- Briefing delivers to Telegram if `telegram_chat_id` is set

---

## Session 8 — Telegram Bot & WhatsApp Apply

**Goal**: Telegram bot works end-to-end. WhatsApp application submitted.

**What to build**:
1. `lib/integrations/telegram.ts` — Send message, format briefing for Telegram (see INTEGRATIONS.md)
2. `app/api/webhooks/telegram/route.ts` — Webhook handler with HMAC verification
3. `app/api/telegram/connect/route.ts` — Generate connect deep link
4. Telegram command handlers: `/start`, `/briefing`, `do N`, `skip N`, `remind N at TIME`
5. `scripts/setup-telegram-webhook.ts` — One-time webhook registration script
6. Telegram connection step in onboarding flow

**Also do**:
- Submit WhatsApp Business API application to Meta (do this manually)
- Document the application submission in a `docs/WHATSAPP_STATUS.md` file

**Definition of done**:
- User can connect Telegram from onboarding or settings
- Daily briefing delivers to Telegram at configured time
- Replying "do 2" generates a draft for item #2 and sends it back in Telegram
- Replying "skip 1" archives item #1
- Webhook verification rejects requests without the correct secret token

---

## Session 9 — Relationship Intelligence

**Goal**: Contact profiles are auto-built and cold contact alerts work.

**What to build**:
1. `lib/ai/agents/relationship.ts` — Scoring, cold detection (see AGENTS.md)
2. `lib/db/queries/contacts.ts` — Typed query functions
3. `trigger/heartbeat/relationship-check.ts` — Weekly relationship scoring job
4. `app/api/people/route.ts` — GET contact list
5. `app/api/people/[id]/route.ts` — GET contact detail
6. `components/people/ContactCard.tsx`
7. `app/(dashboard)/people/page.tsx` — People page

**Definition of done**:
- Contact cards auto-populate from Gmail interaction history
- Relationship score reflects recency and frequency
- Cold contacts (VIPs not contacted in 14+ days) are flagged
- Cold contact alert appears in next morning's briefing

---

## Session 10 — Onboarding Flow

**Goal**: The full 5-minute onboarding works end-to-end.

**What to build**:
1. `components/onboarding/OnboardingFlow.tsx` — Multi-step flow container
2. `components/onboarding/VIPSetupStep.tsx` — Enter 5 VIP contacts
3. `components/onboarding/ProjectSetupStep.tsx` — Enter active projects + weekly priority
4. `components/onboarding/CommitmentCalibrationStep.tsx` — Review 10 extracted commitments
5. `app/(auth)/onboarding/page.tsx` — Onboarding page (redirect here after signup if `onboarding_completed = false`)

**Definition of done**:
- New user is redirected to onboarding after email verification
- Completing onboarding sets `profiles.onboarding_completed = true`
- VIP contacts from onboarding immediately boost those contacts' importance score
- Commitment calibration shows 10 real extracted commitments from last 30 days
- Confirm/dismiss on calibration commitments trains the model

---

## Session 11 — Heartbeat Monitor UI + Settings

**Goal**: Users can configure and monitor their Heartbeat.

**What to build**:
1. `app/api/heartbeat/config/route.ts` — GET and PATCH config
2. `app/api/heartbeat/runs/route.ts` — GET recent runs
3. `components/heartbeat/HeartbeatMonitor.tsx` — Visual config + run log
4. `app/(dashboard)/heartbeat/page.tsx`
5. `app/(dashboard)/settings/security/page.tsx` — Sessions, audit log, 2FA
6. `app/api/settings/sessions/route.ts` — GET and DELETE sessions
7. `app/api/settings/audit-log/route.ts` — GET audit log

**Definition of done**:
- Heartbeat config page shows all toggles and frequency controls
- Recent run log shows job name, status, items processed, duration
- Security page shows all active sessions with device info
- User can revoke any session
- Audit log shows last 50 API calls per integration

---

## Session 12 — Pending Actions + Write Execution

**Goal**: AI can propose actions; user confirms; they execute.

**What to build**:
1. `lib/actions/executor.ts` — `executeConfirmedAction()` (see SECURITY.md)
2. `app/api/actions/confirm/route.ts`
3. `app/api/actions/reject/route.ts`
4. `app/api/inbox/[id]/draft/route.ts` — Generate reply draft → pending_action
5. `components/shared/ConfirmActionModal.tsx` — Always shown before execution
6. `components/inbox/ReplyDraftModal.tsx` — Show draft + confirm/edit/reject

**Definition of done**:
- Tapping "Draft Reply" generates a draft and shows it in the modal
- Confirming creates a pending_action record and sends the email
- Rejecting discards the draft
- No email is ever sent without going through the confirm step
- Expired pending actions (24h) are cleaned up by pg_cron job

---

## Session 13 — Outlook + Slack Integrations

**Goal**: Second email provider and Slack connected.

**What to build**:
1. `lib/integrations/outlook.ts` — Microsoft Graph wrapper (see INTEGRATIONS.md)
2. `lib/integrations/slack.ts` — Slack Web API wrapper
3. Add Outlook and Slack ingestion to the Heartbeat scan jobs
4. Add Outlook Calendar alongside Google Calendar

**Definition of done**:
- Outlook inbox items appear in unified inbox
- Slack DMs are ingested and appear in inbox
- Outlook calendar events appear in today's schedule
- Commitment extraction runs on Outlook sent messages

---

## Session 14 — Meeting Prep Agent

**Goal**: Pre-meeting briefs generate with full source citations.

**What to build**:
1. `lib/ai/prompts/meeting-prep.ts` — Meeting prep prompt (see AGENTS.md)
2. `lib/ai/agents/meeting-prep.ts` — Meeting prep generator
3. `components/people/MeetingPrepCard.tsx` — Prep card component
4. Add meeting prep to daily briefing generation (called per today's event)

**Definition of done**:
- Each calendar event in the briefing has an expandable meeting prep section
- Prep card shows: attendee context, open items, suggested talking points
- Every claim in the prep card has a tappable citation
- No claims without citations — `validateCitations()` called before insert

---

## Session 15 — Notion Integration + Vector Search

**Goal**: Documents are indexed and semantic search works.

**What to build**:
1. `lib/integrations/notion.ts` — Notion client wrapper
2. `lib/ai/embeddings.ts` — `generateEmbedding()` and `semanticSearch()`
3. `trigger/heartbeat/document-index.ts` — Nightly document indexing job
4. Add Notion to integrations connect flow

**Definition of done**:
- Notion pages are chunked, embedded, and stored in `document_chunks`
- `semanticSearch()` returns relevant chunks for a query
- Briefing generation uses semantic search to find relevant docs for meeting prep
- Embeddings expire after 90 days (pg_cron job running)

---

## Session 16 — Beta Polish + Error Handling

**Goal**: Production-ready error handling, loading states, and edge cases.

**What to build**:
1. Global error boundary component
2. Loading skeletons for all main pages
3. Empty states for all lists
4. Toast notifications for all user actions
5. Sentry integration for error tracking
6. `app/not-found.tsx` and `app/error.tsx`
7. Full audit of all API routes — ensure every route has error handling

**Definition of done**:
- No unhandled promise rejections
- Every API error returns the standard error shape
- Sentry captures errors in production
- All loading states are handled gracefully
- Empty states explain what to do (e.g. "Connect Gmail to see your inbox")

---

## Session 17 — Pre-Launch Security Audit

**Goal**: Every item on the pre-launch security checklist in `docs/SECURITY.md` is checked.

Work through `docs/SECURITY.md` Section 8 — Pre-Launch Security Checklist.
Fix anything that fails.
Write the missing tests (auth bypass, RLS cross-user, prompt injection, citation validation).

**Definition of done**:
- Every checklist item is passing
- All tests pass: `npm run test`
- `npm run typecheck` clean
- `npm run lint` clean

---

## Session 18 — Beta Launch

**Goal**: 20-50 beta users can sign up and receive their first briefing.

**What to build**:
1. Basic landing page with waitlist form
2. Admin page (protected) to approve beta users
3. Welcome email template (sent after approval)
4. Feedback collection mechanism in the dashboard

**Definition of done**:
- Landing page live
- At least 3 internal test accounts have gone through full onboarding and received a briefing
- Telegram delivery confirmed working
- No critical errors in Sentry
- Ready for first 20-50 external beta users

---

## Notes for All Sessions

### Starting a Session
```
"I'm building Donna. Read CLAUDE.md before starting.
Then read docs/[RELEVANT_DOC].md for context on what we're building today.
Today's session: [paste session definition above]."
```

### Ending a Session
Run these before stopping:
```bash
npm run typecheck
npm run lint
npm test
```
Never leave a session with TypeScript errors. Fix them before closing.

### If Claude Code Deviates
If Claude Code tries to:
- Store tokens in the database → redirect to Nango (see INTEGRATIONS.md)
- Skip source_ref on a briefing item → enforce citation requirement (see SECURITY.md)
- Call a model directly by string → redirect to `lib/ai/models.ts` constants
- Write to an external service without pending_actions → enforce the execution guard (see SECURITY.md)

Paste the relevant section from the docs and ask it to fix the deviation.
