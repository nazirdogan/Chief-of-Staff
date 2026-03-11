/**
 * Job Runner — executes a single job for a single user.
 *
 * Each job's run function is the extracted body of the corresponding
 * background task. Imports are dynamic to avoid loading everything at startup.
 */

import { createServiceClient } from '@/lib/db/client';
import { JOB_REGISTRY, type JobResult } from './job-registry';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

function getDb(): DB {
  return createServiceClient() as DB;
}

/** Log a heartbeat_runs entry. Returns the row ID for later update. */
async function startHeartbeatRun(
  db: DB,
  userId: string,
  jobName: string,
  provider?: string,
  catchUpSessionId?: string,
): Promise<string | null> {
  const { data } = await db
    .from('heartbeat_runs')
    .insert({
      user_id: userId,
      job_name: jobName,
      provider: provider ?? null,
      status: 'running',
      ...(catchUpSessionId ? { catch_up_session_id: catchUpSessionId } : {}),
    })
    .select('id')
    .single();
  return data?.id ?? null;
}

/** Update heartbeat_runs on completion or failure. */
async function finishHeartbeatRun(
  db: DB,
  runId: string | null,
  status: 'completed' | 'failed',
  startedAt: number,
  result?: { processed?: number; found?: number; error?: string },
): Promise<void> {
  if (!runId) return;
  await db
    .from('heartbeat_runs')
    .update({
      status,
      items_processed: result?.processed ?? 0,
      items_found: result?.found ?? 0,
      duration_ms: Date.now() - startedAt,
      completed_at: new Date().toISOString(),
      ...(result?.error ? { error_message: result.error } : {}),
    })
    .eq('id', runId);
}

/**
 * Run a single job for a single user.
 * Returns the result or throws on unrecoverable error.
 */
export async function runJob(
  jobId: string,
  userId: string,
  options?: { catchUpSessionId?: string },
): Promise<JobResult> {
  const db = getDb();
  const startedAt = Date.now();

  // Determine provider for heartbeat logging
  const providerMap: Record<string, string> = {
    'gmail-scan': 'gmail',
    'gmail-watch-renew': 'gmail',
    'calendar-scan': 'google_calendar',
    'slack-scan': 'slack',
    'document-index': 'notion',
  };

  const provider = providerMap[jobId];

  // Only heartbeat/briefing jobs log to heartbeat_runs
  const def = JOB_REGISTRY.find((j) => j.id === jobId);
  const shouldLog = def?.category === 'heartbeat' || def?.category === 'briefing';

  const runId = shouldLog
    ? await startHeartbeatRun(db, userId, jobId, provider, options?.catchUpSessionId)
    : null;

  try {
    const result = await executeJobLogic(jobId, userId, db);

    if (runId) {
      await finishHeartbeatRun(db, runId, 'completed', startedAt, result);
    }

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';

    if (runId) {
      await finishHeartbeatRun(db, runId, 'failed', startedAt, { error: errorMsg });
    }

    return { processed: 0, error: errorMsg };
  }
}

/**
 * Execute the actual job logic. Each case lazily imports the required module
 * so we don't load every agent at startup.
 */
async function executeJobLogic(jobId: string, userId: string, db: DB): Promise<JobResult> {
  switch (jobId) {
    // ── Email / Communication Scans ──
    case 'gmail-scan': {
      const { ingestGmailMessages } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestGmailMessages(userId);
      // Run engagement/archiving post-processing
      await runGmailPostProcessing(db, userId);
      return { processed: result.processed, found: result.found };
    }
    case 'gmail-watch-renew': {
      const { setupGmailWatch } = await import('@/lib/integrations/gmail');
      const { saveGmailHistoryId } = await import('@/lib/db/queries/integrations');
      const { historyId, expiration } = await setupGmailWatch(userId);
      await saveGmailHistoryId(db, userId, historyId, expiration);
      return { processed: 1 };
    }
    case 'slack-scan': {
      const { ingestSlackDMs } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestSlackDMs(userId);
      return { processed: result.processed, found: result.found };
    }

    // ── Calendar ──
    case 'calendar-scan': {
      const { getTodaysParsedEvents } = await import('@/lib/integrations/google-calendar');
      let eventsLoaded = 0;
      try {
        const events = await getTodaysParsedEvents(userId);
        eventsLoaded += events.length;
      } catch { /* not connected */ }
      return { processed: eventsLoaded, found: eventsLoaded };
    }


    // ── Intelligence ──
    case 'commitment-check': {
      const { extractCommitmentsFromGmail } = await import('@/lib/ai/agents/commitment');
      const { data: integrations } = await db
        .from('user_integrations')
        .select('provider')
        .eq('user_id', userId)
        .eq('status', 'connected')
        .eq('provider', 'gmail');
      const connected = new Set((integrations ?? []).map((i: { provider: string }) => i.provider));
      let extracted = 0;
      let total = 0;
      if (connected.has('gmail')) {
        try {
          const { getGmailClient } = await import('@/lib/integrations/gmail');
          const gmail = await getGmailClient(userId);
          const response = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 20,
            labelIds: ['SENT'],
            q: 'newer_than:1d',
          });
          const messageIds = (response.data.messages ?? [])
            .map((m: { id?: string | null }) => m.id)
            .filter((id: string | null | undefined): id is string => !!id);
          const result = await extractCommitmentsFromGmail(userId, messageIds);
          extracted += result.extracted;
          total += result.total;
        } catch { /* gmail not connected */ }
      }
      return { processed: extracted, found: total };
    }
    case 'relationship-check': {
      const { getAllContactsForScoring } = await import('@/lib/db/queries/contacts');
      const { computeRelationshipUpdates } = await import('@/lib/ai/agents/relationship');
      const contacts = await getAllContactsForScoring(db, userId);
      const updates = await computeRelationshipUpdates(contacts);
      // Apply updates
      for (const update of updates) {
        await db.from('contacts').update({
          relationship_score: update.newScore,
          is_cold: update.isCold,
          ...(update.isCold ? { cold_flagged_at: new Date().toISOString() } : {}),
        }).eq('id', update.contactId);
      }
      return { processed: updates.length, found: contacts.length };
    }
    case 'document-index': {
      const { listRecentPages, chunkPageContent } = await import('@/lib/integrations/notion');
      const { generateEmbedding } = await import('@/lib/ai/embeddings');
      const pages = await listRecentPages(userId, 50);
      let chunksIndexed = 0;
      for (const page of pages) {
        const chunks = chunkPageContent(page);
        for (const chunk of chunks) {
          const embedding = await generateEmbedding(chunk.content);
          const { error: upsertError } = await db
            .from('document_chunks')
            .upsert(
              {
                user_id: userId,
                provider: 'notion',
                source_id: chunk.pageId,
                chunk_index: chunk.chunkIndex,
                content_summary: chunk.content,
                embedding,
                metadata: {
                  title: chunk.pageTitle,
                  url: chunk.pageUrl,
                  last_edited_time: chunk.lastEditedTime,
                },
                expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
              },
              { onConflict: 'user_id,provider,source_id,chunk_index' },
            );
          if (!upsertError) chunksIndexed++;
        }
      }
      return { processed: chunksIndexed, found: pages.length };
    }
    case 'meeting-transcript-scan': {
      // Placeholder — scans Google Drive for meeting transcripts
      // Full implementation depends on Google Meet transcription API
      return { processed: 0, found: 0 };
    }

    // ── Briefing ──
    case 'daily-briefing-generate': {
      const { generateDailyBriefing } = await import('@/lib/ai/agents/briefing');
      const { executeIfTierOne } = await import('@/lib/actions/executor');
      const { AutonomyTier } = await import('@/lib/db/types');

      // Fetch user's timezone for correct date calculation
      const { data: userProfile } = await db
        .from('profiles')
        .select('timezone')
        .eq('id', userId)
        .single();
      const timezone = userProfile?.timezone as string | undefined;

      const briefing = await generateDailyBriefing(userId, timezone);

      // Auto-execute Tier 1 actions
      const { data: tierOneActions } = await db
        .from('pending_actions')
        .select('id')
        .eq('user_id', userId)
        .eq('autonomy_tier', AutonomyTier.SILENT)
        .eq('status', 'awaiting_confirmation');

      for (const action of (tierOneActions ?? []) as Array<{ id: string }>) {
        await executeIfTierOne(action.id);
      }

      return { processed: briefing.items.length, found: briefing.items.length };
    }

    // ── Operations ──
    case 'scheduled-am-sweep': {
      const { classifyTasks } = await import('@/lib/ai/agents/operations/am-sweep');
      const { dispatchSubagents } = await import('@/lib/ai/agents/operations/dispatch');
      const classification = await classifyTasks(userId);
      // Create an operation run record
      const { data: opRun } = await db
        .from('operation_runs')
        .insert({ user_id: userId, run_type: 'am_sweep', status: 'running' })
        .select('id')
        .single();
      const opRunId = opRun?.id ?? '';
      await dispatchSubagents(userId, opRunId, classification.green, classification.yellow);
      return { processed: classification.green.length + classification.yellow.length };
    }
    case 'overnight-email-triage': {
      const { triageEmails } = await import('@/lib/ai/agents/operations/email-triage');
      const { data: integration } = await db
        .from('user_integrations')
        .select('account_email')
        .eq('user_id', userId)
        .eq('provider', 'gmail')
        .eq('status', 'connected')
        .single();
      const { data: onboarding } = await db
        .from('onboarding_data')
        .select('vip_contacts, active_projects')
        .eq('user_id', userId)
        .single();
      const result = await triageEmails(
        userId,
        integration?.account_email ?? '',
        onboarding?.vip_contacts ?? [],
        onboarding?.active_projects ?? [],
      );
      return { processed: result.tasksCreated, found: result.emailsScanned };
    }
    case 'overnight-calendar-transit': {
      const { calculateCalendarTransit } = await import('@/lib/ai/agents/operations/calendar-transit');
      const { data: config } = await db
        .from('user_operations_config')
        .select('home_address, office_address')
        .eq('user_id', userId)
        .single();
      const { data: profile } = await db
        .from('profiles')
        .select('timezone')
        .eq('id', userId)
        .single();
      const result = await calculateCalendarTransit(
        userId,
        profile?.timezone ?? 'UTC',
        config?.home_address ?? '',
        config?.office_address ?? '',
      );
      return { processed: result.transitEventsCreated };
    }

    // ── Observer-first narrative ──
    case 'update-day-narrative': {
      const { buildDayNarrative } = await import('@/lib/desktop-observer/narrative-builder');
      await buildDayNarrative(userId);
      return { processed: 1 };
    }
    case 'summarise-recent-sessions': {
      const { sweepUnsummarisedSessions } = await import(
        '@/lib/desktop-observer/session-summariser'
      );
      const count = await sweepUnsummarisedSessions(userId);
      return { processed: count };
    }

    // ── Data Retention Cleanup ──
    case 'pii-retention-cleanup': {
      await db.rpc('cleanup_old_activity_sessions');
      return { processed: 1 };
    }

    // ── Memory ──
    case 'generate-daily-snapshot': {
      const { generateDailySnapshot } = await import('@/lib/ai/agents/memory-snapshot');
      const { data: profile } = await db
        .from('profiles')
        .select('timezone')
        .eq('id', userId)
        .single();
      const today = new Date().toLocaleDateString('en-CA', {
        timeZone: profile?.timezone ?? 'UTC',
      });
      await generateDailySnapshot(userId, today);
      return { processed: 1 };
    }
    case 'analyze-working-patterns': {
      const { analyzeWorkingPatterns } = await import('@/lib/ai/agents/pattern-analyzer');
      await analyzeWorkingPatterns(userId);
      return { processed: 1 };
    }

    // ── Reflections ──
    // Weekly: generates on Monday for the previous Mon–Sun week.
    // Monthly: generates on the 1st for the previous calendar month.
    case 'weekly-reflection': {
      const { generateReflection } = await import('@/lib/ai/agents/reflection');
      const { data: profile } = await db
        .from('profiles')
        .select('timezone')
        .eq('id', userId)
        .single();
      const tz = profile?.timezone ?? 'UTC';
      const localNow = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
      const dayOfWeek = localNow.getDay(); // 0=Sun, 1=Mon, ...

      // Only generate on Monday (day 1). Skip otherwise.
      if (dayOfWeek !== 1) {
        return { processed: 0 };
      }

      // Previous week: last Monday 00:00 → last Sunday 23:59
      const periodEnd = new Date(localNow);
      periodEnd.setDate(periodEnd.getDate() - 1); // Sunday
      periodEnd.setHours(23, 59, 59, 999);
      const periodStart = new Date(periodEnd);
      periodStart.setDate(periodStart.getDate() - 6); // Previous Monday
      periodStart.setHours(0, 0, 0, 0);

      await generateReflection(userId, 'weekly', periodStart, periodEnd);
      return { processed: 1 };
    }
    case 'monthly-reflection': {
      const { generateReflection } = await import('@/lib/ai/agents/reflection');
      const { data: profile } = await db
        .from('profiles')
        .select('timezone')
        .eq('id', userId)
        .single();
      const tz = profile?.timezone ?? 'UTC';
      const localNow = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
      const dayOfMonth = localNow.getDate();

      // Only generate on the 1st of the month. Skip otherwise.
      if (dayOfMonth !== 1) {
        return { processed: 0 };
      }

      // Previous calendar month: 1st → last day
      const year = localNow.getFullYear();
      const month = localNow.getMonth(); // current month (0-indexed)
      const periodStart = new Date(year, month - 1, 1, 0, 0, 0, 0); // 1st of prev month
      const periodEnd = new Date(year, month, 0, 23, 59, 59, 999); // last day of prev month

      await generateReflection(userId, 'monthly', periodStart, periodEnd);
      return { processed: 1 };
    }

    // ── User-defined scheduled routines ──
    case 'run-user-routines': {
      // Get user's timezone for correct local-time comparison
      const { data: userProfile } = await db
        .from('profiles')
        .select('timezone')
        .eq('id', userId)
        .single();
      const timezone = (userProfile?.timezone as string) || 'UTC';

      // Current local time in user's timezone
      const nowInTz = new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
      const currentTotalMinutes = nowInTz.getHours() * 60 + nowInTz.getMinutes();
      const currentDay = nowInTz.getDay(); // 0=Sun
      const currentDate = nowInTz.getDate();
      const todayStr = nowInTz.toLocaleDateString('en-CA'); // YYYY-MM-DD

      // Fetch all enabled routines for this user
      const { data: routines } = await db
        .from('user_routines')
        .select('*')
        .eq('user_id', userId)
        .eq('is_enabled', true);

      if (!routines || routines.length === 0) return { processed: 0 };

      // Window matches the poll interval — routine fires if current time is
      // within [scheduled_time, scheduled_time + 5 min)
      const WINDOW_MINUTES = 5;
      let fired = 0;

      for (const routine of routines as Array<Record<string, unknown>>) {
        // Parse scheduled_time (stored as "HH:MM" or "HH:MM:SS")
        const [schedHour, schedMin] = String(routine.scheduled_time ?? '08:00')
          .split(':')
          .map(Number);
        const scheduledTotalMinutes = schedHour * 60 + schedMin;

        const inTimeWindow =
          currentTotalMinutes >= scheduledTotalMinutes &&
          currentTotalMinutes < scheduledTotalMinutes + WINDOW_MINUTES;

        if (!inTimeWindow) continue;

        // Determine whether the routine should fire based on frequency + last_run_at
        const lastRunAt = routine.last_run_at
          ? new Date(routine.last_run_at as string)
          : null;
        const lastRunInTz = lastRunAt
          ? new Date(lastRunAt.toLocaleString('en-US', { timeZone: timezone }))
          : null;

        let shouldRun = false;
        if (routine.frequency === 'daily') {
          const lastRunDateStr = lastRunInTz?.toLocaleDateString('en-CA') ?? null;
          shouldRun = lastRunDateStr !== todayStr;
        } else if (routine.frequency === 'weekly') {
          const scheduledDay = routine.scheduled_day as number | null;
          if (scheduledDay !== null && currentDay === scheduledDay) {
            const weekStart = new Date(nowInTz);
            weekStart.setDate(nowInTz.getDate() - nowInTz.getDay());
            weekStart.setHours(0, 0, 0, 0);
            shouldRun = !lastRunAt || lastRunAt < weekStart;
          }
        } else if (routine.frequency === 'monthly') {
          const scheduledDay = routine.scheduled_day as number | null;
          if (scheduledDay !== null && currentDate === scheduledDay) {
            const monthStart = new Date(nowInTz.getFullYear(), nowInTz.getMonth(), 1, 0, 0, 0, 0);
            shouldRun = !lastRunAt || lastRunAt < monthStart;
          }
        }

        if (!shouldRun) continue;

        try {
          if (routine.routine_type === 'daily_briefing') {
            // Reuse the full briefing generation pipeline
            const { generateDailyBriefing } = await import('@/lib/ai/agents/briefing');
            const { executeIfTierOne } = await import('@/lib/actions/executor');
            const { AutonomyTier } = await import('@/lib/db/types');

            await generateDailyBriefing(userId, timezone);

            const { data: tierOneActions } = await db
              .from('pending_actions')
              .select('id')
              .eq('user_id', userId)
              .eq('autonomy_tier', AutonomyTier.SILENT)
              .eq('status', 'awaiting_confirmation');
            for (const action of (tierOneActions ?? []) as Array<{ id: string }>) {
              await executeIfTierOne(action.id);
            }

            // Stamp last_run_at on the routine row
            await db
              .from('user_routines')
              .update({
                last_run_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', routine.id as string)
              .eq('user_id', userId);

            // Also save a routine_output with desktop observer narrative for Today page card
            try {
              const { generateRoutineOutput } = await import('@/lib/ai/agents/routine-generator');
              const { createRoutineOutput } = await import('@/lib/db/queries/routines');

              const { data: narrativeRow } = await db
                .from('day_narratives')
                .select('narrative_text')
                .eq('user_id', userId)
                .eq('narrative_date', todayStr)
                .single();

              const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
              const { data: sessions } = await db
                .from('activity_sessions')
                .select('app_name, duration_seconds, summary')
                .eq('user_id', userId)
                .gte('started_at', since)
                .order('started_at', { ascending: false })
                .limit(20);

              const routineResult = await generateRoutineOutput(
                routine as unknown as Parameters<typeof generateRoutineOutput>[0],
                {
                  todayDate: todayStr,
                  todayNarrative: (narrativeRow as { narrative_text?: string } | null)?.narrative_text ?? null,
                  recentSessions: (
                    (sessions ?? []) as Array<{ app_name: string; duration_seconds: number | null; summary: string | null }>
                  ).map((s) => ({
                    app: s.app_name,
                    duration_minutes: Math.round((s.duration_seconds ?? 0) / 60),
                    summary: s.summary ?? undefined,
                  })),
                },
              );

              await createRoutineOutput(db, userId, routine.id as string, routineResult.content, {
                generation_model: routineResult.model,
                generation_ms: routineResult.durationMs,
              });
            } catch {
              // Non-fatal — don't block fired++
            }
          } else {
            // Generic routine types — generate content and save as routine_output
            const { generateRoutineOutput } = await import('@/lib/ai/agents/routine-generator');
            const { createRoutineOutput } = await import('@/lib/db/queries/routines');

            const { data: narrativeRow } = await db
              .from('day_narratives')
              .select('narrative_text')
              .eq('user_id', userId)
              .eq('narrative_date', todayStr)
              .single();

            const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: sessions } = await db
              .from('activity_sessions')
              .select('app_name, duration_seconds, summary')
              .eq('user_id', userId)
              .gte('started_at', since)
              .order('started_at', { ascending: false })
              .limit(20);

            const result = await generateRoutineOutput(
              routine as unknown as Parameters<typeof generateRoutineOutput>[0],
              {
                todayDate: todayStr,
                todayNarrative:
                  (narrativeRow as { narrative_text?: string } | null)?.narrative_text ?? null,
                recentSessions: (
                  (sessions ?? []) as Array<{
                    app_name: string;
                    duration_seconds: number | null;
                    summary: string | null;
                  }>
                ).map((s) => ({
                  app: s.app_name,
                  duration_minutes: Math.round((s.duration_seconds ?? 0) / 60),
                  summary: s.summary ?? undefined,
                })),
              },
            );

            // createRoutineOutput also stamps last_run_at on the routine row
            await createRoutineOutput(db, userId, routine.id as string, result.content, {
              generation_model: result.model,
              generation_ms: result.durationMs,
            });
          }

          fired++;
        } catch {
          // Non-fatal — log and continue to the next routine
        }
      }

      return { processed: fired, found: (routines as unknown[]).length };
    }

    default:
      return { processed: 0, error: `Unknown job: ${jobId}` };
  }
}

/**
 * Gmail post-processing: engagement tracking and archive candidate creation.
 * Gmail post-processing for engagement and archive candidates.
 */
async function runGmailPostProcessing(db: DB, userId: string): Promise<void> {
  try {
    const { upsertEngagementSignal, getEngagementSignal, isColdStartComplete } =
      await import('@/lib/db/queries/engagement');
    const { classifyAction } = await import('@/lib/actions/classifier');
    const { executeIfTierOne } = await import('@/lib/actions/executor');
    const { AutonomyTier } = await import('@/lib/db/types');

    const { data: inboxItems } = await db
      .from('inbox_items')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'gmail')
      .eq('is_archived', false);

    if (!inboxItems || inboxItems.length === 0) return;

    // Track engagement signals
    for (const item of inboxItems) {
      const domain = item.from_email?.split('@')[1]?.toLowerCase();
      if (!domain) continue;
      if (item.is_read) {
        await upsertEngagementSignal(db, userId, domain, 'open');
      }
      if (item.thread_id) {
        const { data: threadItems } = await db
          .from('inbox_items')
          .select('id')
          .eq('user_id', userId)
          .eq('thread_id', item.thread_id)
          .neq('id', item.id)
          .limit(1);
        if (threadItems && threadItems.length > 0) {
          await upsertEngagementSignal(db, userId, domain, 'reply');
        }
      }
    }

    // Evaluate for auto-archiving
    const coldStartComplete = await isColdStartComplete(db, userId);
    const { data: settingsData } = await db
      .from('user_autonomy_settings')
      .select('*')
      .eq('user_id', userId);
    const userSettings = settingsData ?? [];
    const { data: vipContacts } = await db
      .from('contacts')
      .select('email')
      .eq('user_id', userId)
      .eq('is_vip', true);
    const vipEmails = new Set(
      (vipContacts ?? []).map((c: { email: string }) => c.email.toLowerCase()),
    );

    const COMMITMENT_KEYWORDS = [
      'please', 'could you', 'can you', 'by', 'deadline', 'due', 'confirm',
      'review', 'approve', 'reply', 'respond', 'action required', 'urgent',
    ];

    for (const item of inboxItems) {
      if (item.is_read || item.is_starred) continue;
      const domain = item.from_email?.split('@')[1]?.toLowerCase();
      if (!domain) continue;

      const engagement = await getEngagementSignal(db, userId, domain);
      const engagementScore = engagement?.engagement_score ?? 0.5;
      const summaryText = item.ai_summary ?? item.subject ?? '';
      const hasCommitment = COMMITMENT_KEYWORDS.some((kw) => summaryText.toLowerCase().includes(kw));
      const senderIsVip = vipEmails.has(item.from_email.toLowerCase());

      let hasActiveThread = false;
      if (item.thread_id) {
        const { data: active } = await db
          .from('inbox_items')
          .select('id')
          .eq('user_id', userId)
          .eq('thread_id', item.thread_id)
          .eq('is_archived', false)
          .eq('is_read', true)
          .neq('id', item.id)
          .limit(1);
        hasActiveThread = (active ?? []).length > 0;
      }

      const archiveSettings = userSettings.find(
        (s: { action_type: string }) => s.action_type === 'archive_email',
      );
      const whitelistDomains = archiveSettings?.whitelist_domains ?? [];
      const senderIsWhitelisted = whitelistDomains.includes(domain);

      const payload = {
        inbox_item_id: item.id,
        sender_domain: domain,
        engagement_score: engagementScore,
        cold_start_complete: coldStartComplete,
        has_commitment: hasCommitment,
        sender_is_vip: senderIsVip,
        has_active_thread: hasActiveThread,
        sender_is_whitelisted: senderIsWhitelisted,
      };

      const tier = classifyAction({ action_type: 'archive_email', payload }, userSettings);
      if (tier === AutonomyTier.FULL) continue;

      const { data: pendingAction } = await db
        .from('pending_actions')
        .insert({
          user_id: userId,
          action_type: 'archive_email',
          status: 'awaiting_confirmation',
          payload,
          source_context: {
            from: item.from_email,
            subject: item.subject,
            summary: item.ai_summary,
          },
          autonomy_tier: tier,
        })
        .select('id')
        .single();

      if (pendingAction && tier === AutonomyTier.SILENT) {
        await executeIfTierOne(pendingAction.id);
      }
    }
  } catch {
    // Non-fatal — engagement processing failure shouldn't block the scan
  }
}
