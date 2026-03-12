/**
 * Proactive Agent — orchestrates all donna-initiated background behaviours.
 *
 * Three functions, each runs as a scheduled background job:
 *   - checkVIPUnansweredEmails  (every 60 min)
 *   - checkTaskDeadlines        (every 30 min)
 *   - generateAutoMeetingPrep   (every 10 min)
 *
 * Each function creates donna-initiated chat_conversations + chat_messages
 * so the sidebar can surface them under "Donna's Drafts".
 *
 * Deduplication: each function checks for an existing conversation with the
 * same trigger_source before creating a new one.
 */

import { createServiceClient } from '@/lib/db/client';

// ── eslint-disable for the service-client any cast (project convention) ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

function getDb(): DB {
  return createServiceClient() as DB;
}

// ── VIP Unanswered Emails ─────────────────────────────────────────────────

/**
 * Check for VIP emails that have been unanswered for > 4 hours.
 * Creates a donna-initiated conversation per unanswered item (max 5 per run).
 */
export async function checkVIPUnansweredEmails(
  userId: string,
): Promise<{ draftsCreated: number }> {
  const { isNotificationEnabled } = await import('@/lib/db/queries/notification-preferences');
  const _notifClient = createServiceClient();
  if (!(await isNotificationEnabled(_notifClient, userId, 'email_drafts'))) {
    return { draftsCreated: 0 };
  }

  const db = getDb();

  // 1. Find VIP contacts
  const { data: vips } = await db
    .from('contacts')
    .select('id, email, name')
    .eq('user_id', userId)
    .eq('is_vip', true);

  if (!vips?.length) return { draftsCreated: 0 };

  const vipEmails = (vips as Array<{ email: string }>).map((v) =>
    v.email.toLowerCase(),
  );

  // 2. Find unhandled inbox items from VIPs, older than 4 hours
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

  const { data: unanswered } = await db
    .from('inbox_items')
    .select('id, from_email, from_name, subject, ai_summary, received_at')
    .eq('user_id', userId)
    .eq('reply_drafted', false)
    .in('from_email', vipEmails)
    .lt('received_at', fourHoursAgo)
    .order('received_at', { ascending: true })
    .limit(5);

  if (!unanswered?.length) return { draftsCreated: 0 };

  let draftsCreated = 0;

  for (const item of unanswered as Array<{
    id: string;
    from_email: string | null;
    from_name: string | null;
    subject: string | null;
    ai_summary: string | null;
    received_at: string;
  }>) {
    // 3. Dedup: skip if we already opened a donna chat for this inbox item
    const triggerSource = `vip_reply:${item.id}`;
    const { data: existing } = await db
      .from('chat_conversations')
      .select('id')
      .eq('user_id', userId)
      .eq('is_donna_initiated', true)
      .eq('trigger_source', triggerSource)
      .single();

    if (existing) continue;

    // 4. Match back to VIP contact for display name
    const vip = (vips as Array<{ email: string; name: string | null }>).find(
      (v) => v.email.toLowerCase() === item.from_email?.toLowerCase(),
    );

    const displayName = vip?.name || item.from_name || item.from_email || 'Unknown';
    const subjectPart = item.subject ? ` about "${item.subject}"` : '';
    const title = `Reply to ${displayName}: ${item.subject || '(no subject)'}`;

    // 5. Create conversation
    const { data: conv } = await db
      .from('chat_conversations')
      .insert({
        user_id: userId,
        title,
        is_donna_initiated: true,
        trigger_source: triggerSource,
      })
      .select('id')
      .single();

    if (!conv) continue;

    // 6. Insert opening message from Donna
    const timeAgo = formatTimeAgo(new Date(item.received_at));
    let message = `${displayName} sent you an email${subjectPart} ${timeAgo} and you haven't replied yet.`;

    if (item.ai_summary) {
      message += `\n\n**Summary:** ${item.ai_summary}`;
    }

    message += '\n\nWould you like me to draft a reply?';

    await db
      .from('chat_messages')
      .insert({
        conversation_id: conv.id,
        role: 'assistant',
        content: message,
      });

    draftsCreated++;
  }

  return { draftsCreated };
}

// ── Task Deadline Nudger ──────────────────────────────────────────────────

/**
 * Check for open tasks with deadlines in the next 24 hours.
 * Creates one donna-initiated conversation grouping all approaching deadlines.
 * Suppressed if we already nudged within the last 12 hours.
 */
export async function checkTaskDeadlines(
  userId: string,
): Promise<{ nudgesCreated: number }> {
  const { isNotificationEnabled } = await import('@/lib/db/queries/notification-preferences');
  const _notifClient = createServiceClient();
  if (!(await isNotificationEnabled(_notifClient, userId, 'proactive_suggestions'))) {
    return { nudgesCreated: 0 };
  }

  const db = getDb();

  const now = new Date();
  const twentyFourHoursFromNow = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  // 1. Find open tasks with deadlines in the next 24 hours
  const { data: urgentTasks } = await db
    .from('tasks')
    .select(
      'id, task_text, implied_deadline, recipient_name, recipient_email, direction',
    )
    .eq('user_id', userId)
    .eq('status', 'open')
    .not('implied_deadline', 'is', null)
    .lte('implied_deadline', twentyFourHoursFromNow)
    .gte('implied_deadline', now.toISOString())
    .order('implied_deadline', { ascending: true });

  if (!urgentTasks?.length) return { nudgesCreated: 0 };

  // 2. Suppress if we already nudged in the last 12 hours
  const twelveHoursAgo = new Date(
    now.getTime() - 12 * 60 * 60 * 1000,
  ).toISOString();

  const { data: recentNudge } = await db
    .from('chat_conversations')
    .select('id')
    .eq('user_id', userId)
    .eq('is_donna_initiated', true)
    .like('trigger_source', 'task_deadline:%')
    .gte('created_at', twelveHoursAgo)
    .limit(1);

  if (recentNudge?.length) return { nudgesCreated: 0 };

  // 3. Build one conversation for all deadline nudges
  const tasks = urgentTasks as Array<{
    id: string;
    task_text: string | null;
    implied_deadline: string;
    recipient_name: string | null;
    recipient_email: string | null;
    direction: string | null;
  }>;

  const firstTaskSnippet = tasks[0].task_text?.substring(0, 50) ?? 'Task';
  const title =
    tasks.length === 1
      ? `Deadline approaching: ${firstTaskSnippet}`
      : `${tasks.length} tasks due in the next 24 hours`;

  const { data: conv } = await db
    .from('chat_conversations')
    .insert({
      user_id: userId,
      title,
      is_donna_initiated: true,
      trigger_source: `task_deadline:${now.toISOString()}`,
    })
    .select('id')
    .single();

  if (!conv) return { nudgesCreated: 0 };

  // 4. Build message body listing each task
  const taskLines = tasks
    .map((t) => {
      const deadline = new Date(t.implied_deadline);
      const timeLeft = formatTimeUntil(deadline);
      const counterparty =
        t.direction === 'inbound'
          ? `from ${t.recipient_name || t.recipient_email || 'unknown'}`
          : `to ${t.recipient_name || t.recipient_email || 'unknown'}`;
      return `- **${t.task_text ?? 'Untitled task'}** (${counterparty}) — due in ${timeLeft}`;
    })
    .join('\n');

  const message = `You have ${tasks.length} task${tasks.length > 1 ? 's' : ''} due in the next 24 hours:\n\n${taskLines}\n\nWould you like help with any of these?`;

  await db
    .from('chat_messages')
    .insert({
      conversation_id: conv.id,
      role: 'assistant',
      content: message,
    });

  return { nudgesCreated: 1 };
}

// ── Auto Meeting Prep ─────────────────────────────────────────────────────

/**
 * Detect meetings starting within 30 minutes and open a donna-initiated
 * conversation with the generated prep brief.
 *
 * Reads calendar events from context_chunks (already ingested by the calendar
 * scan job) — no direct calendar API call needed here.
 */
export async function generateAutoMeetingPrep(
  userId: string,
): Promise<{ prepsGenerated: number }> {
  const { isNotificationEnabled } = await import('@/lib/db/queries/notification-preferences');
  const _notifClient = createServiceClient();
  if (!(await isNotificationEnabled(_notifClient, userId, 'meeting_prep'))) {
    return { prepsGenerated: 0 };
  }

  const db = getDb();

  const now = new Date();
  const thirtyMinFromNow = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

  // 1. Find calendar events starting in the next 30 minutes
  const { data: upcomingEvents } = await db
    .from('context_chunks')
    .select('id, title, content_summary, occurred_at, people, source_ref, metadata')
    .eq('user_id', userId)
    .in('provider', ['google_calendar', 'outlook_calendar'])
    .eq('chunk_type', 'calendar_event')
    .gte('occurred_at', now.toISOString())
    .lte('occurred_at', thirtyMinFromNow)
    .order('occurred_at', { ascending: true })
    .limit(3);

  if (!upcomingEvents?.length) return { prepsGenerated: 0 };

  let prepsGenerated = 0;

  for (const event of upcomingEvents as Array<{
    id: string;
    title: string | null;
    content_summary: string | null;
    occurred_at: string;
    people: string[] | null;
    source_ref: string | null;
    metadata: Record<string, unknown> | null;
  }>) {
    const triggerSource = `meeting_prep:${event.source_ref ?? event.id}`;

    // 2. Dedup: skip if we already created prep for this event
    const { data: existing } = await db
      .from('chat_conversations')
      .select('id')
      .eq('user_id', userId)
      .eq('is_donna_initiated', true)
      .eq('trigger_source', triggerSource)
      .single();

    if (existing) continue;

    // 3. Generate prep via the meeting-prep agent
    try {
      const { generateMeetingPrep } = await import('@/lib/ai/agents/meeting-prep');
      const prep = await generateMeetingPrep(userId, {
        id: event.source_ref ?? event.id,
        summary: event.title ?? 'Upcoming Meeting',
        description: (event.metadata?.description as string | undefined) ?? '',
        start: event.occurred_at,
        end:
          (event.metadata?.end as string | undefined) ??
          new Date(new Date(event.occurred_at).getTime() + 60 * 60 * 1000).toISOString(),
        attendees: (event.people ?? []).map((p) => ({ email: p, name: p })),
        organizer: {
          email: (event.people ?? [])[0] ?? '',
          name: (event.people ?? [])[0] ?? '',
        },
      });

      // 4. Create donna-initiated conversation
      const eventTitle = event.title ?? 'Upcoming Meeting';
      const startsIn = formatTimeUntil(new Date(event.occurred_at));

      const { data: conv } = await db
        .from('chat_conversations')
        .insert({
          user_id: userId,
          title: `Meeting prep: ${eventTitle}`,
          is_donna_initiated: true,
          trigger_source: triggerSource,
        })
        .select('id')
        .single();

      if (!conv) continue;

      // 5. Build opening message
      const attendeeList = (event.people ?? []).slice(0, 5).join(', ');
      let message = `Your meeting **${eventTitle}** starts in ${startsIn}.`;
      if (attendeeList) message += ` With: ${attendeeList}.`;

      if (prep.summary) {
        message += `\n\n${prep.summary}`;
      }

      if (prep.suggested_talking_points?.length) {
        const points = prep.suggested_talking_points.slice(0, 3).join('\n- ');
        message += `\n\n**Talking points:**\n- ${points}`;
      }

      await db
        .from('chat_messages')
        .insert({
          conversation_id: conv.id,
          role: 'assistant',
          content: message,
        });

      prepsGenerated++;
    } catch (err) {
      // Non-fatal — if prep generation fails, skip this event
      console.error('[Proactive] Meeting prep generation failed:', err);
    }
  }

  return { prepsGenerated };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function formatTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'less than an hour ago';
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

function formatTimeUntil(date: Date): string {
  const diffMs = date.getTime() - Date.now();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''}`;
}
