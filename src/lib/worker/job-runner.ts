/**
 * Job Runner — executes a single job for a single user.
 *
 * Each job's run function is the extracted body of the corresponding
 * Trigger.dev task. Imports are dynamic to avoid loading everything at startup.
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
    'outlook-scan': 'outlook',
    'calendar-scan': 'google_calendar',
    'slack-scan': 'slack',
    'teams-scan': 'microsoft_teams',
    'linkedin-scan': 'linkedin',
    'twitter-scan': 'twitter',
    'github-scan': 'github',
    'asana-scan': 'asana',
    'jira-scan': 'jira',
    'linear-scan': 'linear',
    'monday-scan': 'monday',
    'clickup-scan': 'clickup',
    'trello-scan': 'trello',
    'hubspot-scan': 'hubspot',
    'salesforce-scan': 'salesforce',
    'pipedrive-scan': 'pipedrive',
    'google-drive-scan': 'google_drive',
    'dropbox-scan': 'dropbox',
    'onedrive-scan': 'onedrive',
    'icloud-scan': 'apple_icloud_mail',
    'calendly-scan': 'calendly',
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
    case 'outlook-scan': {
      const { ingestOutlookMessages } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestOutlookMessages(userId);
      return { processed: result.processed, found: result.found };
    }
    case 'slack-scan': {
      const { ingestSlackDMs } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestSlackDMs(userId);
      return { processed: result.processed, found: result.found };
    }
    case 'teams-scan': {
      const { ingestTeamsMessages } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestTeamsMessages(userId);
      return { processed: result.processed, found: result.found };
    }
    case 'linkedin-scan': {
      const { ingestLinkedInMessages } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestLinkedInMessages(userId);
      return { processed: result.processed, found: result.found };
    }
    case 'twitter-scan': {
      const { ingestTwitterDMs } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestTwitterDMs(userId);
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
      try {
        const { getTodaysOutlookEvents } = await import('@/lib/integrations/outlook');
        const events = await getTodaysOutlookEvents(userId);
        eventsLoaded += events.length;
      } catch { /* not connected */ }
      return { processed: eventsLoaded, found: eventsLoaded };
    }

    // ── Task Management Scans ──
    case 'asana-scan': {
      const { ingestAsanaTasks } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestAsanaTasks(userId);
      return { processed: result.processed, found: result.found };
    }
    case 'jira-scan': {
      const { ingestJiraIssues } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestJiraIssues(userId);
      return { processed: result.processed, found: result.found };
    }
    case 'linear-scan': {
      const { ingestLinearIssues } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestLinearIssues(userId);
      return { processed: result.processed, found: result.found };
    }
    case 'monday-scan': {
      const { ingestMondayItems } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestMondayItems(userId);
      return { processed: result.processed, found: result.found };
    }
    case 'clickup-scan': {
      const { ingestClickUpTasks } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestClickUpTasks(userId);
      return { processed: result.processed, found: result.found };
    }
    case 'trello-scan': {
      const { ingestTrelloCards } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestTrelloCards(userId);
      return { processed: result.processed, found: result.found };
    }
    case 'github-scan': {
      const { ingestGitHubItems } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestGitHubItems(userId);
      return { processed: result.processed, found: result.found };
    }

    // ── CRM Scans ──
    case 'hubspot-scan': {
      const { ingestHubSpotItems } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestHubSpotItems(userId);
      return { processed: result.processed, found: result.found };
    }
    case 'salesforce-scan': {
      const { ingestSalesforceItems } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestSalesforceItems(userId);
      return { processed: result.processed, found: result.found };
    }
    case 'pipedrive-scan': {
      const { ingestPipedriveItems } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestPipedriveItems(userId);
      return { processed: result.processed, found: result.found };
    }

    // ── Cloud Storage ──
    case 'google-drive-scan': {
      const { ingestGoogleDriveDocuments } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestGoogleDriveDocuments(userId);
      return { processed: result.processed, found: result.found };
    }
    case 'dropbox-scan': {
      const { ingestDropboxDocuments } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestDropboxDocuments(userId);
      return { processed: result.processed, found: result.found };
    }
    case 'onedrive-scan': {
      const { ingestOneDriveDocuments } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestOneDriveDocuments(userId);
      return { processed: result.processed, found: result.found };
    }
    case 'icloud-scan': {
      const { ingestICloudMessages } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestICloudMessages(userId);
      return { processed: result.processed, found: result.found };
    }
    case 'calendly-scan': {
      const { ingestCalendlyBookings } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestCalendlyBookings(userId);
      return { processed: result.processed, found: result.found };
    }

    // ── Intelligence ──
    case 'commitment-check': {
      const { extractCommitmentsFromGmail, extractCommitmentsFromOutlook } = await import('@/lib/ai/agents/commitment');
      const { data: integrations } = await db
        .from('user_integrations')
        .select('provider')
        .eq('user_id', userId)
        .eq('status', 'connected')
        .in('provider', ['gmail', 'outlook']);
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
      if (connected.has('outlook')) {
        try {
          const result = await extractCommitmentsFromOutlook(userId);
          extracted += result.extracted;
          total += result.total;
        } catch { /* outlook not connected */ }
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

      const briefing = await generateDailyBriefing(userId);

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
    case 'weekly-reflection': {
      const { generateReflection } = await import('@/lib/ai/agents/reflection');
      const { data: profile } = await db
        .from('profiles')
        .select('timezone')
        .eq('id', userId)
        .single();
      const tz = profile?.timezone ?? 'UTC';
      const now = new Date();
      const periodEnd = new Date(now.toLocaleString('en-US', { timeZone: tz }));
      const periodStart = new Date(periodEnd);
      periodStart.setDate(periodStart.getDate() - 7);
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
      const now = new Date();
      const periodEnd = new Date(now.toLocaleString('en-US', { timeZone: tz }));
      const periodStart = new Date(periodEnd);
      periodStart.setMonth(periodStart.getMonth() - 1);
      await generateReflection(userId, 'monthly', periodStart, periodEnd);
      return { processed: 1 };
    }

    default:
      return { processed: 0, error: `Unknown job: ${jobId}` };
  }
}

/**
 * Gmail post-processing: engagement tracking and archive candidate creation.
 * Extracted from trigger/heartbeat/gmail-scan.ts.
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
