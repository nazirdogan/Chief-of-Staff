# backend-ops-guardian Memory

See `patterns.md` for detailed notes.

## Key Patterns (quick reference)
- DB queries: accept `SupabaseClient<Database>` as first arg, typed `Client` alias
- Insert/update/upsert: use `(supabase as any)` cast — typed client quirks
- `.single()` + check `error.code !== 'PGRST116'` for nullable row fetches
- API routes: `withAuth(withRateLimit(N, '1 m', async (req) => { try/catch → handleApiError }))`
- Extract dynamic segment from URL: `url.pathname.split('/')[segments.indexOf('parent') + 1]`
- Error shape: `{ error: string, code: string, details?: unknown }`
- New tables: RLS on every table, migration file, types.ts row + Database interface entry

## File Locations
- Auth middleware: `src/lib/middleware/withAuth.ts`
- Service client: `createServiceClient()` from `src/lib/db/client.ts`
- Error handler: `handleApiError()` from `src/lib/api-utils.ts`
- AI models: `AI_MODELS.*` from `src/lib/ai/models.ts`
- DB types: `src/lib/db/types.ts` — row interfaces + `Database` interface for typed client

## Chat History System (migration 011)
- Tables: `chat_conversations`, `chat_messages`
- Query functions: `src/lib/db/queries/chat.ts`
- API: `POST /api/chat/conversations`, `GET/DELETE /api/chat/conversations/[id]`, `POST /api/chat/conversations/[id]/messages`
- Store: `src/stores/chat-store.ts` — tracks `currentConversationId`, `conversations[]`
- Pages: `/chat` (new) and `/chat/[id]` (existing), component `ChatPage` accepts optional `conversationId`
