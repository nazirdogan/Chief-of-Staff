import { task, logger } from '@trigger.dev/sdk/v3';
import { createServiceClient } from '@/lib/db/client';
import { ingestGmailMessages, ingestOutlookMessages } from '@/lib/ai/agents/ingestion';
import { extractCommitments } from '@/lib/ai/agents/commitment';
import { generateDailyBriefing } from '@/lib/ai/agents/briefing';
import {
  fetchMessagesByDateRange,
  fetchMessageForProcessing,
  parseGmailMessage,
} from '@/lib/integrations/gmail';
import type { SentMessage } from '@/lib/ai/agents/commitment';

type BackfillPhase =
  | 'email_backfill'
  | 'contact_graph'
  | 'commitment_extraction'
  | 'calendar_backfill'
  | 'desktop_processing'
  | 'first_briefing';

const PHASES: BackfillPhase[] = [
  'email_backfill',
  'contact_graph',
  'commitment_extraction',
  'calendar_backfill',
  'desktop_processing',
  'first_briefing',
];

async function updatePhase(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  jobId: string,
  phase: BackfillPhase,
  status: 'running' | 'completed' | 'failed',
  details?: Record<string, unknown>,
) {
  const phaseIndex = PHASES.indexOf(phase);
  const progress = status === 'completed'
    ? Math.round(((phaseIndex + 1) / PHASES.length) * 100)
    : Math.round(((phaseIndex + 0.5) / PHASES.length) * 100);

  await supabase
    .from('backfill_jobs')
    .update({
      current_phase: phase,
      phase_status: status,
      progress_pct: progress,
      phase_details: details ?? null,
      ...(status === 'completed' && phaseIndex === PHASES.length - 1
        ? { status: 'completed', completed_at: new Date().toISOString() }
        : {}),
      ...(status === 'failed'
        ? { status: 'failed', completed_at: new Date().toISOString() }
        : {}),
    })
    .eq('id', jobId);
}

export const coldStartBackfill = task({
  id: 'cold-start-backfill',
  maxDuration: 600, // 10 minutes
  run: async (payload: { userId: string; jobId: string }) => {
    const { userId, jobId } = payload;
    const supabase = createServiceClient();

    logger.info('Starting cold-start backfill', { userId, jobId });

    // Mark job as running
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    await db.from('backfill_jobs').update({ status: 'running' }).eq('id', jobId);

    // ── Phase 1: Email Backfill (30 days inbox + sent) ──
    try {
      await updatePhase(db, jobId, 'email_backfill', 'running');
      logger.info('Phase 1: Email backfill starting', { userId });

      // Check which integrations are connected
      const { data: integrations } = await db
        .from('user_integrations')
        .select('provider, status')
        .eq('user_id', userId)
        .eq('status', 'connected');

      const connected = new Set(
        (integrations ?? []).map((i: { provider: string }) => i.provider),
      );

      let emailsIngested = 0;

      // Gmail inbox backfill
      if (connected.has('gmail')) {
        try {
          const result = await ingestGmailMessages(userId);
          emailsIngested += result.processed;
          logger.info('Gmail inbox ingested', result);
        } catch (err) {
          logger.warn('Gmail ingestion partial failure', {
            error: err instanceof Error ? err.message : 'unknown',
          });
        }
      }

      // Outlook inbox backfill
      if (connected.has('outlook')) {
        try {
          const result = await ingestOutlookMessages(userId);
          emailsIngested += result.processed;
          logger.info('Outlook inbox ingested', result);
        } catch (err) {
          logger.warn('Outlook ingestion partial failure', {
            error: err instanceof Error ? err.message : 'unknown',
          });
        }
      }

      await updatePhase(db, jobId, 'email_backfill', 'completed', {
        emails_ingested: emailsIngested,
      });
    } catch (err) {
      logger.error('Phase 1 failed', { error: err instanceof Error ? err.message : 'unknown' });
      await updatePhase(db, jobId, 'email_backfill', 'failed', {
        error: err instanceof Error ? err.message : 'unknown',
      });
      // Continue to next phase — partial data is better than nothing
    }

    // ── Phase 2: Contact Graph Construction ──
    try {
      await updatePhase(db, jobId, 'contact_graph', 'running');
      logger.info('Phase 2: Contact graph starting', { userId });

      // Build contact interaction counts from inbox items
      const { data: inboxItems } = await db
        .from('inbox_items')
        .select('from_email, from_name')
        .eq('user_id', userId);

      const contactMap = new Map<string, { name: string; count: number }>();
      for (const item of (inboxItems ?? []) as Array<{ from_email: string; from_name: string | null }>) {
        const email = item.from_email?.toLowerCase();
        if (!email) continue;
        const existing = contactMap.get(email);
        if (existing) {
          existing.count++;
        } else {
          contactMap.set(email, { name: item.from_name ?? '', count: 1 });
        }
      }

      let contactsUpserted = 0;
      for (const [email, data] of contactMap) {
        const { data: existing } = await db
          .from('contacts')
          .select('id, interaction_count_30d')
          .eq('user_id', userId)
          .eq('email', email)
          .single();

        if (existing) {
          await db
            .from('contacts')
            .update({
              interaction_count_30d: data.count,
              name: data.name || undefined,
              last_interaction_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await db.from('contacts').insert({
            user_id: userId,
            email,
            name: data.name || null,
            interaction_count_30d: data.count,
            relationship_score: Math.min(data.count * 10, 100),
            is_vip: false,
            is_cold: false,
            open_commitments_count: 0,
            last_interaction_at: new Date().toISOString(),
          });
        }
        contactsUpserted++;
      }

      await updatePhase(db, jobId, 'contact_graph', 'completed', {
        contacts_upserted: contactsUpserted,
      });
    } catch (err) {
      logger.error('Phase 2 failed', { error: err instanceof Error ? err.message : 'unknown' });
      await updatePhase(db, jobId, 'contact_graph', 'failed');
    }

    // ── Phase 3: Commitment Extraction (30 days of sent emails) ──
    try {
      await updatePhase(db, jobId, 'commitment_extraction', 'running');
      logger.info('Phase 3: Commitment extraction starting', { userId });

      const { data: integrations } = await db
        .from('user_integrations')
        .select('provider')
        .eq('user_id', userId)
        .eq('status', 'connected');

      const connected = new Set(
        (integrations ?? []).map((i: { provider: string }) => i.provider),
      );

      let commitmentResult = { extracted: 0, total: 0 };

      if (connected.has('gmail')) {
        try {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const sentRefs = await fetchMessagesByDateRange(userId, {
            after: thirtyDaysAgo,
            labelIds: ['SENT'],
            maxTotal: 200,
          });

          // Fetch and parse sent messages in batches
          const sentMessages: SentMessage[] = [];
          const BATCH_SIZE = 10;

          for (let i = 0; i < sentRefs.length; i += BATCH_SIZE) {
            const batch = sentRefs.slice(i, i + BATCH_SIZE);
            const fetched = await Promise.all(
              batch.map(async (ref) => {
                try {
                  const full = await fetchMessageForProcessing(userId, ref.id);
                  const parsed = parseGmailMessage(full);
                  if (!parsed.labelIds.includes('SENT')) return null;
                  return {
                    id: parsed.id,
                    threadId: parsed.threadId,
                    provider: 'gmail',
                    to: parsed.to,
                    toName: '',
                    body: parsed.body || parsed.snippet,
                    date: parsed.date,
                  } satisfies SentMessage;
                } catch {
                  return null;
                }
              }),
            );
            sentMessages.push(...fetched.filter((m): m is SentMessage => m !== null));
          }

          if (sentMessages.length > 0) {
            commitmentResult = await extractCommitments(userId, sentMessages);
          }
        } catch (err) {
          logger.warn('Gmail commitment extraction partial failure', {
            error: err instanceof Error ? err.message : 'unknown',
          });
        }
      }

      await updatePhase(db, jobId, 'commitment_extraction', 'completed', {
        commitments_extracted: commitmentResult.extracted,
        messages_scanned: commitmentResult.total,
      });
    } catch (err) {
      logger.error('Phase 3 failed', { error: err instanceof Error ? err.message : 'unknown' });
      await updatePhase(db, jobId, 'commitment_extraction', 'failed');
    }

    // ── Phase 4: Calendar Backfill ──
    try {
      await updatePhase(db, jobId, 'calendar_backfill', 'running');
      logger.info('Phase 4: Calendar backfill starting', { userId });

      let eventsLoaded = 0;

      // Google Calendar
      try {
        const { getEventsForDateRange } = await import('@/lib/integrations/google-calendar');
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const fourteenDaysAhead = new Date();
        fourteenDaysAhead.setDate(fourteenDaysAhead.getDate() + 14);

        const events = await getEventsForDateRange(
          userId,
          sevenDaysAgo,
          fourteenDaysAhead,
        );
        eventsLoaded += events.length;
        logger.info('Google Calendar events loaded', { count: events.length });
      } catch {
        logger.info('Google Calendar not connected or failed');
      }

      // Outlook Calendar
      try {
        const { getTodaysOutlookEvents } = await import('@/lib/integrations/outlook');
        const events = await getTodaysOutlookEvents(userId);
        eventsLoaded += events.length;
      } catch {
        logger.info('Outlook Calendar not connected or failed');
      }

      await updatePhase(db, jobId, 'calendar_backfill', 'completed', {
        events_loaded: eventsLoaded,
      });
    } catch (err) {
      logger.error('Phase 4 failed', { error: err instanceof Error ? err.message : 'unknown' });
      await updatePhase(db, jobId, 'calendar_backfill', 'failed');
    }

    // ── Phase 5: Desktop Observer Processing ──
    try {
      await updatePhase(db, jobId, 'desktop_processing', 'running');
      logger.info('Phase 5: Desktop observer processing starting', { userId });

      // Count existing desktop observer chunks from "Show Me Your World"
      const { count } = await db
        .from('context_chunks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('source', 'desktop_observer');

      await updatePhase(db, jobId, 'desktop_processing', 'completed', {
        chunks_found: count ?? 0,
      });
    } catch (err) {
      logger.error('Phase 5 failed', { error: err instanceof Error ? err.message : 'unknown' });
      await updatePhase(db, jobId, 'desktop_processing', 'failed');
    }

    // ── Phase 6: Generate First Briefing ──
    try {
      await updatePhase(db, jobId, 'first_briefing', 'running');
      logger.info('Phase 6: Generating first briefing', { userId });

      const briefing = await generateDailyBriefing(userId);

      await updatePhase(db, jobId, 'first_briefing', 'completed', {
        briefing_id: briefing.id,
        item_count: briefing.items.length,
      });

      logger.info('Cold-start backfill completed', {
        userId,
        briefingId: briefing.id,
        itemCount: briefing.items.length,
      });
    } catch (err) {
      logger.error('Phase 6 failed', { error: err instanceof Error ? err.message : 'unknown' });
      await updatePhase(db, jobId, 'first_briefing', 'failed', {
        error: err instanceof Error ? err.message : 'unknown',
      });
    }

    // Ensure the job is marked completed even if individual phases had partial failures
    const { data: finalJob } = await db
      .from('backfill_jobs')
      .select('status')
      .eq('id', jobId)
      .single();

    if (finalJob && finalJob.status !== 'completed' && finalJob.status !== 'failed') {
      await db.from('backfill_jobs').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        progress_pct: 100,
      }).eq('id', jobId);
      logger.info('Backfill marked as completed (all phases attempted)', { userId, jobId });
    }

    return { success: true, userId, jobId };
  },
});
