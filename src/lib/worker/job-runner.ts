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
    'meeting-prep-auto': 'google_calendar',
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
      const { getIntegrationsByProvider } = await import('@/lib/db/queries/integrations');
      const gmailIntegrations = await getIntegrationsByProvider(db, userId, 'gmail');

      let totalProcessed = 0;
      let totalFound = 0;

      if (gmailIntegrations.length === 0) {
        // Fallback for legacy single-account path
        const result = await ingestGmailMessages(userId);
        totalProcessed = result.processed;
        totalFound = result.found;
      } else {
        // Iterate over all connected Gmail accounts
        for (const integration of gmailIntegrations) {
          try {
            const result = await ingestGmailMessages(userId, integration.id);
            totalProcessed += result.processed;
            totalFound += result.found;
          } catch {
            // Non-fatal — continue scanning other accounts
          }
        }
      }

      // Run engagement/archiving post-processing
      await runGmailPostProcessing(db, userId);
      return { processed: totalProcessed, found: totalFound };
    }
    case 'gmail-watch-renew': {
      const { setupGmailWatch } = await import('@/lib/integrations/gmail');
      const { saveGmailHistoryId, getIntegrationsByProvider } = await import('@/lib/db/queries/integrations');
      const gmailIntegrations = await getIntegrationsByProvider(db, userId, 'gmail');

      let renewed = 0;
      if (gmailIntegrations.length === 0) {
        // Fallback for legacy single-account path
        const { historyId, expiration } = await setupGmailWatch(userId);
        await saveGmailHistoryId(db, userId, historyId, expiration);
        renewed = 1;
      } else {
        for (const integration of gmailIntegrations) {
          try {
            const { historyId, expiration } = await setupGmailWatch(userId, integration.id);
            await saveGmailHistoryId(db, integration.id, historyId, expiration);
            renewed++;
          } catch {
            // Non-fatal — continue renewing other accounts
          }
        }
      }

      return { processed: renewed };
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


    // ── Meeting Intelligence ──
    case 'meeting-prep-auto': {
      const { getTodaysParsedEvents } = await import('@/lib/integrations/google-calendar');
      const { generateMeetingPrep } = await import('@/lib/ai/agents/meeting-prep');
      const { upsertMeetingPrep, getUnpreppedUpcomingEvents } = await import(
        '@/lib/db/queries/meeting-preps'
      );
      const { AI_MODELS } = await import('@/lib/ai/models');

      const events = await getTodaysParsedEvents(userId);
      const now = Date.now();
      const ninetyMinutesFromNow = now + 90 * 60 * 1000;

      // Find events starting within the next 90 minutes
      const upcomingEvents = events.filter((e) => {
        const startMs = new Date(e.start).getTime();
        return startMs > now && startMs <= ninetyMinutesFromNow && !e.isAllDay;
      });

      if (upcomingEvents.length === 0) return { processed: 0, found: 0 };

      const eventIds = upcomingEvents.map((e) => e.id);
      const unpreppedIds = await getUnpreppedUpcomingEvents(db, userId, eventIds);

      let prepped = 0;
      for (const event of upcomingEvents) {
        if (!unpreppedIds.includes(event.id)) continue;

        try {
          const startTime = Date.now();
          const prep = await generateMeetingPrep(userId, {
            id: event.id,
            summary: event.summary,
            description: event.description ?? '',
            start: event.start,
            end: event.end,
            attendees: event.attendees.map((a) => ({
              email: a.email,
              name: a.name ?? a.email,
            })),
            organizer: {
              email: event.attendees[0]?.email ?? '',
              name: event.attendees[0]?.name ?? '',
            },
          });

          await upsertMeetingPrep(db, {
            user_id: userId,
            event_id: event.id,
            event_title: event.summary,
            event_start: event.start,
            event_end: event.end,
            attendees: event.attendees.map((a) => ({
              email: a.email,
              name: a.name ?? a.email,
            })),
            summary: prep.summary,
            attendee_context: prep.attendee_context,
            open_items: prep.open_items,
            suggested_talking_points: prep.suggested_talking_points,
            watch_out_for: prep.watch_out_for,
            generation_model: AI_MODELS.STANDARD,
            generation_ms: Date.now() - startTime,
            source: 'auto',
            notification_sent: false,
            notification_sent_at: null,
            post_meeting_scan_done: false,
            post_meeting_scan_at: null,
          });

          prepped++;
        } catch {
          // Non-fatal — continue with other events
        }
      }

      return { processed: prepped, found: upcomingEvents.length };
    }

    case 'meeting-prep-notify': {
      const { getMeetingsNeedingNotification, markNotificationSent } = await import(
        '@/lib/db/queries/meeting-preps'
      );

      const now = new Date();
      const thirtyMinutesFromNow = new Date(now.getTime() + 35 * 60 * 1000);
      const twentyFiveMinutesFromNow = new Date(now.getTime() + 25 * 60 * 1000);

      // Meetings starting in 25-35 minutes (covers the ~30min window with 5min poll interval)
      const meetings = await getMeetingsNeedingNotification(
        db,
        userId,
        thirtyMinutesFromNow.toISOString(),
        twentyFiveMinutesFromNow.toISOString(),
      );

      let notified = 0;
      for (const meeting of meetings) {
        try {
          const startTime = new Date(meeting.event_start);
          const timeStr = startTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
          const attendeeNames = meeting.attendees
            .map((a: { name: string }) => a.name.split(' ')[0])
            .slice(0, 3)
            .join(', ');
          const suffix = meeting.attendees.length > 3
            ? ` +${meeting.attendees.length - 3}`
            : '';

          await db.from('pending_actions').insert({
            user_id: userId,
            action_type: 'view_meeting_prep',
            status: 'awaiting_confirmation',
            payload: {
              event_id: meeting.event_id,
              event_title: meeting.event_title,
              event_start: meeting.event_start,
              meeting_prep_id: meeting.id,
            },
            source_context: {
              description: `Your ${timeStr} with ${attendeeNames}${suffix} is in 30 minutes. Prep ready — tap to view.`,
              event_title: meeting.event_title,
              attendees: meeting.attendees,
            },
            autonomy_tier: 2, // ONE_TAP
            expires_at: meeting.event_start, // Expire when meeting starts
          });

          await markNotificationSent(db, userId, meeting.event_id);
          notified++;
        } catch {
          // Non-fatal
        }
      }

      return { processed: notified, found: meetings.length };
    }

    case 'post-meeting-tasks': {
      const { getMeetingsNeedingPostScan, markPostMeetingScanDone } = await import(
        '@/lib/db/queries/meeting-preps'
      );
      const { extractTasksFromGmail } = await import('@/lib/ai/agents/task');

      const now = new Date();
      // Meetings that ended 30min-2h ago (give time for follow-up emails to arrive)
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);

      const meetings = await getMeetingsNeedingPostScan(
        db,
        userId,
        twoHoursAgo.toISOString(),
        thirtyMinAgo.toISOString(),
      );

      if (meetings.length === 0) return { processed: 0, found: 0 };

      let extracted = 0;
      for (const meeting of meetings) {
        try {
          // Collect attendee emails for filtering
          const attendeeEmails = meeting.attendees.map(
            (a: { email: string }) => a.email.toLowerCase(),
          );
          const meetingEndTime = new Date(meeting.event_end);

          // Find recent emails from meeting attendees sent after meeting ended
          const { data: recentMessages } = await db
            .from('inbox_items')
            .select('external_id, provider, from_email')
            .eq('user_id', userId)
            .gte('received_at', meetingEndTime.toISOString())
            .in('provider', ['gmail', 'outlook']);

          const postMeetingMessages = (
            recentMessages ?? []
          ).filter((m: { from_email: string }) =>
            attendeeEmails.includes(m.from_email?.toLowerCase()),
          );

          if (postMeetingMessages.length > 0) {
            // Extract tasks from post-meeting messages
            const gmailMessageIds = postMeetingMessages
              .filter((m: { provider: string }) => m.provider === 'gmail')
              .map((m: { external_id: string }) => m.external_id);

            if (gmailMessageIds.length > 0) {
              const result = await extractTasksFromGmail(userId, gmailMessageIds);
              extracted += result.extracted;
            }
          }

          // Also scan SENT messages for tasks the user made during/after the meeting
          try {
            const { getGmailClient } = await import('@/lib/integrations/gmail');
            const gmail = await getGmailClient(userId);
            const response = await gmail.users.messages.list({
              userId: 'me',
              maxResults: 10,
              labelIds: ['SENT'],
              q: `after:${Math.floor(meetingEndTime.getTime() / 1000)}`,
            });

            const sentIds = (response.data.messages ?? [])
              .map((m: { id?: string | null }) => m.id)
              .filter((id: string | null | undefined): id is string => !!id);

            if (sentIds.length > 0) {
              const result = await extractTasksFromGmail(userId, sentIds);
              extracted += result.extracted;
            }
          } catch {
            // Gmail not connected — skip sent scan
          }

          await markPostMeetingScanDone(db, userId, meeting.event_id);
        } catch {
          // Non-fatal — continue with other meetings
        }
      }

      return { processed: extracted, found: meetings.length };
    }

    // ── Intelligence ──
    case 'task-check': {
      const {
        extractTasksFromGmail,
        extractTasksFromSlack,
        extractTasksFromCalendar,
        checkTaskResolutions,
        getUpcomingDeadlineTasks,
      } = await import('@/lib/ai/agents/task');
      const { listTasks } = await import('@/lib/db/queries/tasks');
      const { AutonomyTier } = await import('@/lib/db/types');

      const { data: integrations } = await db
        .from('user_integrations')
        .select('provider')
        .eq('user_id', userId)
        .eq('status', 'connected');
      const connected = new Set((integrations ?? []).map((i: { provider: string }) => i.provider));

      let extracted = 0;
      let total = 0;
      const sentMessagesForResolution: import('@/lib/ai/agents/task').SentMessage[] = [];

      // 1. Gmail task extraction
      if (connected.has('gmail')) {
        try {
          const { getGmailClient, fetchMessageForProcessing, parseGmailMessage } = await import('@/lib/integrations/gmail');
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
          const result = await extractTasksFromGmail(userId, messageIds);
          extracted += result.extracted;
          total += result.total;

          // Collect sent messages for resolution checking
          for (const msgId of messageIds.slice(0, 10)) {
            try {
              const fullMsg = await fetchMessageForProcessing(userId, msgId);
              const parsed = parseGmailMessage(fullMsg);
              if (parsed.labelIds.includes('SENT')) {
                sentMessagesForResolution.push({
                  id: parsed.id,
                  threadId: parsed.threadId,
                  provider: 'gmail',
                  to: parsed.to,
                  toName: '',
                  body: parsed.body || parsed.snippet,
                  date: parsed.date,
                });
              }
            } catch { /* skip individual message */ }
          }
        } catch { /* gmail not connected */ }
      }

      // 2. Slack task extraction
      if (connected.has('slack')) {
        try {
          const result = await extractTasksFromSlack(userId);
          extracted += result.extracted;
          total += result.total;
        } catch { /* slack not connected */ }
      }

      // 3. Calendar task extraction (event descriptions)
      if (connected.has('google_calendar')) {
        try {
          const result = await extractTasksFromCalendar(userId);
          extracted += result.extracted;
          total += result.total;
        } catch { /* calendar not connected */ }
      }

      // 4. Auto-resolution: check if recent sent messages resolve open tasks
      if (sentMessagesForResolution.length > 0) {
        try {
          const resolutionResult = await checkTaskResolutions(userId, sentMessagesForResolution);
          if (resolutionResult.resolved > 0) {
            console.log(`[task-check] Auto-resolved ${resolutionResult.resolved} tasks for ${userId}`);
          }
        } catch { /* resolution check is non-fatal */ }
      }

      // 5. Proactive alerts: create Tier 2 pending_actions for tasks due within 24h
      try {
        const openTasks = await listTasks(db, userId, { status: 'open' });
        const upcoming = getUpcomingDeadlineTasks(openTasks as Parameters<typeof getUpcomingDeadlineTasks>[0]);

        for (const task of upcoming) {
          // Check if we already have a pending reminder for this task
          const { data: existingReminder } = await db
            .from('pending_actions')
            .select('id')
            .eq('user_id', userId)
            .eq('action_type', 'task_reminder')
            .eq('status', 'awaiting_confirmation')
            .contains('payload', { task_id: task.id })
            .limit(1);

          if (existingReminder && existingReminder.length > 0) continue;

          await db.from('pending_actions').insert({
            user_id: userId,
            action_type: 'task_reminder',
            status: 'awaiting_confirmation',
            payload: {
              task_id: task.id,
              task_text: task.task_text,
              recipient: task.recipient_name ?? task.recipient_email,
              deadline: task.implied_deadline,
            },
            source_context: task.source_ref,
            autonomy_tier: AutonomyTier.ONE_TAP,
          });
        }
      } catch { /* proactive alerts are non-fatal */ }

      return { processed: extracted, found: total };
    }
    case 'relationship-check': {
      const { getAllContactsForScoring } = await import('@/lib/db/queries/contacts');
      const { computeRelationshipUpdates } = await import('@/lib/ai/agents/relationship');
      const contacts = await getAllContactsForScoring(db, userId);
      const updates = await computeRelationshipUpdates(contacts);
      // Apply updates (including score history for trajectory tracking)
      for (const update of updates) {
        await db.from('contacts').update({
          relationship_score: update.newScore,
          is_cold: update.isCold,
          score_history: update.scoreHistory,
          ...(update.isCold ? { cold_flagged_at: update.coldFlaggedAt } : {}),
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

    case 'scheduled-briefing-delivery': {
      // Clock-tick job: checks if it's time to deliver the user's daily briefing
      // based on profiles.briefing_time (stored as HH:MM:SS in local time)
      const { data: userProfile } = await db
        .from('profiles')
        .select('briefing_time, timezone')
        .eq('id', userId)
        .single();

      if (!userProfile) return { processed: 0 };

      const timezone = (userProfile.timezone as string) || 'UTC';
      const briefingTime = (userProfile.briefing_time as string) || '07:30:00';
      const [schedHour, schedMin] = briefingTime.split(':').map(Number);

      // Current local time in user's timezone
      const nowInTz = new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
      const currentTotalMinutes = nowInTz.getHours() * 60 + nowInTz.getMinutes();
      const scheduledTotalMinutes = schedHour * 60 + schedMin;

      // 5-minute window matching the poll interval
      const WINDOW_MINUTES = 5;
      const inTimeWindow =
        currentTotalMinutes >= scheduledTotalMinutes &&
        currentTotalMinutes < scheduledTotalMinutes + WINDOW_MINUTES;

      if (!inTimeWindow) return { processed: 0 };

      // Check if we already generated a briefing today
      const todayStr = nowInTz.toLocaleDateString('en-CA'); // YYYY-MM-DD
      const { data: existingBriefing } = await db
        .from('briefings')
        .select('id')
        .eq('user_id', userId)
        .eq('briefing_date', todayStr)
        .limit(1);

      if (existingBriefing && existingBriefing.length > 0) {
        return { processed: 0 }; // Already generated today
      }

      // Generate and deliver the briefing
      const { generateDailyBriefing } = await import('@/lib/ai/agents/briefing');
      const { executeIfTierOne } = await import('@/lib/actions/executor');
      const { AutonomyTier } = await import('@/lib/db/types');

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
      const { data: gmailRows } = await db
        .from('user_integrations')
        .select('account_email')
        .eq('user_id', userId)
        .eq('provider', 'gmail')
        .eq('status', 'connected');
      const { data: onboarding } = await db
        .from('onboarding_data')
        .select('vip_contacts, active_projects')
        .eq('user_id', userId)
        .single();

      let totalTasks = 0;
      let totalScanned = 0;
      const accounts = (gmailRows ?? []) as Array<{ account_email: string | null }>;
      for (const account of accounts.length > 0 ? accounts : [{ account_email: null }]) {
        try {
          const result = await triageEmails(
            userId,
            account.account_email ?? '',
            onboarding?.vip_contacts ?? [],
            onboarding?.active_projects ?? [],
          );
          totalTasks += result.tasksCreated;
          totalScanned += result.emailsScanned;
        } catch {
          // Non-fatal — continue with other accounts
        }
      }
      return { processed: totalTasks, found: totalScanned };
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

    // ── Proactive Intelligence ──
    case 'proactive-vip-reply-check': {
      const { checkVIPUnansweredEmails } = await import('@/lib/ai/agents/proactive');
      const result = await checkVIPUnansweredEmails(userId);
      return { processed: result.draftsCreated };
    }
    case 'proactive-task-deadline': {
      const { checkTaskDeadlines } = await import('@/lib/ai/agents/proactive');
      const result = await checkTaskDeadlines(userId);
      return { processed: result.nudgesCreated };
    }
    case 'proactive-meeting-prep': {
      const { generateAutoMeetingPrep } = await import('@/lib/ai/agents/proactive');
      const result = await generateAutoMeetingPrep(userId);
      return { processed: result.prepsGenerated };
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
