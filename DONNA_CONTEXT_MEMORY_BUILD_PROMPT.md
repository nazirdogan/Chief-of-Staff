# Donna — Context Capture & Deep Memory System: Build Prompt

> **Purpose:** This is a comprehensive implementation prompt for Claude Code. It builds the core intelligence layer that makes Donna understand the user — what they're working on, their patterns, their communication style, and the full context of their digital life. This is the single most important feature in the product.

---

## PROJECT CONTEXT — READ FIRST

You are working on **Donna**, an AI-powered personal intelligence app built with Next.js 16 + TypeScript + Supabase (PostgreSQL with pgvector) + Trigger.dev + Anthropic SDK + **Tauri 2 desktop shell** (Rust + WebView).

### What Already Exists (DO NOT rebuild or duplicate):
- **Desktop Tauri app** (`src-tauri/`) — Rust-based desktop shell using Tauri 2. Uses the system WebView to render the Next.js frontend. Includes menu bar tray integration, window management, and native macOS hooks. Do NOT modify the Tauri shell unless explicitly required for a new native capability.
- **Full Next.js app** with App Router pages, API routes, dashboard UI. The UI is built. You're adding backend logic + new frontend components that slot into the existing shell.
- **27 OAuth integrations** via Nango (Gmail, Slack, Notion, Calendar, Linear, GitHub, etc.) — all connection management, token vaults, and sync orchestration exists.
- **Heartbeat monitoring** — 25+ Trigger.dev background jobs that poll integrations on configurable intervals.
- **Document embeddings pipeline** (`src/lib/ai/embeddings.ts`) — `generateEmbedding()` using OpenAI `text-embedding-3-small` (1536-dim) and `semanticSearch()` via pgvector `match_document_chunks` RPC.
- **`document_chunks` table** — stores chunks with vector(1536) embeddings, provider, source_id, metadata JSONB, 90-day expiry.
- **Chat interface** (`/api/chat`) with tool-calling loop and 12 existing tools (`get_briefing`, `list_commitments`, `list_contacts`, `list_inbox`, `draft_reply`, etc.) in `src/lib/ai/tools/chat-tools.ts`.
- **AI agents** — ingestion, commitment extraction (2-pass), prioritisation (5-dimension scoring), briefing generation, meeting prep, relationship scoring, operations (AM Sweep, time blocking, subagent dispatch).
- **AI model constants** in `src/lib/ai/models.ts`: `FAST` (haiku), `STANDARD` (sonnet), `POWERFUL` (opus).
- **Safety layer** — `sanitiseContent()` for all external content, `citation-validator.ts` for source refs.
- **Auth middleware** (`withAuth`), rate limiting (`withRateLimit`), webhook verification, RLS on every table.
- **Supabase migrations** 001–007 already applied. New tables go in migration `008_context_memory.sql`.

### Absolute Rules — Break These and the PR Gets Rejected:
1. **Never store OAuth tokens** — all tokens live in Nango. Never write them to DB, env, or logs.
2. **RLS on every new table** — no exceptions.
3. **Use Haiku for ingestion/extraction, Sonnet for scoring/synthesis** — never use expensive models for bulk processing.
4. **Every claim needs `source_ref`** — every piece of context stored must trace back to its originating source.
5. **`sanitiseContent()` on all external content** before it touches any AI prompt.
6. **Import models from `@/lib/ai/models.ts`** — never hardcode model strings.
7. **Import env from `@/lib/config.ts`** — never use `process.env` directly.
8. **All API routes authenticated** with `withAuth` middleware.
9. **User confirmation required** before any write action to external services.
10. **Follow existing naming conventions:** files kebab-case, components PascalCase, functions camelCase, DB tables snake_case, env vars SCREAMING_SNAKE.

---

## WHAT YOU'RE BUILDING: FOUR FEATURES

### Feature 1: Context Capture Engine (THE MOST IMPORTANT)
### Feature 2: Deep Memory Store with Working Pattern Intelligence
### Feature 3: AI Chat with Full Context Awareness
### Feature 4: Meeting Intelligence (Transcription + Context Synthesis)

---

## FEATURE 1: CONTEXT CAPTURE ENGINE

### What It Does
Every time any of Donna's 27 integrations syncs new data, the context capture engine processes that data into structured context chunks that build a persistent, queryable understanding of what the user is working on. This is NOT simple document indexing (which we already have). This is **semantic context extraction** — understanding the *meaning* and *relationships* in the data.

### What Already Exists That You're Extending
- The heartbeat scan jobs in `trigger/heartbeat/` already pull raw data from each integration.
- `document_chunks` table already stores vector embeddings.
- `generateEmbedding()` and `semanticSearch()` already work.

### What You Need To Build

#### 1A. New Database Schema (migration `008_context_memory.sql`)

```sql
-- ============================================================
-- MIGRATION 008: CONTEXT MEMORY SYSTEM
-- ============================================================

-- ENUM: Context chunk types
CREATE TYPE context_chunk_type AS ENUM (
  'email_thread',        -- full email thread context
  'calendar_event',      -- meeting with attendees + notes
  'document_edit',       -- document creation or edit activity
  'slack_conversation',  -- DM or channel thread
  'task_update',         -- task status change in any PM tool
  'code_activity',       -- PR, commit, code review
  'crm_activity',        -- deal update, contact note
  'file_activity',       -- file upload, share, comment
  'general_note'         -- catch-all
);

-- ENUM: Context importance
CREATE TYPE context_importance AS ENUM (
  'critical',    -- user was directly involved, high stakes
  'important',   -- user was cc'd or mentioned, meaningful
  'background',  -- ambient context, useful for pattern matching
  'noise'        -- low value, can be pruned aggressively
);

-- ------------------------------------------------------------
-- CONTEXT_CHUNKS (enhanced version of document_chunks)
-- This is the CORE memory table. Every piece of context lives here.
-- Think of this as Donna's long-term memory.
-- ------------------------------------------------------------
CREATE TABLE public.context_chunks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Source tracing
  provider          TEXT NOT NULL,                    -- 'gmail', 'slack', 'notion', etc.
  source_id         TEXT NOT NULL,                    -- external ID (message ID, doc ID, etc.)
  source_ref        JSONB NOT NULL,                   -- full reference for citation
  thread_id         TEXT,                             -- thread/conversation grouping

  -- Content
  chunk_type        context_chunk_type NOT NULL,
  title             TEXT,                             -- subject line, doc title, task name
  content_summary   TEXT NOT NULL,                    -- AI-generated summary of this chunk
  raw_content_hash  TEXT NOT NULL,                    -- SHA-256 of raw content for dedup
  entities          JSONB NOT NULL DEFAULT '{}',      -- extracted: people, projects, topics, dates
  sentiment         TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral', 'urgent')),

  -- Classification
  importance        context_importance NOT NULL DEFAULT 'background',
  importance_score  SMALLINT CHECK (importance_score BETWEEN 1 AND 10),
  topics            TEXT[] NOT NULL DEFAULT '{}',     -- auto-extracted topic tags
  projects          TEXT[] NOT NULL DEFAULT '{}',     -- matched to user's active_projects
  people            TEXT[] NOT NULL DEFAULT '{}',     -- email addresses of involved people

  -- Embeddings
  embedding         vector(1536) NOT NULL,

  -- Temporal
  occurred_at       TIMESTAMPTZ NOT NULL,             -- when the original event happened
  captured_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ,                      -- NULL = never expires (critical/important)

  -- Dedup
  UNIQUE(user_id, provider, source_id)
);

ALTER TABLE public.context_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own context chunks" ON public.context_chunks
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for fast querying
CREATE INDEX idx_context_chunks_user_time ON public.context_chunks(user_id, occurred_at DESC);
CREATE INDEX idx_context_chunks_user_type ON public.context_chunks(user_id, chunk_type);
CREATE INDEX idx_context_chunks_user_importance ON public.context_chunks(user_id, importance);
CREATE INDEX idx_context_chunks_topics ON public.context_chunks USING gin(topics);
CREATE INDEX idx_context_chunks_projects ON public.context_chunks USING gin(projects);
CREATE INDEX idx_context_chunks_people ON public.context_chunks USING gin(people);
CREATE INDEX idx_context_chunks_thread ON public.context_chunks(user_id, thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_context_chunks_expiry ON public.context_chunks(expires_at) WHERE expires_at IS NOT NULL;

-- Vector similarity search index
CREATE INDEX idx_context_chunks_embedding ON public.context_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 200);

-- ------------------------------------------------------------
-- WORKING_PATTERNS — Donna's understanding of the user's habits
-- Updated daily by the pattern analysis job.
-- ------------------------------------------------------------
CREATE TABLE public.working_patterns (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Time patterns
  typical_start_time    TIME,                  -- when user typically starts working
  typical_end_time      TIME,                  -- when user typically stops
  peak_hours            JSONB NOT NULL DEFAULT '[]',  -- array of {hour, activity_score}
  active_days           INT[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 1=Mon, 7=Sun

  -- Communication patterns
  avg_emails_per_day        NUMERIC(6,1) DEFAULT 0,
  avg_slack_messages_per_day NUMERIC(6,1) DEFAULT 0,
  avg_meetings_per_day      NUMERIC(4,1) DEFAULT 0,
  response_time_p50_minutes NUMERIC(8,1),      -- median response time
  response_time_p90_minutes NUMERIC(8,1),      -- 90th percentile
  busiest_day_of_week       SMALLINT,           -- 1=Mon, 7=Sun
  quietest_day_of_week      SMALLINT,

  -- Focus patterns
  deep_work_windows         JSONB NOT NULL DEFAULT '[]',  -- detected focus periods
  meeting_heavy_days        INT[] NOT NULL DEFAULT '{}',  -- days with 3+ meetings
  context_switch_frequency  NUMERIC(4,1),       -- avg app switches per hour

  -- Project activity
  active_projects_ranked    JSONB NOT NULL DEFAULT '[]',  -- [{project, hours_this_week, trend}]
  top_collaborators         JSONB NOT NULL DEFAULT '[]',  -- [{email, interaction_count, channels}]

  -- Working style insights (AI-generated)
  working_style_summary     TEXT,                -- "You're a morning person who batches email..."
  recent_changes            TEXT,                -- "This week you had 40% more meetings than usual"

  -- Meta
  analysis_window_days      INTEGER NOT NULL DEFAULT 30,
  last_analyzed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

ALTER TABLE public.working_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own working patterns" ON public.working_patterns
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can INSERT/UPDATE (background jobs only)
CREATE POLICY "Service can manage working patterns" ON public.working_patterns
  FOR ALL USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------
-- CONTEXT_THREADS — Groups related context chunks into threads/topics
-- ------------------------------------------------------------
CREATE TABLE public.context_threads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  thread_key      TEXT NOT NULL,                   -- composite key: provider:thread_id or topic:slug
  title           TEXT NOT NULL,
  summary         TEXT,                            -- rolling AI summary of the thread
  last_chunk_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  chunk_count     INTEGER NOT NULL DEFAULT 0,
  participants    TEXT[] NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, thread_key)
);

ALTER TABLE public.context_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own context threads" ON public.context_threads
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_context_threads_user_active ON public.context_threads(user_id, is_active, last_chunk_at DESC);

-- ------------------------------------------------------------
-- MEMORY_SNAPSHOTS — Daily summaries of what happened
-- These power the "what did I work on yesterday?" queries and
-- feed into working pattern analysis.
-- ------------------------------------------------------------
CREATE TABLE public.memory_snapshots (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  snapshot_date     DATE NOT NULL,

  -- Activity summary
  emails_received       INTEGER NOT NULL DEFAULT 0,
  emails_sent           INTEGER NOT NULL DEFAULT 0,
  slack_messages        INTEGER NOT NULL DEFAULT 0,
  meetings_attended     INTEGER NOT NULL DEFAULT 0,
  tasks_completed       INTEGER NOT NULL DEFAULT 0,
  documents_edited      INTEGER NOT NULL DEFAULT 0,
  code_prs_opened       INTEGER NOT NULL DEFAULT 0,

  -- AI-generated narrative
  day_narrative         TEXT NOT NULL,             -- "You spent most of the day on Project X..."
  key_decisions         JSONB NOT NULL DEFAULT '[]', -- [{decision, context, source_ref}]
  open_loops            JSONB NOT NULL DEFAULT '[]', -- things started but not finished
  notable_interactions  JSONB NOT NULL DEFAULT '[]', -- important conversations

  -- Embedding for semantic search across days
  embedding             vector(1536),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

ALTER TABLE public.memory_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own memory snapshots" ON public.memory_snapshots
  FOR SELECT USING (auth.uid() = user_id);

-- Vector search function for context chunks (replaces the simpler document_chunks one)
CREATE OR REPLACE FUNCTION match_context_chunks(
  query_embedding vector(1536),
  match_user_id uuid,
  match_threshold float DEFAULT 0.72,
  match_count int DEFAULT 20,
  filter_type context_chunk_type DEFAULT NULL,
  filter_importance context_importance DEFAULT NULL,
  filter_after timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  provider text,
  source_id text,
  chunk_type context_chunk_type,
  title text,
  content_summary text,
  entities jsonb,
  importance context_importance,
  topics text[],
  projects text[],
  people text[],
  occurred_at timestamptz,
  source_ref jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id,
    cc.provider,
    cc.source_id,
    cc.chunk_type,
    cc.title,
    cc.content_summary,
    cc.entities,
    cc.importance,
    cc.topics,
    cc.projects,
    cc.people,
    cc.occurred_at,
    cc.source_ref,
    1 - (cc.embedding <=> query_embedding) AS similarity
  FROM public.context_chunks cc
  WHERE cc.user_id = match_user_id
    AND (cc.expires_at IS NULL OR cc.expires_at > NOW())
    AND 1 - (cc.embedding <=> query_embedding) > match_threshold
    AND (filter_type IS NULL OR cc.chunk_type = filter_type)
    AND (filter_importance IS NULL OR cc.importance = filter_importance)
    AND (filter_after IS NULL OR cc.occurred_at >= filter_after)
  ORDER BY cc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Updated_at triggers
CREATE TRIGGER update_working_patterns_updated_at
  BEFORE UPDATE ON public.working_patterns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_context_threads_updated_at
  BEFORE UPDATE ON public.context_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cleanup: prune noise-level chunks older than 14 days
SELECT cron.schedule('prune-noise-context', '0 4 * * *',
  $$DELETE FROM public.context_chunks
    WHERE importance = 'noise' AND captured_at < NOW() - INTERVAL '14 days'$$);

-- Cleanup: prune background-level chunks older than 90 days
SELECT cron.schedule('prune-background-context', '0 4 * * *',
  $$DELETE FROM public.context_chunks
    WHERE importance = 'background' AND captured_at < NOW() - INTERVAL '90 days'$$);

-- Cleanup: expired context chunks
SELECT cron.schedule('prune-expired-context', '0 4 * * *',
  $$DELETE FROM public.context_chunks
    WHERE expires_at IS NOT NULL AND expires_at < NOW()$$);
```

#### 1B. Context Extraction Agent (`src/lib/ai/agents/context-extractor.ts`)

Build a new agent that takes raw integration data and produces structured context chunks.

**Responsibilities:**
- Accept raw data from any heartbeat scan (email body, Slack message, calendar event, task, document, PR, etc.)
- Run through the `sanitiseContent()` function
- Use Claude Haiku (FAST model) to extract:
  - A concise `content_summary` (2-3 sentences max)
  - `entities`: people mentioned (with email if available), projects referenced, topics/themes, dates/deadlines mentioned, action items
  - `sentiment`: positive / negative / neutral / urgent
  - `importance`: critical / important / background / noise
  - `importance_score`: 1-10
  - `topics`: array of topic tags (lowercase, slug-style)
  - `projects`: match against user's `active_projects` from `onboarding_data`
  - `people`: email addresses of all people involved
- Generate embedding via `generateEmbedding()`
- Compute `raw_content_hash` (SHA-256) for dedup — skip if hash already exists for this user+provider+source_id
- Upsert into `context_chunks` table
- If this chunk belongs to a thread (email thread, Slack thread), upsert `context_threads` with updated summary + participant list

**Prompt design for the extraction:**
```
You are a context extraction engine. Given a piece of communication or document, extract structured context.

Your job is to understand WHAT is happening, WHO is involved, WHAT project/topic this relates to, and HOW important it is to the user.

User's active projects: {{active_projects}}
User's VIP contacts: {{vip_contacts}}

Rules:
- importance = "critical" if: the user needs to act, someone is waiting on them, there's a deadline within 48h, or a VIP is involved
- importance = "important" if: the user is directly involved but no immediate action needed
- importance = "background" if: the user is cc'd, it's informational, or it's ambient project context
- importance = "noise" if: it's a notification, automated message, newsletter, or has no meaningful signal
- topics should be lowercase slugs: "q1-planning", "client-onboarding", "product-launch"
- projects should match exactly against the user's active_projects list when possible
- people should be email addresses when available, otherwise "FirstName LastName"
- Keep content_summary to 2-3 sentences. Focus on WHAT happened and WHY it matters.
```

**Integration with existing heartbeat jobs:**
- DO NOT modify the existing heartbeat scan jobs directly. Instead, create a shared function `processContextFromScan()` that each scan job calls at the end of its run.
- The function signature:
```typescript
export async function processContextFromScan(params: {
  userId: string;
  provider: string;
  items: Array<{
    sourceId: string;
    sourceRef: Record<string, unknown>;
    threadId?: string;
    title?: string;
    rawContent: string;
    occurredAt: string;  // ISO timestamp
    people?: string[];   // email addresses
    chunkType: ContextChunkType;
  }>;
}): Promise<{ processed: number; skipped: number; errors: number }>;
```

**Batch processing:** Process items in batches of 10 to avoid rate limits. Use `Promise.allSettled()` for resilience.

**Dedup:** Before processing each item, check if a `context_chunk` with matching `(user_id, provider, source_id)` already exists AND the `raw_content_hash` matches. If so, skip. If hash differs, upsert (content was updated).

#### 1C. Context Capture Pipeline Integration

Create a new shared module `src/lib/context/pipeline.ts` that the heartbeat jobs will call. This module:
1. Accepts raw scan results
2. Deduplicates against existing context
3. Batches items for AI extraction
4. Writes to `context_chunks` and `context_threads`
5. Returns processing stats

Create adapter functions for each major integration type in `src/lib/context/adapters/`:
- `gmail-adapter.ts` — Maps Gmail message data → context pipeline input format
- `slack-adapter.ts` — Maps Slack messages → context pipeline input
- `calendar-adapter.ts` — Maps calendar events → context pipeline input
- `notion-adapter.ts` — Maps Notion pages → context pipeline input
- `task-adapter.ts` — Maps task manager items (Linear, Jira, Asana, etc.) → context pipeline input
- `code-adapter.ts` — Maps GitHub/GitLab activity → context pipeline input
- `generic-adapter.ts` — Fallback for any integration without a specific adapter

Each adapter implements:
```typescript
interface ContextAdapter {
  toContextInput(rawData: unknown): ContextPipelineInput[];
}
```

---

## FEATURE 2: DEEP MEMORY STORE WITH WORKING PATTERN INTELLIGENCE

### What It Does
This is the system that turns raw context chunks into *understanding*. It knows that the user has been spending 60% of their time on Project Alpha this week, that they always reply to their CEO within 15 minutes, that they have deep work on Tuesday mornings, and that they've been context-switching more than usual.

### What You Need To Build

#### 2A. Working Pattern Analyzer (`src/lib/ai/agents/pattern-analyzer.ts`)

A Trigger.dev scheduled job that runs **once daily at midnight** (user's timezone).

**It does:**
1. **Query last 30 days** of `context_chunks` for the user
2. **Compute time patterns:**
   - `typical_start_time`: earliest consistent activity time (exclude outliers)
   - `typical_end_time`: latest consistent activity time
   - `peak_hours`: for each hour 0-23, compute an activity score based on chunk count weighted by importance
   - `active_days`: days of the week with consistent activity
3. **Compute communication patterns:**
   - Count emails received/sent per day (from `inbox_items` + `context_chunks` where provider='gmail'/'outlook')
   - Count Slack messages per day
   - Count meetings per day (from `context_chunks` where chunk_type='calendar_event')
   - Compute response times by pairing inbound emails with their outbound replies (match via thread_id)
   - Identify busiest/quietest day
4. **Compute focus patterns:**
   - Detect deep work windows: periods of 2+ hours with no email/Slack activity but document/code activity
   - Identify meeting-heavy days (3+ meetings)
   - Estimate context-switch frequency by counting distinct provider+source changes per hour
5. **Compute project activity:**
   - Aggregate `context_chunks.projects` field over the past 7 days
   - Rank projects by chunk count weighted by importance
   - Compute week-over-week trend (up/down/flat)
6. **Compute top collaborators:**
   - Aggregate `context_chunks.people` field
   - Rank by interaction count, include which channels (email, Slack, meetings)
7. **Generate AI summary (use STANDARD model — Sonnet):**
   - Feed all computed data to Sonnet with this prompt:
   ```
   Based on this user's working patterns data, write two things:
   1. working_style_summary: A 2-3 sentence natural-language description of their working style. Be specific and insightful, not generic. Example: "You're most productive between 9-11am, particularly on Tuesdays and Thursdays when you have fewer meetings. You batch-process email around 2pm and tend to do deep document work in the evening."
   2. recent_changes: Note any significant changes from the prior period. Example: "This week you spent 3x more time on Project Falcon than last week, and your response time to VIP contacts slowed from 12min to 45min."
   ```
8. **Upsert into `working_patterns` table.**

Register this as a Trigger.dev job: `trigger/memory/analyze-working-patterns.ts`

#### 2B. Daily Memory Snapshot Generator (`src/lib/ai/agents/memory-snapshot.ts`)

A Trigger.dev job that runs **once daily at 11:59 PM** (user's timezone), creating a summary of the day.

**It does:**
1. Query all `context_chunks` with `occurred_at` = today
2. Aggregate counts (emails, Slack messages, meetings, tasks, docs, PRs)
3. Use Sonnet to generate:
   - `day_narrative`: 3-5 sentence natural language summary. Not a list — a flowing narrative. Example: "Most of your morning was consumed by the Product Review meeting, where the team decided to push the launch to April. After that, you had a back-and-forth with Sarah about the pricing model — she's leaning towards tier-based. You wrapped up 3 Jira tickets in the afternoon and sent a follow-up to the Acme contract."
   - `key_decisions`: Array of {decision, context, source_ref} — any decisions made or commitments given
   - `open_loops`: Things started but not resolved — an email left unread, a task marked in-progress, a meeting with no follow-up
   - `notable_interactions`: Important conversations with context
4. Generate an embedding of the `day_narrative` for semantic search across days
5. Insert into `memory_snapshots`

Register as: `trigger/memory/generate-daily-snapshot.ts`

#### 2C. Context Query Engine (`src/lib/context/query-engine.ts`)

A unified query interface that the chat agent and other agents use to retrieve relevant context. This replaces the simple `semanticSearch()` function with something much more powerful.

```typescript
interface ContextQuery {
  userId: string;
  query: string;                          // natural language query
  filters?: {
    providers?: string[];                 // limit to specific integrations
    chunkTypes?: ContextChunkType[];      // limit to specific types
    importance?: ContextImportance[];     // minimum importance levels
    projects?: string[];                  // filter by project
    people?: string[];                    // filter by people involved
    after?: string;                       // ISO date — only context after this
    before?: string;                      // ISO date — only context before this
  };
  limit?: number;                         // max results (default 20)
  includePatterns?: boolean;              // also return working_patterns
  includeSnapshot?: boolean;              // also return today's memory_snapshot
  includeThreads?: boolean;              // expand thread context for matched chunks
}

interface ContextQueryResult {
  chunks: ContextChunk[];                 // ranked by relevance
  patterns?: WorkingPatterns;             // user's working patterns
  snapshot?: MemorySnapshot;              // today's snapshot
  threads?: ContextThread[];              // expanded thread context
  totalMatches: number;
  queryEmbedding: number[];               // for re-use
}
```

**The query engine should:**
1. Generate an embedding of the query
2. Call `match_context_chunks` RPC with filters
3. Optionally enrich results by loading full thread context for matched chunks
4. Optionally attach the user's working patterns and today's memory snapshot
5. Return ranked results

#### 2D. Context Summary Generator

A utility function that takes a set of context chunks and generates a coherent summary. Used by the briefing agent, meeting prep agent, and chat agent.

```typescript
export async function summarizeContext(params: {
  chunks: ContextChunk[];
  purpose: string;              // "meeting prep for call with John", "weekly project summary", etc.
  maxLength?: number;           // target word count
  userId: string;
}): Promise<{
  summary: string;
  sources: Array<{ title: string; source_ref: Record<string, unknown> }>;
}>;
```

Uses the STANDARD model (Sonnet). Always includes source citations.

---

## FEATURE 3: AI CHAT WITH FULL CONTEXT AWARENESS

### What It Does
Upgrades the existing chat interface so that when the user asks a question, the AI has access to the full context memory — not just the current briefing and inbox, but everything Donna has observed.

### What Already Exists
- Chat route at `/api/chat` with tool-calling loop
- 12 tools defined in `src/lib/ai/tools/chat-tools.ts`
- Chat system prompt in `src/lib/ai/prompts/chat.ts`

### What You Need To Build

#### 3A. New Chat Tools (add to `chat-tools.ts`)

Add these new tools to the existing `CHAT_TOOL_DEFINITIONS` array:

1. **`search_memory`** — Semantic search across all context chunks
   - Inputs: `query` (string), `time_range` ('today' | 'this_week' | 'this_month' | 'all'), `provider` (optional string), `project` (optional string), `person` (optional string email), `limit` (optional number)
   - Returns: matched context chunks with similarity scores

2. **`get_working_patterns`** — Returns the user's working patterns
   - No inputs required
   - Returns: full `working_patterns` record

3. **`get_day_summary`** — Returns a memory snapshot for a given date
   - Inputs: `date` (string, ISO format, defaults to today)
   - Returns: `memory_snapshot` for that date

4. **`search_by_person`** — Find all context involving a specific person
   - Inputs: `email` (string), `limit` (optional number, default 20)
   - Returns: context chunks where the person is in the `people` array, ordered by recency

5. **`search_by_project`** — Find all context related to a project
   - Inputs: `project` (string), `limit` (optional number, default 20)
   - Returns: context chunks where the project is in the `projects` array, ordered by recency

6. **`get_thread_context`** — Get full context of a conversation thread
   - Inputs: `thread_id` (string)
   - Returns: all context chunks in the thread + the thread summary

7. **`what_happened`** — Natural language time-range query
   - Inputs: `time_range` ('yesterday' | 'this_week' | 'last_week' | 'this_month'), `focus` (optional: 'meetings' | 'emails' | 'tasks' | 'projects' | 'people')
   - Uses memory snapshots + context chunks to generate a narrative answer

Add corresponding execution logic in the `executeChatTool` switch statement.

#### 3B. Enhanced Chat System Prompt

Update `src/lib/ai/prompts/chat.ts` to include context-awareness instructions. The prompt should tell Claude:

```
You are Donna, a personal intelligence assistant. You have access to the user's full digital context — their emails, messages, meetings, documents, tasks, and working patterns.

When the user asks a question:
1. ALWAYS use the search_memory tool first to find relevant context before answering.
2. If the question is about a specific person, use search_by_person.
3. If the question is about a specific project, use search_by_project.
4. If the question is about "what happened" or "what did I do", use what_happened or get_day_summary.
5. Reference specific sources in your answers — say "according to your email with Sarah on Tuesday" not "based on your data".
6. If you reference the user's working patterns, be conversational about it — "I've noticed you typically..." not "your working_patterns record shows..."

You understand the user's working patterns:
- When they typically work
- Who they collaborate with most
- What projects they're focused on
- How they communicate (response times, channels)

Use this understanding to give personalized, contextual answers. Don't just retrieve data — synthesize it into actionable insight.
```

#### 3C. Context-Aware Chat API Enhancement

Modify the `/api/chat` route to:
1. Before sending the first message to Claude, pre-fetch the user's `working_patterns` and inject them into the system prompt as context.
2. Increase the `max_tokens` for responses that use memory tools (these tend to be longer, richer answers).
3. Add a `context_budget` parameter: for each chat turn, fetch up to N relevant context chunks proactively (not via tools) and inject them as system context. Default N=5 based on the user's last message.

---

## FEATURE 4: MEETING INTELLIGENCE

### What It Does
Before every meeting, Donna automatically generates a comprehensive prep brief. After every meeting (once transcription is available), it captures the full context — decisions made, action items, who said what — and stores it in the memory system.

### What Already Exists
- `meeting-prep.ts` agent that generates pre-meeting briefs
- `calendar-scan.ts` heartbeat job that pulls calendar events
- `document_chunks` with meeting-related embeddings

### What You Need To Build

#### 4A. Pre-Meeting Context Enrichment

Enhance the existing `meeting-prep.ts` agent:

1. Before generating the meeting prep, query the context memory for:
   - All context chunks involving any of the meeting attendees (last 30 days)
   - All context chunks tagged with projects that might be relevant (inferred from meeting title + attendees)
   - The user's last 3 interactions with each attendee (from `contact_interactions`)
   - Any open commitments to/from attendees
2. Feed this enriched context into the meeting prep prompt
3. Store the generated prep brief as a `context_chunk` with `chunk_type = 'calendar_event'` and `importance = 'important'`

#### 4B. Meeting Transcription Pipeline

**Note: For MVP, we are NOT building real-time audio capture.** Instead, we integrate with meeting transcription services that users already have.

Create `src/lib/integrations/meeting-transcription.ts`:

1. **Otter.ai integration** — If the user connects Otter.ai (via OAuth), pull transcripts after meetings end
2. **Google Meet transcription** — If the user uses Google Meet with transcription enabled, pull transcripts via Google Drive API (transcripts are saved as Docs)
3. **Zoom cloud recording transcripts** — If connected, pull from Zoom API
4. **Manual upload** — Allow users to paste or upload meeting notes/transcripts

Regardless of source, the transcript goes through the context pipeline:
1. `sanitiseContent()` on the full transcript
2. Use Haiku to extract:
   - Key decisions made
   - Action items (with assignee if identifiable)
   - Topics discussed
   - Questions raised but not answered (open loops)
3. Use Sonnet to generate a concise meeting summary (5-10 sentences)
4. Store as a `context_chunk` with `chunk_type = 'calendar_event'`, `importance = 'critical'`
5. Auto-create/update commitments for any action items assigned to the user (via existing commitment extraction agent)

Create a new Trigger.dev job: `trigger/heartbeat/meeting-transcript-scan.ts`
- Runs every 30 minutes
- Checks connected transcription services for new transcripts
- Matches transcripts to calendar events by time window + attendee overlap
- Processes through the context pipeline

#### 4C. Post-Meeting Auto-Actions

After processing a meeting transcript, automatically:
1. Update the `context_threads` entry for this meeting with the full summary
2. Update `contact_interactions` for all attendees
3. Extract commitments via the existing commitment extraction pipeline
4. If the meeting had action items for the user, surface them in the next briefing as `action_required` items
5. Update relationship scores for all attendees (they just had a meeting — the relationship should reflect this)

#### 4D. Meeting Context API

Create a new API route: `GET /api/meetings/[eventId]/context`
- Authenticated with `withAuth`
- Returns: calendar event details + pre-meeting prep + post-meeting summary + action items + related context chunks
- This powers a future "meeting detail" view in the UI

---

## IMPLEMENTATION ORDER

Build in this exact order:

### Phase 1: Foundation (build first, everything depends on this)
1. Migration `008_context_memory.sql` — create all new tables
2. `src/lib/context/pipeline.ts` — core context processing pipeline
3. `src/lib/ai/agents/context-extractor.ts` — AI extraction agent
4. `src/lib/context/adapters/` — integration adapters (start with gmail, slack, calendar, notion)
5. DB query functions in `src/lib/db/queries/context.ts`

### Phase 2: Memory Intelligence
6. `src/lib/context/query-engine.ts` — unified context query interface
7. `trigger/memory/generate-daily-snapshot.ts` — daily memory snapshots
8. `trigger/memory/analyze-working-patterns.ts` — working pattern analysis
9. `src/lib/ai/agents/memory-snapshot.ts` — snapshot generation agent
10. `src/lib/ai/agents/pattern-analyzer.ts` — pattern analysis agent

### Phase 3: Chat Enhancement
11. Add new tools to `src/lib/ai/tools/chat-tools.ts`
12. Update `src/lib/ai/prompts/chat.ts` — context-aware system prompt
13. Enhance `/api/chat` route with proactive context injection
14. Add context query API routes:
    - `GET /api/context/search` — semantic search endpoint
    - `GET /api/context/patterns` — working patterns endpoint
    - `GET /api/context/snapshot` — daily snapshot endpoint

### Phase 4: Meeting Intelligence
15. Enhance `meeting-prep.ts` with context enrichment
16. `src/lib/integrations/meeting-transcription.ts` — transcript source adapters
17. `trigger/heartbeat/meeting-transcript-scan.ts` — transcript polling job
18. Post-meeting auto-actions pipeline
19. `GET /api/meetings/[eventId]/context` — meeting context API

### Phase 5: Wire Into Existing Systems
20. Add `processContextFromScan()` calls to existing heartbeat scan jobs (gmail-scan, slack-scan, calendar-scan, etc.) — this is the LAST step because it turns on the firehose
21. Test with a single integration first (Gmail), verify context chunks are being created correctly
22. Roll out to remaining integrations one by one

---

## TESTING REQUIREMENTS

For each phase, write:
- **Unit tests** for all new agent functions (mock AI responses, test extraction logic)
- **Unit tests** for all adapter functions (test data mapping)
- **Integration tests** for context query engine (test against Supabase)
- **Integration tests** for the full pipeline (raw data in → context chunks out)

Test files go next to the source files: `context-extractor.test.ts`, `pipeline.test.ts`, etc.

---

## IMPORTANT PERFORMANCE CONSIDERATIONS

1. **Embedding cost:** Each context chunk costs ~$0.00002 to embed (text-embedding-3-small). At 1000 chunks/day/user, that's $0.02/day. Acceptable, but implement the dedup hash check BEFORE calling the embedding API.

2. **AI extraction cost:** Each Haiku call for context extraction costs ~$0.001. At 1000 items/day, that's $1/day/user. Use aggressive dedup and importance-based filtering (skip items the heartbeat already classified as noise).

3. **Vector search performance:** The ivfflat index with 200 lists handles up to ~1M vectors per user efficiently. For users with very high volume, consider partitioning by time window.

4. **Memory retention policy:**
   - `critical` chunks: never expire
   - `important` chunks: expire after 1 year
   - `background` chunks: expire after 90 days
   - `noise` chunks: expire after 14 days
   - Set `expires_at` accordingly during the extraction phase

5. **Batch size:** When processing heartbeat results, batch context extraction in groups of 10. Use a 100ms delay between batches to respect Anthropic rate limits.

---

## FILES YOU WILL CREATE

```
src/lib/context/
├── pipeline.ts                    -- Core context processing pipeline
├── query-engine.ts                -- Unified context query interface
├── types.ts                       -- Shared types for context system
└── adapters/
    ├── gmail-adapter.ts
    ├── slack-adapter.ts
    ├── calendar-adapter.ts
    ├── notion-adapter.ts
    ├── task-adapter.ts
    ├── code-adapter.ts
    └── generic-adapter.ts

src/lib/ai/agents/
├── context-extractor.ts           -- AI context extraction agent
├── pattern-analyzer.ts            -- Working pattern analysis agent
└── memory-snapshot.ts             -- Daily memory snapshot agent

src/lib/ai/prompts/
└── context-extraction.ts          -- Prompts for context extraction

src/lib/db/queries/
└── context.ts                     -- DB queries for context tables

src/lib/integrations/
└── meeting-transcription.ts       -- Meeting transcript integrations

trigger/memory/
├── analyze-working-patterns.ts    -- Daily pattern analysis job
└── generate-daily-snapshot.ts     -- Daily memory snapshot job

trigger/heartbeat/
└── meeting-transcript-scan.ts     -- Meeting transcript polling job

supabase/migrations/
└── 008_context_memory.sql         -- All new tables + functions + indexes

src/app/api/context/
├── search/route.ts                -- Context search API
├── patterns/route.ts              -- Working patterns API
└── snapshot/route.ts              -- Memory snapshot API

src/app/api/meetings/
└── [eventId]/context/route.ts     -- Meeting context API
```

## FILES YOU WILL MODIFY

```
src/lib/ai/tools/chat-tools.ts    -- Add 7 new tools
src/lib/ai/prompts/chat.ts        -- Enhance system prompt
src/app/api/chat/route.ts         -- Add proactive context injection
src/lib/ai/agents/meeting-prep.ts -- Enhance with context enrichment
.env.example                       -- Add any new env vars
docs/DATABASE.md                   -- Document new tables
```

---

## HOW TO VALIDATE YOUR WORK

After building each phase, verify:

**Phase 1:** Run the gmail-adapter manually with test data → confirm a `context_chunk` row is created in Supabase with correct embedding, entities, topics, projects, importance.

**Phase 2:** Run the working pattern analyzer for a test user with 30 days of context → confirm `working_patterns` record has realistic data. Run the snapshot generator → confirm `memory_snapshots` has a coherent narrative.

**Phase 3:** Open the chat and ask "what did I work on this week?" → verify it uses `what_happened` tool and returns a contextual answer. Ask "what's my relationship with [person]?" → verify it uses `search_by_person`.

**Phase 4:** Create a mock meeting transcript → verify it creates context chunks, extracts commitments, and updates contact interactions.

---

## ONE FINAL NOTE

The context capture system is the foundation of everything Donna does. The briefing, the chat, the meeting prep, the operations layer — all of them get dramatically better when they have rich context to draw from. Build this system to be robust, efficient, and comprehensive. Every email, every Slack message, every calendar event, every task update should flow through this pipeline and become part of Donna's understanding of the user's world. The user should feel like Donna *knows* them — their projects, their people, their patterns, their priorities — without them ever having to explain anything.
