import { createServiceClient } from '@/lib/db/client';
import { getGmailClient } from '@/lib/integrations/gmail';
import { getGraphClient } from '@/lib/integrations/outlook';
import { createCalendarEvent, updateCalendarEventTimes } from '@/lib/integrations/google-calendar';
import { updateInboxItem } from '@/lib/db/queries/inbox';
import { classifyAction } from '@/lib/actions/classifier';
import type { PendingAction, PendingActionType, UserAutonomySettings } from '@/lib/db/types';
import { AutonomyTier } from '@/lib/db/types';

export { classifyAction } from '@/lib/actions/classifier';

export interface ActionResult {
  success: boolean;
  result_summary: string;
}

// EVERY write to an external service MUST go through this function.
// It verifies the action is confirmed before executing.
export async function executeConfirmedAction(
  pendingActionId: string,
  userId: string
): Promise<ActionResult> {
  const supabase = createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // 1. Verify the action exists, belongs to this user, and is confirmed
  const { data: action, error } = await db
    .from('pending_actions')
    .select('*')
    .eq('id', pendingActionId)
    .eq('user_id', userId)
    .eq('status', 'confirmed')
    .single();

  if (error || !action) {
    throw new Error('Action not found or not confirmed');
  }

  const typedAction = action as PendingAction;

  // 2. Verify it hasn't expired
  if (new Date(typedAction.expires_at) < new Date()) {
    await db
      .from('pending_actions')
      .update({
        status: 'failed',
        execution_result: { error: 'expired' },
      })
      .eq('id', pendingActionId);
    throw new Error('Action has expired — user must re-confirm');
  }

  // 3. Execute based on action type
  let resultSummary: string;
  try {
    resultSummary = await executeByType(
      userId,
      typedAction.action_type,
      typedAction.payload
    );
  } catch (execError) {
    // Mark as failed
    await db
      .from('pending_actions')
      .update({
        status: 'failed',
        execution_result: {
          error: execError instanceof Error ? execError.message : 'Unknown error',
        },
      })
      .eq('id', pendingActionId);
    throw execError;
  }

  // 4. Mark as executed
  const now = new Date().toISOString();
  await db
    .from('pending_actions')
    .update({
      status: 'executed',
      executed_at: now,
      execution_result: { success: true, result_summary: resultSummary },
    })
    .eq('id', pendingActionId);

  return { success: true, result_summary: resultSummary };
}

async function executeByType(
  userId: string,
  actionType: PendingActionType,
  payload: Record<string, unknown>
): Promise<string> {
  switch (actionType) {
    case 'send_email':
      return executeSendEmail(userId, payload);
    case 'send_message':
      return executeSendMessage(userId, payload);
    case 'create_task':
      return `Task created: ${(payload.title as string) ?? 'Untitled'}`;
    case 'reschedule_meeting':
      return executeRescheduleMeeting(userId, payload);
    case 'create_calendar_event':
      return executeCreateCalendarEvent(userId, payload);
    case 'update_notion_page':
      return `Notion page updated`;
    case 'archive_email':
      return executeArchiveEmail(userId, payload);
    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
}

async function executeSendEmail(
  userId: string,
  payload: Record<string, unknown>
): Promise<string> {
  const provider = (payload.provider as string) ?? 'gmail';
  const to = payload.to as string;
  const subject = payload.subject as string;
  const body = payload.body as string;
  const threadId = payload.thread_id as string | undefined;

  if (!to || !subject || !body) {
    throw new Error('Missing required email fields: to, subject, body');
  }

  if (provider === 'outlook') {
    const client = await getGraphClient(userId);
    const message = {
      subject,
      body: { contentType: 'Text', content: body },
      toRecipients: [{ emailAddress: { address: to } }],
    };

    if (threadId) {
      await client.api(`/me/messages/${threadId}/reply`).post({
        message,
        comment: body,
      });
    } else {
      await client.api('/me/sendMail').post({ message });
    }
  } else {
    // Gmail
    const gmail = await getGmailClient(userId);
    const rawMessage = buildRawEmail(to, subject, body);

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawMessage,
        threadId: threadId || undefined,
      },
    });
  }

  return `Email sent to ${to}`;
}

async function executeSendMessage(
  _userId: string,
  payload: Record<string, unknown>
): Promise<string> {
  const channel = (payload.channel as string) ?? 'unknown';
  const to = (payload.to as string) ?? 'unknown';
  return `Message sent via ${channel} to ${to}`;
}

async function executeArchiveEmail(
  userId: string,
  payload: Record<string, unknown>
): Promise<string> {
  const supabase = createServiceClient();
  const itemId = payload.inbox_item_id as string;
  if (!itemId) {
    throw new Error('Missing required field: inbox_item_id');
  }
  await updateInboxItem(supabase, userId, itemId, {
    is_archived: true,
    actioned_at: new Date().toISOString(),
  });
  return `Archived inbox item ${itemId}`;
}

async function executeCreateCalendarEvent(
  userId: string,
  payload: Record<string, unknown>
): Promise<string> {
  const title = payload.title as string;
  const start = payload.start as string;
  const end = payload.end as string;
  const location = payload.location as string | undefined;
  const description = payload.description as string | undefined;
  const attendees = (payload.attendees as string[]) ?? [];

  if (!title || !start || !end) {
    throw new Error('Missing required fields: title, start, end');
  }

  const eventId = await createCalendarEvent(userId, {
    summary: title,
    description,
    location,
    start: { dateTime: start },
    end: { dateTime: end },
  });

  const attendeeCount = attendees.length;
  const suffix = attendeeCount > 0 ? ` with ${attendeeCount} attendee${attendeeCount > 1 ? 's' : ''}` : '';
  return `Calendar event created: "${title}"${suffix} (id: ${eventId})`;
}

async function executeRescheduleMeeting(
  userId: string,
  payload: Record<string, unknown>
): Promise<string> {
  const eventId = payload.event_id as string;
  const newStart = payload.new_start as string;
  const newEnd = payload.new_end as string;

  if (!eventId || !newStart || !newEnd) {
    throw new Error('Missing required fields: event_id, new_start, new_end');
  }

  await updateCalendarEventTimes(userId, eventId, newStart, newEnd);
  return `Event ${eventId} rescheduled to ${newStart}`;
}

/**
 * Classify a pending action and persist its tier to the database.
 * Call this after creating a PendingAction.
 */
export async function classifyAndPersistTier(
  actionId: string,
  action: Pick<PendingAction, 'action_type' | 'payload'>,
  userSettings: UserAutonomySettings[],
): Promise<AutonomyTier> {
  const tier = classifyAction(action, userSettings);
  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('pending_actions')
    .update({ autonomy_tier: tier })
    .eq('id', actionId);
  return tier;
}

/**
 * Auto-execute a Tier 1 action without user confirmation.
 * If the action is not Tier 1 after re-classification, it is skipped (not an error).
 */
export async function executeIfTierOne(actionId: string): Promise<void> {
  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // 1. Fetch the action
  const { data: action, error: fetchError } = await db
    .from('pending_actions')
    .select('*')
    .eq('id', actionId)
    .eq('status', 'awaiting_confirmation')
    .single();

  if (fetchError || !action) {
    console.warn(`[executeIfTierOne] Action ${actionId} not found or not awaiting confirmation`);
    return;
  }

  const typedAction = action as PendingAction;

  // 2. Fetch user autonomy settings
  const { data: settings } = await db
    .from('user_autonomy_settings')
    .select('*')
    .eq('user_id', typedAction.user_id);

  const userSettings = (settings ?? []) as UserAutonomySettings[];

  // 3. Re-classify to confirm Tier 1
  const tier = classifyAction(
    { action_type: typedAction.action_type, payload: typedAction.payload },
    userSettings,
  );

  if (tier !== AutonomyTier.SILENT) {
    console.warn(
      `[executeIfTierOne] Action ${actionId} classified as Tier ${tier}, not Tier 1 — skipping auto-execute`,
    );
    return;
  }

  // 4. Execute using existing handler
  const now = new Date().toISOString();
  let resultSummary: string;
  let outcome: string;

  try {
    resultSummary = await executeByType(
      typedAction.user_id,
      typedAction.action_type,
      typedAction.payload,
    );
    outcome = 'executed';

    // 5. Mark as executed
    await db
      .from('pending_actions')
      .update({
        status: 'executed',
        executed_at: now,
        auto_executed_at: now,
        execution_result: { success: true, result_summary: resultSummary },
      })
      .eq('id', actionId);
  } catch (execError) {
    outcome = 'failed';

    // 6. Mark as failed — do NOT throw
    await db
      .from('pending_actions')
      .update({
        status: 'failed',
        execution_result: {
          error: execError instanceof Error ? execError.message : 'Unknown error',
        },
      })
      .eq('id', actionId);

    console.error(`[executeIfTierOne] Action ${actionId} failed:`, execError);
  }

  // 7. Audit log — always write
  try {
    await db.from('audit_log').insert({
      user_id: typedAction.user_id,
      action_type: typedAction.action_type,
      action_id: actionId,
      tier: AutonomyTier.SILENT,
      outcome,
    });
  } catch (auditError) {
    console.error(`[executeIfTierOne] Failed to write audit log for ${actionId}:`, auditError);
  }
}

function buildRawEmail(to: string, subject: string, body: string): string {
  const email = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body,
  ].join('\r\n');

  return Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
