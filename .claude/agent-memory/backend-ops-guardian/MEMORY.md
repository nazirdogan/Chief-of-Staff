# backend-ops-guardian Memory

See `patterns.md` for detailed notes.

## Key Patterns (quick reference)
- DB queries: accept `SupabaseClient<Database>` as first arg, typed `Client` alias
- Insert/update/upsert: use `(supabase as any)` cast — typed client quirks
- Each `(supabase as any)` cast needs `// eslint-disable-next-line @typescript-eslint/no-explicit-any` on the line before
- `.single()` + check error for nullable row fetches (return null on error, not throw)
- API routes: `withAuth(withRateLimit(N, '1 m', async (req) => { try/catch → handleApiError }))`
- NO `params` arg in handler — extract dynamic segment from URL: `url.pathname.split('/'); segments[segments.indexOf('parent') + 1]`
- Error shape: `{ error: string, code: string, details?: unknown }`
- New tables: RLS on every table, migration file, types.ts row + Database interface entry

## AI Agent Pattern
- Use Anthropic SDK directly (`import Anthropic from '@anthropic-ai/sdk'`)
- Model constants: `AI_MODELS.FAST`, `AI_MODELS.STANDARD`, `AI_MODELS.POWERFUL` (not MODELS.SONNET)
- Do NOT use Vercel AI SDK `generateText` — existing agents all use `anthropic.messages.create`
- `sanitiseContent(raw, source)` — ALWAYS two arguments; source = descriptive string like `routine:${id}`

## File Locations
- Auth middleware: `src/lib/middleware/withAuth.ts`
- Service client: `createServiceClient()` from `src/lib/db/client.ts`
- Error handler: `handleApiError()` from `src/lib/api-utils.ts`
- AI models: `AI_MODELS.*` from `src/lib/ai/models.ts`
- DB types: `src/lib/db/types.ts` — row interfaces + `Database` interface for typed client
- Sanitise: `sanitiseContent`, `buildSafeAIContext`, `redactPII` from `src/lib/ai/safety/sanitise.ts`

## Pre-existing Lint Errors (do not fix, not introduced by us)
- `demo-video/src/scenes/v2/WakeupScene.tsx` — unescaped entity
- `demo-video/src/scenes/v3/CommitmentsScene.tsx` — unescaped entity
- `src/components/ui/text-shimmer.tsx` — component created during render

## Feature Index
- Chat History (migration 011): `src/lib/db/queries/chat.ts`, `/api/chat/conversations`
- Routines (migration 023): `src/lib/db/queries/routines.ts`, `src/lib/ai/agents/routine-generator.ts`
  - API: `GET/POST /api/routines`, `GET/PATCH/DELETE /api/routines/[id]`
  - API: `POST /api/routines/[id]/run` (AI gen, 5/min), `GET /api/routines/[id]/outputs`
