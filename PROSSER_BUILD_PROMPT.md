# Claude Code Build Prompt — "Morning Operations Layer" (Prosser-Style Donna)

> **What this is:** A comprehensive prompt to paste into Claude Code that will build an automated morning operations system inspired by Jim Prosser's Donna architecture, integrated into your existing Donna Next.js project. This adds a local CLI-driven orchestration layer with six parallel subagents, overnight automations, task classification, and intelligent time-blocking.

---

## THE PROMPT (copy everything below this line into Claude Code)

---

I'm building a "Morning Operations Layer" for my existing Donna project. Read `CLAUDE.md` before doing anything, then read `docs/AGENTS.md`, `docs/INTEGRATIONS.md`, and `docs/DATABASE.md` for full context on what already exists.

This project is a Next.js app with Supabase, Nango OAuth, Trigger.dev background jobs, Gmail/Calendar/Slack/Outlook integrations, and an AI agent pipeline already built. I now need you to add a powerful new layer on top of it: an automated morning operations system with overnight automations, a task classifier ("AM Sweep"), six parallel subagents, and an intelligent time-blocker. All of this should be operable from the CLI (via Claude Code slash commands or standalone scripts) as well as triggerable from the web dashboard.

Here is the full architecture. Build it session by session, in order. Do not skip sessions or combine them.

---

### ARCHITECTURE OVERVIEW

```
OVERNIGHT AUTOMATIONS (run via cron / Trigger.dev at ~5:30 AM user timezone)
│
├── 1. Calendar Drive Time Calculator
│       └── Scans today + tomorrow's Google Calendar
│       └── Finds events with physical locations
│       └── Calculates real drive times via Google Maps Directions API
│       └── Creates "transit buffer" events on the calendar
│       └── Prevents double-booking during travel windows
│
├── 2. Email Triage & Task Creator
│       └── Scans yesterday's inbox (Gmail + Outlook)
│       └── Skips newsletters, notifications, and anything CC-only
│       └── For each actionable email, creates a task in the task system with:
│           - A clear title starting with a verb
│           - Priority (P1 = actually hurts me, P2 = just delays, P3 = flexible, P4 = doesn't matter)
│           - Estimated duration
│           - Source reference back to the email
│           - Tags (home, office, errand, call, deep-work)
│       └── Deduplicates against existing tasks
│       └── Uses Haiku model (cheap/fast)
│
AM SWEEP (triggered by user — CLI command or dashboard button)
│
├── 3. Task Classifier & Context Assembler
│       └── Pulls ALL open tasks (from overnight + existing backlog)
│       └── Pulls today's calendar events
│       └── Pulls recent meeting transcripts (if available)
│       └── Classifies every task into four categories:
│           🟢 GREEN (dispatch)  = AI can handle fully — draft email, update notes, schedule meeting, do research
│           🟡 YELLOW (prep)     = AI can get 80% done, user finishes — prep options, draft with choices
│           🔴 RED (yours)       = Needs user's brain — strategic calls, pricing, sensitive comms
│           ⬜ GRAY (skip)       = Not actionable today — defer with reason
│       └── For GREEN + YELLOW tasks, assembles context packages for subagents
│       └── Shows classified list to user for review/adjustment
│       └── On user confirmation ("go"), dispatches to the six subagents
│
├── SUBAGENT DISPATCH (six agents run in PARALLEL via Claude Code Task tool)
│   │
│   ├── Agent 1: EMAIL DRAFTER
│   │     └── Takes GREEN email tasks
│   │     └── Drafts replies in user's voice (learned from sent email patterns)
│   │     └── Creates Gmail drafts — NEVER sends
│   │     └── Reports: "Drafted reply to [person] re: [subject]"
│   │
│   ├── Agent 2: CLIENT NOTES UPDATER
│   │     └── Takes tasks related to client/project documentation
│   │     └── Updates Notion pages or local markdown knowledge base
│   │     └── Adds meeting notes, action items, status updates
│   │     └── Reports: "Updated [client] notes with [summary]"
│   │
│   ├── Agent 3: MEETING SCHEDULER
│   │     └── Takes scheduling-related tasks
│   │     └── Checks calendar availability
│   │     └── Creates calendar events with proper attendees and links
│   │     └── For complex scheduling: prepares options for user review
│   │     └── Reports: "Scheduled [meeting] for [date/time]" or "Prepared 3 time options for [meeting]"
│   │
│   ├── Agent 4: RESEARCH AGENT
│   │     └── Takes research tasks (prospect research, topic research, news monitoring)
│   │     └── Searches web, compiles findings
│   │     └── Saves research to knowledge base with source citations
│   │     └── Reports: "Compiled research on [topic] — [X] sources, saved to [location]"
│   │
│   ├── Agent 5: TASK EXECUTOR
│   │     └── Takes remaining GREEN tasks that don't fit other agents
│   │     └── Handles: file organization, data entry, form completion, list creation
│   │     └── Reports: "Completed [task description]"
│   │
│   └── Agent 6: PREP AGENT
│         └── Takes all YELLOW tasks
│         └── Gets each task 80% done with clear decision points for user
│         └── For each task, produces: draft output + 2-3 options where decisions are needed
│         └── Reports: "Prepped [task] — needs your decision on [specific thing]"
│
└── COMPLETION REPORT
        └── Aggregates all agent reports
        └── Shows: tasks completed, drafts waiting for review, items needing user decisions
        └── Sends via Telegram + displays in dashboard

TIME BLOCKER (triggered by user — second CLI command or dashboard button)
│
└── 4. Intelligent Time-Block Generator
        └── Takes all remaining tasks (RED + reviewed YELLOW + anything new)
        └── Reads duration estimates from each task
        └── Reads calendar for existing commitments
        └── Applies scheduling rules:
            - Tasks tagged "home" go after 7pm
            - Tasks tagged "errand" get batched into one outing window
            - Errands are routed geographically to minimize backtracking (Google Maps)
            - Tasks tagged "deep-work" get 90-min uninterrupted blocks in the morning
            - Tasks tagged "call" get scheduled in available windows between meetings
            - Gym/exercise gets scheduled on configured days
            - Buffer time between meetings (10 min default)
        └── If something doesn't fit today, recommends a specific future day based on load
        └── Shows proposed schedule to user for approval
        └── On confirmation, creates calendar events for each block
```

---

### SESSION A — Database Schema Extensions

**Goal**: Add tables and fields needed for the operations layer.

**What to build**:

1. New migration `supabase/migrations/XXX_operations_layer.sql`:

```sql
-- Task classification metadata
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS operation_category TEXT CHECK (operation_category IN ('green', 'yellow', 'red', 'gray'));
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS operation_context JSONB DEFAULT '{}';
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER;
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS task_tags TEXT[] DEFAULT '{}';
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS task_title TEXT;
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS deferred_to DATE;
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS defer_reason TEXT;

-- Operations run log
CREATE TABLE IF NOT EXISTS operation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL CHECK (run_type IN ('overnight_email', 'overnight_calendar', 'am_sweep', 'time_block')),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  result JSONB DEFAULT '{}',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE operation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their own operation runs"
  ON operation_runs FOR ALL USING (auth.uid() = user_id);

-- Subagent execution log
CREATE TABLE IF NOT EXISTS subagent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_run_id UUID NOT NULL REFERENCES operation_runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('email_drafter', 'notes_updater', 'meeting_scheduler', 'researcher', 'task_executor', 'prep_agent')),
  task_ids UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  result JSONB DEFAULT '{}',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subagent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their own subagent runs"
  ON subagent_runs FOR ALL USING (auth.uid() = user_id);

-- Transit buffer events
CREATE TABLE IF NOT EXISTS transit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_event_id TEXT NOT NULL,
  origin_location TEXT,
  destination_location TEXT,
  drive_duration_seconds INTEGER NOT NULL,
  departure_time TIMESTAMPTZ NOT NULL,
  arrival_time TIMESTAMPTZ NOT NULL,
  google_calendar_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE transit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their own transit events"
  ON transit_events FOR ALL USING (auth.uid() = user_id);

-- Time block entries
CREATE TABLE IF NOT EXISTS time_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_run_id UUID REFERENCES operation_runs(id),
  task_id UUID,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('task', 'errand_batch', 'deep_work', 'exercise', 'transit', 'buffer')),
  location TEXT,
  google_calendar_event_id TEXT,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'confirmed', 'completed', 'skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their own time blocks"
  ON time_blocks FOR ALL USING (auth.uid() = user_id);

-- User operations preferences
CREATE TABLE IF NOT EXISTS user_operations_config (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  overnight_enabled BOOLEAN DEFAULT true,
  overnight_run_time TIME DEFAULT '05:30',
  home_tasks_after TIME DEFAULT '19:00',
  exercise_days INTEGER[] DEFAULT '{1,3,5}',
  exercise_duration_minutes INTEGER DEFAULT 60,
  default_buffer_minutes INTEGER DEFAULT 10,
  deep_work_preferred_time TEXT DEFAULT 'morning',
  errand_batch_enabled BOOLEAN DEFAULT true,
  home_address TEXT,
  office_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_operations_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their own operations config"
  ON user_operations_config FOR ALL USING (auth.uid() = user_id);
```

2. Update `lib/db/types.ts` with TypeScript types for all new tables.
3. Add new query files: `lib/db/queries/operations.ts`, `lib/db/queries/transit.ts`, `lib/db/queries/time-blocks.ts`.
4. Update `docs/DATABASE.md` with the new tables.

**Definition of done**: `supabase db push` applies without errors. All tables have RLS. TypeScript types match schema.

---

### SESSION B — Google Maps Integration

**Goal**: Drive time calculation works.

**What to build**:

1. `lib/integrations/google-maps.ts`:
   - `calculateDriveTime(origin: string, destination: string, departBy: Date): Promise<DriveTimeResult>`
   - `calculateRouteForErrands(stops: string[]): Promise<OptimizedRoute>` (for errand batching)
   - `geocodeAddress(address: string): Promise<LatLng>`
   - Uses Google Maps Directions API + Distance Matrix API
   - Respects free tier limits — cache results in Supabase for 24 hours
   - Add `GOOGLE_MAPS_API_KEY` to `.env.example` and `lib/config.ts`

2. Unit tests for drive time parsing and caching.

**Definition of done**: `calculateDriveTime("123 Main St, SF", "456 Market St, SF", new Date())` returns a valid duration. Results are cached.

---

### SESSION C — Overnight Automation #1: Calendar Drive Time Calculator

**Goal**: Transit buffer events auto-created overnight.

**What to build**:

1. `lib/ai/agents/operations/calendar-transit.ts`:
   - Fetch today + tomorrow's calendar events via existing `google-calendar.ts` integration
   - Filter for events with a physical location field (not Zoom/virtual)
   - For each event with a location, calculate drive time from user's configured home/office address
   - Account for back-to-back meetings (use previous event's location as origin)
   - Create transit buffer events on Google Calendar: "[Transit] → Meeting Name"
   - Store transit events in `transit_events` table
   - Skip if transit event already exists for that calendar event

2. `trigger/operations/overnight-calendar-transit.ts` — Trigger.dev scheduled job
   - Runs at user's configured `overnight_run_time`
   - Uses Haiku model for any location parsing needed

**Definition of done**: Running the job creates transit buffer events on the actual Google Calendar. Events show drive duration in the title. No duplicates on re-run.

---

### SESSION D — Overnight Automation #2: Email Triage & Task Creator

**Goal**: Yesterday's actionable emails become properly attributed tasks.

**What to build**:

1. `lib/ai/agents/operations/email-triage.ts`:
   - Fetch yesterday's emails via existing `gmail.ts` and `outlook.ts` integrations
   - Filter out: newsletters (Unsubscribe header), notifications (noreply senders), CC-only messages
   - For each remaining email, use Haiku to produce:
     ```json
     {
       "is_actionable": true/false,
       "task_title": "Verb-first title (e.g., 'Reply to Sarah about Q3 budget')",
       "priority": "P1|P2|P3|P4",
       "estimated_duration_minutes": 15,
       "tags": ["office", "call"],
       "reason": "Why this needs action"
     }
     ```
   - Priority framework:
     - P1 = Actually hurts me if delayed (deadline today, VIP waiting, commitment at risk)
     - P2 = Delays something (blocks someone else, time-sensitive but not urgent)
     - P3 = Flexible (should do this week, no immediate consequence)
     - P4 = Doesn't matter (nice to do, no real impact)
   - Deduplicate: check existing `inbox_items` by `external_id` and existing tasks by fuzzy title match
   - Write to `inbox_items` table with the new operation fields populated

2. `trigger/operations/overnight-email-triage.ts` — Trigger.dev scheduled job
   - Runs at user's `overnight_run_time` (after calendar transit job)
   - Logs results to `operation_runs`

3. `lib/ai/prompts/operations/email-triage.ts` — The email triage prompt

**Definition of done**: Running the job creates inbox_items with `task_title`, `priority`, `estimated_duration_minutes`, and `task_tags` populated. Newsletters and notifications are skipped. No duplicate tasks.

---

### SESSION E — AM Sweep: Task Classifier

**Goal**: All tasks get classified into green/yellow/red/gray with context packages.

**What to build**:

1. `lib/ai/agents/operations/am-sweep.ts`:
   - `classifyTasks(userId: string): Promise<ClassifiedTaskSet>`:
     - Fetch all open inbox_items (unresolved, not deferred)
     - Fetch today's calendar events
     - Fetch recent meeting transcripts if available (from Notion or local docs)
     - Fetch user context (VIPs, active projects, preferences)
     - Use Sonnet model to classify each task:
       ```json
       {
         "task_id": "uuid",
         "category": "green|yellow|red|gray",
         "reasoning": "Why this classification",
         "agent_assignment": "email_drafter|notes_updater|meeting_scheduler|researcher|task_executor|prep_agent",
         "context_package": {
           "original_email_summary": "...",
           "relevant_calendar_events": [...],
           "relevant_contacts": [...],
           "relevant_documents": [...],
           "specific_instructions": "What the agent should do with this"
         }
       }
       ```
     - Classification rules:
       - GREEN: Has a clear, automatable action (draft email, update doc, schedule meeting, research topic)
       - YELLOW: Has an action but requires user judgment at some point (pricing, strategy, sensitive relationship)
       - RED: Fundamentally requires user's brain (writing, strategic calls, personal relationship management)
       - GRAY: Not actionable today (waiting on someone else, future deadline, insufficient context)
     - Bias toward YELLOW over GREEN on anything ambiguous

   - `presentClassification(classified: ClassifiedTaskSet): string` — Format for CLI display
   - `dispatchToAgents(confirmed: ClassifiedTaskSet): Promise<CompletionReport>` — Spawn six parallel subagents

2. `lib/ai/prompts/operations/task-classification.ts` — Classification prompt

3. API endpoint `app/api/operations/am-sweep/route.ts`:
   - POST: trigger AM sweep
   - GET: get latest sweep results

4. Dashboard component `components/operations/AMSweepPanel.tsx`:
   - Shows classified tasks in four columns (green/yellow/red/gray)
   - User can drag tasks between categories to reclassify
   - "Go" button dispatches to agents
   - Progress indicator while agents run

**Definition of done**: AM Sweep classifies all open tasks. User can review and adjust. Pressing "Go" dispatches to agents.

---

### SESSION F — The Six Subagents

**Goal**: All six subagents work in parallel.

**What to build**:

1. `lib/ai/agents/operations/subagents/email-drafter.ts`:
   - Takes GREEN email tasks
   - Analyzes user's sent email patterns for voice matching (pull recent sent messages)
   - Creates Gmail draft via Gmail API (drafts.create endpoint)
   - NEVER sends — draft only
   - Logs to `subagent_runs`

2. `lib/ai/agents/operations/subagents/notes-updater.ts`:
   - Takes documentation/notes tasks
   - Updates Notion pages via existing `notion.ts` integration
   - OR writes to local markdown files in a configured knowledge base directory
   - Adds meeting summaries, action items, status updates
   - Logs to `subagent_runs`

3. `lib/ai/agents/operations/subagents/meeting-scheduler.ts`:
   - Takes scheduling tasks
   - Checks calendar availability via existing `google-calendar.ts`
   - For simple scheduling: creates calendar event directly
   - For complex scheduling (multiple attendees, hard-to-find time): prepares 3 options
   - Logs to `subagent_runs`

4. `lib/ai/agents/operations/subagents/researcher.ts`:
   - Takes research tasks
   - Uses web search to compile findings
   - Saves structured research to knowledge base with source citations
   - Produces a research brief (markdown format)
   - Logs to `subagent_runs`

5. `lib/ai/agents/operations/subagents/task-executor.ts`:
   - Handles remaining GREEN tasks (file org, data compilation, list creation, etc.)
   - General-purpose task completion agent
   - Logs to `subagent_runs`

6. `lib/ai/agents/operations/subagents/prep-agent.ts`:
   - Takes all YELLOW tasks
   - Gets each task 80% complete
   - For each, produces: the draft output + clear decision points
   - Example: "Drafted response to client. Need your decision: (A) offer 10% discount, (B) hold firm on pricing, (C) propose alternative package"
   - Logs to `subagent_runs`

7. `lib/ai/agents/operations/dispatch.ts`:
   - `dispatchSubagents(tasks: ClassifiedTask[], runId: string): Promise<CompletionReport>`
   - Groups tasks by agent assignment
   - Fires all six agents in parallel (using Promise.allSettled)
   - Collects results from all agents
   - Produces unified completion report
   - Handles individual agent failures gracefully (other agents continue)

8. `lib/ai/prompts/operations/subagent-prompts.ts` — Prompts for each subagent

**Key rules for ALL subagents**:
- Every subagent gets its own context window (independent AI call)
- Every subagent has scoped tool access (email drafter can only access Gmail drafts, not send)
- Every subagent logs its actions to `subagent_runs`
- No subagent performs irreversible actions without user confirmation
- All subagents use existing safety patterns: `sanitiseContent()`, source citations, etc.
- Email drafter uses Haiku (speed). Research agent uses Sonnet (quality). Others use Haiku.

**Definition of done**: Running `dispatchSubagents()` fires six agents simultaneously. Each agent produces results. Completion report aggregates everything. No agent can send emails or make irreversible changes.

---

### SESSION G — Time Blocker

**Goal**: Remaining tasks become a time-blocked calendar.

**What to build**:

1. `lib/ai/agents/operations/time-blocker.ts`:
   - `generateTimeBlocks(userId: string): Promise<ProposedSchedule>`:
     - Fetch remaining tasks (RED + reviewed YELLOW + anything unhandled)
     - Fetch today's calendar (including newly created transit events)
     - Fetch user's `user_operations_config` preferences
     - Apply scheduling algorithm:
       1. Identify available time slots (gaps between existing calendar events)
       2. Apply tag-based constraints:
          - `deep-work` → morning blocks (before noon), minimum 90 min
          - `call` → business hours, not overlapping meetings
          - `errand` → batch into single outing, route via Google Maps, include transit time
          - `home` → after user's configured `home_tasks_after` time
          - `exercise` → on configured exercise days, at configured time
       3. Sort tasks by priority (P1 first) then by duration (quick wins fill small gaps)
       4. For each task, find the best available slot matching its constraints
       5. If a task doesn't fit today, recommend specific future day (check that day's load)
       6. Add buffer time between blocks (configurable, default 10 min)
     - Return proposed schedule for user review

   - `confirmTimeBlocks(userId: string, blocks: TimeBlock[]): Promise<void>`:
     - Create Google Calendar events for each confirmed block
     - Store in `time_blocks` table
     - Log to `operation_runs`

   - `getErrandRoute(errands: Task[]): Promise<BatchedErrandPlan>`:
     - Extract locations from errand tasks
     - Use Google Maps to calculate optimal route
     - Return ordered stops with drive times between each

2. API endpoint `app/api/operations/time-block/route.ts`:
   - POST: generate proposed time blocks
   - PUT: confirm proposed time blocks (creates calendar events)

3. Dashboard component `components/operations/TimeBlockPanel.tsx`:
   - Visual timeline showing proposed schedule
   - Drag-and-drop to reorder blocks
   - Confirm/adjust buttons
   - Shows overflow tasks with recommended future dates

**Definition of done**: Time blocker produces a valid schedule respecting all constraints. Confirming creates real Google Calendar events. Errands are batched and routed.

---

### SESSION H — Completion Report & Notifications

**Goal**: User gets a clean summary of everything the system did.

**What to build**:

1. `lib/ai/agents/operations/completion-report.ts`:
   - Aggregates results from all subagents
   - Formats into sections:
     - Tasks Completed (GREEN dispatched)
     - Drafts Waiting for Review (email drafts with links)
     - Items Needing Your Decision (YELLOW prep results)
     - Your Focus Items (RED tasks with supporting context)
     - Deferred to Future (GRAY items with reasons and recommended dates)
     - Today's Schedule Summary (from time blocker)

2. Telegram notification: send completion report via existing `telegram.ts`

3. Dashboard component `components/operations/CompletionReport.tsx`:
   - Clean card-based display of the report
   - Quick action buttons: "Review Draft", "Make Decision", "Start Task"

**Definition of done**: After AM Sweep + Time Block, user receives a single report via Telegram and in the dashboard showing the full state of their day.

---

### SESSION I — CLI Commands & Trigger Integration

**Goal**: Everything is triggerable from CLI and scheduled automations.

**What to build**:

1. Add npm scripts to `package.json`:
   ```json
   {
     "scripts": {
       "ops:overnight": "npx tsx scripts/operations/run-overnight.ts",
       "ops:sweep": "npx tsx scripts/operations/run-am-sweep.ts",
       "ops:timeblock": "npx tsx scripts/operations/run-time-blocker.ts",
       "ops:full": "npx tsx scripts/operations/run-full-morning.ts"
     }
   }
   ```

2. Create script files:
   - `scripts/operations/run-overnight.ts` — Runs both overnight automations
   - `scripts/operations/run-am-sweep.ts` — Runs AM Sweep interactively (shows classification, waits for confirmation)
   - `scripts/operations/run-time-blocker.ts` — Runs time blocker interactively
   - `scripts/operations/run-full-morning.ts` — Runs complete morning sequence

3. Trigger.dev jobs:
   - `trigger/operations/overnight-calendar-transit.ts` (from Session C)
   - `trigger/operations/overnight-email-triage.ts` (from Session D)
   - `trigger/operations/scheduled-am-sweep.ts` — Optional: auto-run AM Sweep at configured time

4. Dashboard "Operations" page: `app/(dashboard)/operations/page.tsx`:
   - "Run Overnight" button
   - "AM Sweep" button → shows classification → "Go" dispatches agents
   - "Time Block" button → shows proposed schedule → "Confirm" creates events
   - Run history log

**Definition of done**: `npm run ops:full` runs the complete morning sequence. Dashboard buttons work. Trigger.dev jobs run on schedule.

---

### SESSION J — Operations Preferences UI

**Goal**: User can configure all operations settings.

**What to build**:

1. `app/(dashboard)/settings/operations/page.tsx`:
   - Toggle overnight automations on/off
   - Set overnight run time
   - Set home address and office address (for drive time calculations)
   - Set "home tasks after" time
   - Configure exercise days and duration
   - Set deep work preferred time (morning/afternoon)
   - Toggle errand batching
   - Set default buffer minutes between meetings
   - Set task classification overrides (e.g., "emails from X always go RED")

2. API endpoint `app/api/settings/operations/route.ts`:
   - GET: fetch user's operations config
   - PATCH: update operations config

**Definition of done**: All settings are configurable and persisted. Overnight automations respect the configured schedule.

---

### CRITICAL DESIGN PRINCIPLES (enforce these everywhere)

1. **Human-in-the-loop by default**: The system NEVER sends emails, NEVER makes irreversible changes without user confirmation. It drafts, proposes, and recommends. The user approves.

2. **Bias toward prep over dispatch**: When classification is ambiguous, default to YELLOW (prep) rather than GREEN (dispatch). Better to over-involve the user than under-involve them.

3. **Each layer feeds the next**: Overnight email triage produces metadata that AM Sweep needs. AM Sweep assembles context that subagents need. Subagent output feeds the completion report. The time blocker reads everything upstream. Remove any layer and the others still work, but together they compound.

4. **Fail gracefully**: If one subagent fails, the others continue. If Google Maps is down, skip transit events but still do email triage. Never let one failure cascade.

5. **Use existing patterns**: All new code must use `sanitiseContent()` before AI calls, `source_ref` on every claim, model constants from `lib/ai/models.ts`, RLS on every table, and `withAuth` on every API route. Follow all rules in CLAUDE.md.

6. **Model selection**: Overnight automations and high-volume agents (email drafter, task executor) use Haiku. Classification and complex reasoning (AM Sweep classifier, research agent) use Sonnet. Never use Opus unless explicitly requested by user.

7. **Logging**: Every operation run and every subagent execution gets logged to the database with status, duration, and results. This is non-negotiable for debugging and trust-building.

---

### FILE STRUCTURE FOR NEW CODE

```
lib/ai/agents/operations/
├── calendar-transit.ts          ← Overnight: drive time calculator
├── email-triage.ts              ← Overnight: email → tasks
├── am-sweep.ts                  ← AM Sweep: classifier + dispatcher
├── time-blocker.ts              ← Time Block: schedule generator
├── completion-report.ts         ← Completion report generator
├── dispatch.ts                  ← Parallel subagent orchestrator
└── subagents/
    ├── email-drafter.ts
    ├── notes-updater.ts
    ├── meeting-scheduler.ts
    ├── researcher.ts
    ├── task-executor.ts
    └── prep-agent.ts

lib/ai/prompts/operations/
├── email-triage.ts
├── task-classification.ts
└── subagent-prompts.ts

lib/integrations/
└── google-maps.ts               ← New: Google Maps Directions/Distance Matrix

lib/db/queries/
├── operations.ts                ← New: operation_runs + subagent_runs queries
├── transit.ts                   ← New: transit_events queries
└── time-blocks.ts               ← New: time_blocks queries

trigger/operations/
├── overnight-calendar-transit.ts
├── overnight-email-triage.ts
└── scheduled-am-sweep.ts

scripts/operations/
├── run-overnight.ts
├── run-am-sweep.ts
├── run-time-blocker.ts
└── run-full-morning.ts

app/api/operations/
├── am-sweep/route.ts
├── time-block/route.ts
└── completion-report/route.ts

app/api/settings/operations/route.ts

app/(dashboard)/operations/page.tsx

components/operations/
├── AMSweepPanel.tsx
├── TimeBlockPanel.tsx
└── CompletionReport.tsx
```

---

Start with Session A (database schema). After each session, run `npm run typecheck` and fix any errors before moving to the next session. Build each session completely before starting the next one.
