# Donna — Claude Code Project Brief

## What This Project Is
Donna is an AI-powered personal intelligence app. It reads across a user's entire digital
life (email, calendar, messages, documents, tasks) and delivers one proactive daily briefing every
morning in-app telling the user what matters, what they promised, who they've gone cold with, and
what to do first. It then helps them act on it.

**This is not a chat assistant. It is a proactive, background-running intelligence layer.**

---

## Absolute Rules — Never Break These

1. **Never store OAuth tokens in plaintext.** All tokens go through the Nango token vault. Never
   write tokens to .env, database columns, or logs.
2. **Never build a feature without Row Level Security (RLS) on every Supabase table it uses.**
   Every table has RLS. No exceptions.
3. **Never call an expensive AI model (claude-sonnet, gpt-4o) for ingestion tasks.** Use
   claude-haiku-4-5-20251001 or gpt-4o-mini for extraction passes. Expensive models only for
   briefing generation and meeting prep.
4. **Never show an AI-generated factual claim without a source citation.** Every claim in a
   briefing, meeting prep brief, or commitment record must include `source_ref` pointing to the
   originating message/document.
5. **Never execute a write action without explicit user authorisation.**
   Authorisation takes one of three forms:
   - **Tier 1 (SILENT):** user has pre-authorised this `action_type` in `/settings/autonomy`.
     Auto-execute silently. Write audit log row. `send_email` is ALWAYS Tier 3 — this cannot
     be changed in settings.
   - **Tier 2 (ONE_TAP):** show one-tap toast. 30s timeout = Dismiss.
   - **Tier 3 (FULL):** full modal with source citation. Always for `send_email`.
   Tier is assigned by `src/lib/actions/classifier.ts` at action creation time.
   Audit all Tier 1 executions via the `audit_log` table.
6. **Never put secrets in code.** All secrets come from environment variables. All env vars are
   documented in `.env.example`. Never hardcode API keys, tokens, or secrets anywhere.
7. **Every API route must be authenticated.** Use the `withAuth` middleware on every route. Public
   routes are explicitly declared exceptions and must be justified in comments.
8. **Never skip input sanitisation on ingested content.** All content from external sources (email
   bodies, message text, document content) passes through the `sanitiseContent()` function before
   reaching any AI prompt.

---

## Tech Stack

| Layer | Technology | Version / Notes |
|---|---|---|
| Framework | Next.js | 16 with App Router |
| Language | TypeScript | Strict mode enabled |
| Database | Supabase (PostgreSQL) | Deployed in AWS me-south-1 (Bahrain) |
| Auth | Supabase Auth | Email + OAuth. 2FA enforced. |
| OAuth Token Vault | Nango | All integration tokens managed here |
| Vector Store | Supabase pgvector | Same DB instance as main database |
| AI Orchestration | Vercel AI SDK | Multi-provider support |
| AI Models | Anthropic + OpenAI | See model selection rules below |
| Background Jobs | Local Worker (in-process) | Heartbeat Monitor, briefing generation |
| Messaging Gateway | In-app (current), Twilio/WhatsApp (planned) | Briefings and confirmations are in-app |
| API Gateway | Next.js middleware + rate limiter | Custom rate limiting per route |
| Secrets | Environment variables | AWS Secrets Manager in production |
| CSS | Tailwind CSS | + shadcn/ui components |
| State Management | Zustand | Client state only |
| Forms | React Hook Form + Zod | All forms validated with Zod schemas |
| Testing | Vitest + Playwright | Unit + E2E |
| Deployment | Vercel | With AWS Middle East for DB |
| Monitoring | Vercel Analytics + Sentry | Error tracking from day one |

---

## AI Model Selection Rules

```
Ingestion / extraction (Pass 1):     claude-haiku-4-5-20251001   ← cheap, fast, high recall
Commitment scoring (Pass 2):         claude-sonnet-4-6            ← accurate confidence scoring
Daily briefing generation:           claude-sonnet-4-6            ← best reasoning/cost balance
Meeting prep briefs:                 claude-sonnet-4-6            ← complex multi-source synthesis
Reply drafting:                      claude-haiku-4-5-20251001   ← speed for frequent generations
Complex analysis (on demand only):   claude-opus-4-6              ← used sparingly
Privacy Mode (local):                Local LLM via Ollama         ← no external inference
```

Always import model constants from `@/lib/ai/models.ts` — never hardcode model strings.

---

## Project Structure

```
/
├── CLAUDE.md                          ← You are here. Read this every session.
├── .env.example                       ← All required env vars (no values)
├── .env.local                         ← Local dev secrets (gitignored)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
│
├── app/                               ← Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── verify/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                 ← Dashboard shell + nav
│   │   ├── page.tsx                   ← Daily Briefing (home)
│   │   ├── inbox/page.tsx
│   │   ├── calendar/page.tsx
│   │   ├── commitments/page.tsx
│   │   ├── people/page.tsx
│   │   ├── heartbeat/page.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       ├── integrations/page.tsx
│   │       ├── security/page.tsx
│   │       └── data/page.tsx
│   ├── api/
│   │   ├── auth/[...supabase]/route.ts
│   │   ├── webhooks/
│   │   │   ├── gmail/route.ts         ← Public — Gmail push notifications
│   │   │   └── nango/route.ts         ← Public — Nango token events
│   │   ├── integrations/
│   │   │   ├── connect/route.ts       ← POST: initiate OAuth via Nango
│   │   │   ├── disconnect/route.ts    ← DELETE: revoke and remove integration
│   │   │   └── [provider]/status/route.ts ← GET: connection health
│   │   ├── briefing/
│   │   │   ├── today/route.ts         ← GET: fetch today's briefing
│   │   │   ├── generate/route.ts      ← POST: trigger generation (internal)
│   │   │   └── feedback/route.ts      ← POST: thumbs up/down on item
│   │   ├── commitments/
│   │   │   ├── route.ts               ← GET: list, POST: manual add
│   │   │   └── [id]/route.ts          ← PATCH: resolve/snooze, DELETE: dismiss
│   │   ├── people/
│   │   │   ├── route.ts               ← GET: contact list
│   │   │   └── [id]/route.ts          ← GET: contact detail + history
│   │   ├── inbox/
│   │   │   ├── route.ts               ← GET: unified inbox items
│   │   │   └── [id]/
│   │   │       ├── draft/route.ts     ← POST: generate reply draft
│   │   │       └── action/route.ts    ← POST: archive/snooze/delegate
│   │   └── actions/
│   │       ├── confirm/route.ts       ← POST: user approves pending action
│   │       └── reject/route.ts        ← POST: user rejects pending action
│   │
├── components/
│   ├── ui/                            ← shadcn/ui base components
│   ├── briefing/
│   │   ├── BriefingCard.tsx
│   │   ├── BriefingItem.tsx           ← Single ranked item with citation
│   │   ├── BriefingSection.tsx
│   │   └── CitationDrawer.tsx         ← Shows source content on tap
│   ├── commitments/
│   │   ├── CommitmentQueue.tsx
│   │   └── CommitmentCard.tsx         ← Shows source quote + actions
│   ├── people/
│   │   ├── ContactCard.tsx
│   │   └── MeetingPrepCard.tsx
│   ├── inbox/
│   │   ├── InboxItem.tsx
│   │   └── ReplyDraftModal.tsx
│   ├── heartbeat/
│   │   └── HeartbeatMonitor.tsx
│   ├── onboarding/
│   │   ├── OnboardingFlow.tsx
│   │   ├── VIPSetupStep.tsx
│   │   ├── ProjectSetupStep.tsx
│   │   ├── CommitmentCalibrationStep.tsx  ← Shows 10 extracted commitments
│   │   └── OAuthConsentScreen.tsx         ← Pre-consent education
│   │   (Note: TelegramConnectStep.tsx removed — delivery is in-app)
│   └── shared/
│       ├── SourceCitation.tsx
│       ├── ConfirmActionModal.tsx         ← Required before any write action
│       └── HeartbeatStatus.tsx
│
├── lib/
│   ├── ai/
│   │   ├── models.ts                  ← Model constants — import from here
│   │   ├── prompts/                   ← All system prompts as typed constants
│   │   │   ├── briefing.ts
│   │   │   ├── commitment-extraction.ts
│   │   │   ├── meeting-prep.ts
│   │   │   ├── reply-draft.ts
│   │   │   └── relationship.ts
│   │   ├── agents/
│   │   │   ├── ingestion.ts           ← Per-integration ingestion agent
│   │   │   ├── commitment.ts          ← Two-pass commitment extractor
│   │   │   ├── prioritisation.ts      ← 5-dimension scoring engine
│   │   │   ├── briefing.ts            ← Briefing orchestrator
│   │   │   ├── meeting-prep.ts        ← Pre-meeting brief generator
│   │   │   ├── reply-draft.ts         ← Reply drafting agent
│   │   │   └── relationship.ts        ← Relationship intelligence agent
│   │   └── safety/
│   │       ├── sanitise.ts            ← sanitiseContent() — MUST use on all ingested content
│   │       └── citation-validator.ts  ← Validates every claim has source_ref
│   ├── integrations/
│   │   ├── nango.ts                   ← Nango client + token retrieval helpers
│   │   ├── gmail.ts                   ← Gmail API wrapper
│   │   ├── google-calendar.ts         ← Google Calendar API wrapper
│   │   ├── outlook.ts                 ← Microsoft Graph API wrapper
│   │   ├── slack.ts                   ← Slack API wrapper
│   │   └── notion.ts                  ← Notion API wrapper
│   ├── db/
│   │   ├── client.ts                  ← Supabase client (server + browser)
│   │   ├── queries/                   ← Typed query functions per domain
│   │   │   ├── briefings.ts
│   │   │   ├── commitments.ts
│   │   │   ├── contacts.ts
│   │   │   ├── inbox.ts
│   │   │   ├── integrations.ts
│   │   │   └── users.ts
│   │   └── types.ts                   ← Generated Supabase types (run: supabase gen types)
│   ├── middleware/
│   │   ├── withAuth.ts                ← Auth middleware — wrap ALL protected routes
│   │   ├── withRateLimit.ts           ← Rate limiting middleware
│   │   └── withWebhookVerification.ts ← HMAC verification for all webhooks
│   └── utils/
│       ├── encryption.ts              ← AES-256 helpers for sensitive fields
│       └── timezone.ts                ← User timezone handling for Heartbeat
│
├── supabase/
│   ├── migrations/                    ← All schema changes as numbered migrations
│   │   └── 001_initial_schema.sql     ← Full initial schema (see DATABASE.md)
│   └── seed.sql                       ← Dev seed data only
│
└── docs/
    ├── DATABASE.md                    ← Full schema reference
    ├── API.md                         ← All API endpoint contracts
    ├── INTEGRATIONS.md                ← Integration setup guides
    ├── SECURITY.md                    ← Security architecture reference
    └── AGENTS.md                      ← AI agent pipeline documentation
```

---

## Naming Conventions

- **Files**: kebab-case for all files (`gmail-scan.ts`, `commitment-card.tsx`)
- **Components**: PascalCase (`BriefingCard`, `CommitmentQueue`)
- **Functions**: camelCase (`generateDailyBriefing`, `extractCommitments`)
- **Database tables**: snake_case (`briefing_items`, `user_integrations`)
- **Environment variables**: SCREAMING_SNAKE_CASE (`NANGO_SECRET_KEY`)
- **API routes**: RESTful, kebab-case paths (`/api/briefing/today`, `/api/commitments`)
- **Types/Interfaces**: PascalCase with descriptive names (`BriefingItem`, `CommitmentRecord`)

---

## Environment Variables

Always import from `@/lib/config.ts` which validates all env vars at startup using Zod.
Never use `process.env.VARIABLE` directly in application code — always use the typed config object.

---

## Error Handling

- All API routes return consistent error shapes: `{ error: string, code: string, details?: unknown }`
- All agent functions throw typed errors from `@/lib/errors.ts`
- All errors are logged to Sentry in production
- Never expose internal error details to the client — log full error, return safe message

---

## Testing Requirements

- Every API route has at least one happy path and one auth failure test
- Every agent function has unit tests with mocked AI responses
- Every database query function has integration tests against a test Supabase instance
- E2E tests cover: onboarding flow, daily briefing display, commitment resolution

---

## When Starting a New Session

1. Re-read this file
2. Check `docs/` for the relevant domain spec before building
3. Run `npm run typecheck` to see current type errors before adding new code
4. Never create a new table without adding it to `DATABASE.md` and creating a migration
5. Never add a new env var without adding it to `.env.example` and `lib/config.ts`
