import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/client';
import { withAuth } from '@/lib/middleware/withAuth';
import type { AuthenticatedRequest } from '@/lib/middleware/withAuth';

/**
 * POST /api/backfill/trigger
 *
 * Creates a backfill job and runs it in-process.
 * The cold-start backfill runs as a background async task — the API returns immediately.
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const userId = req.user.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any;

  // Check if a backfill job already exists for this user
  const { data: existing } = await db
    .from('backfill_jobs')
    .select('id, status')
    .eq('user_id', userId)
    .in('status', ['pending', 'running'])
    .single();

  if (existing) {
    return NextResponse.json({
      jobId: existing.id,
      status: existing.status,
      message: 'Backfill already in progress',
    });
  }

  // Create the backfill job record
  const { data: job, error } = await db
    .from('backfill_jobs')
    .insert({
      user_id: userId,
      status: 'pending',
      current_phase: 'email_backfill',
      phase_status: 'pending',
      progress_pct: 0,
    })
    .select('id')
    .single();

  if (error || !job) {
    return NextResponse.json(
      { error: 'Failed to create backfill job' },
      { status: 500 },
    );
  }

  // Run the backfill in the background (fire-and-forget)
  runBackfillInBackground(userId, job.id).catch((err) => {
    console.error('[Backfill] Background execution failed:', err);
  });

  return NextResponse.json({ jobId: job.id, status: 'pending' });
});

/**
 * Runs the cold-start backfill phases in-process.
 */
async function runBackfillInBackground(userId: string, jobId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any;

  await db.from('backfill_jobs').update({ status: 'running' }).eq('id', jobId);

  const PHASES = [
    'email_backfill',
    'contact_graph',
    'task_extraction',
    'calendar_backfill',
    'desktop_processing',
    'first_briefing',
  ] as const;

  type Phase = typeof PHASES[number];

  async function updatePhase(
    phase: Phase,
    status: 'running' | 'completed' | 'failed',
    details?: Record<string, unknown>,
  ) {
    const phaseIndex = PHASES.indexOf(phase);
    const progress = status === 'completed'
      ? Math.round(((phaseIndex + 1) / PHASES.length) * 100)
      : Math.round(((phaseIndex + 0.5) / PHASES.length) * 100);

    await db
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

  // Phase 1: Email Backfill
  try {
    await updatePhase('email_backfill', 'running');
    const { data: integrations } = await db
      .from('user_integrations')
      .select('provider, status')
      .eq('user_id', userId)
      .eq('status', 'connected');
    const connected = new Set((integrations ?? []).map((i: { provider: string }) => i.provider));
    let emailsIngested = 0;
    if (connected.has('gmail')) {
      try {
        const { ingestGmailMessages } = await import('@/lib/ai/agents/ingestion');
        const result = await ingestGmailMessages(userId);
        emailsIngested += result.processed;
      } catch { /* partial failure */ }
    }
    await updatePhase('email_backfill', 'completed', { emails_ingested: emailsIngested });
  } catch {
    await updatePhase('email_backfill', 'failed');
  }

  // Phase 2: Contact Graph
  try {
    await updatePhase('contact_graph', 'running');
    const { data: inboxItems } = await db
      .from('inbox_items')
      .select('from_email, from_name')
      .eq('user_id', userId);
    const contactMap = new Map<string, { name: string; count: number }>();
    for (const item of (inboxItems ?? []) as Array<{ from_email: string; from_name: string | null }>) {
      const email = item.from_email?.toLowerCase();
      if (!email) continue;
      const existing = contactMap.get(email);
      if (existing) { existing.count++; } else { contactMap.set(email, { name: item.from_name ?? '', count: 1 }); }
    }
    let contactsUpserted = 0;
    for (const [email, data] of contactMap) {
      const { data: existing } = await db.from('contacts').select('id').eq('user_id', userId).eq('email', email).single();
      if (existing) {
        await db.from('contacts').update({ interaction_count_30d: data.count, name: data.name || undefined, last_interaction_at: new Date().toISOString() }).eq('id', existing.id);
      } else {
        await db.from('contacts').insert({ user_id: userId, email, name: data.name || null, interaction_count_30d: data.count, relationship_score: Math.min(data.count * 10, 100), is_vip: false, is_cold: false, open_tasks_count: 0, last_interaction_at: new Date().toISOString() });
      }
      contactsUpserted++;
    }
    await updatePhase('contact_graph', 'completed', { contacts_upserted: contactsUpserted });
  } catch {
    await updatePhase('contact_graph', 'failed');
  }

  // Phase 3: Task Extraction
  try {
    await updatePhase('task_extraction', 'running');
    const { data: integrations } = await db.from('user_integrations').select('provider').eq('user_id', userId).eq('status', 'connected');
    const connected = new Set((integrations ?? []).map((i: { provider: string }) => i.provider));
    let tasksExtracted = 0;
    let messagesScanned = 0;
    if (connected.has('gmail')) {
      try {
        const { fetchMessagesByDateRange, fetchMessageForProcessing, parseGmailMessage } = await import('@/lib/integrations/gmail');
        const { extractTasks } = await import('@/lib/ai/agents/task');
        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sentRefs = await fetchMessagesByDateRange(userId, { after: thirtyDaysAgo, labelIds: ['SENT'], maxTotal: 200 });
        const sentMessages = [];
        for (let i = 0; i < sentRefs.length; i += 10) {
          const batch = sentRefs.slice(i, i + 10);
          const fetched = await Promise.all(batch.map(async (ref) => {
            try {
              const full = await fetchMessageForProcessing(userId, ref.id);
              const parsed = parseGmailMessage(full);
              if (!parsed.labelIds.includes('SENT')) return null;
              return { id: parsed.id, threadId: parsed.threadId, provider: 'gmail', to: parsed.to, toName: '', body: parsed.body || parsed.snippet, date: parsed.date };
            } catch { return null; }
          }));
          sentMessages.push(...fetched.filter(Boolean));
        }
        if (sentMessages.length > 0) {
          const result = await extractTasks(userId, sentMessages as Parameters<typeof extractTasks>[1]);
          tasksExtracted = result.extracted;
          messagesScanned = result.total;
        }
      } catch { /* partial failure */ }
    }
    await updatePhase('task_extraction', 'completed', { tasks_extracted: tasksExtracted, messages_scanned: messagesScanned });
  } catch {
    await updatePhase('task_extraction', 'failed');
  }

  // Phase 4: Calendar Backfill
  try {
    await updatePhase('calendar_backfill', 'running');
    let eventsLoaded = 0;
    try {
      const { getEventsForDateRange } = await import('@/lib/integrations/google-calendar');
      const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const fourteenDaysAhead = new Date(); fourteenDaysAhead.setDate(fourteenDaysAhead.getDate() + 14);
      const events = await getEventsForDateRange(userId, sevenDaysAgo, fourteenDaysAhead);
      eventsLoaded += events.length;
    } catch { /* not connected */ }
    try {
      const { getTodaysOutlookEvents } = await import('@/lib/integrations/outlook');
      const events = await getTodaysOutlookEvents(userId);
      eventsLoaded += events.length;
    } catch { /* not connected */ }
    await updatePhase('calendar_backfill', 'completed', { events_loaded: eventsLoaded });
  } catch {
    await updatePhase('calendar_backfill', 'failed');
  }

  // Phase 5: Desktop Processing
  try {
    await updatePhase('desktop_processing', 'running');
    const { count } = await db.from('context_chunks').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('source', 'desktop_observer');
    await updatePhase('desktop_processing', 'completed', { chunks_found: count ?? 0 });
  } catch {
    await updatePhase('desktop_processing', 'failed');
  }

  // Phase 6: First Briefing
  try {
    await updatePhase('first_briefing', 'running');
    const { generateDailyBriefing } = await import('@/lib/ai/agents/briefing');
    const briefing = await generateDailyBriefing(userId);
    await updatePhase('first_briefing', 'completed', { briefing_id: briefing.id, item_count: briefing.items.length });
  } catch {
    await updatePhase('first_briefing', 'failed');
  }

  // Ensure job is marked completed even if last phase failed
  const { data: finalJob } = await db.from('backfill_jobs').select('status').eq('id', jobId).single();
  if (finalJob && finalJob.status !== 'completed' && finalJob.status !== 'failed') {
    await db.from('backfill_jobs').update({ status: 'completed', completed_at: new Date().toISOString(), progress_pct: 100 }).eq('id', jobId);
  }
}
