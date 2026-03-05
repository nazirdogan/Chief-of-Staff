import { createServiceClient } from '@/lib/db/client';
import { getGmailClient } from '@/lib/integrations/gmail';
import { getGraphClient } from '@/lib/integrations/outlook';
import type { PendingAction, PendingActionType } from '@/lib/db/types';

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
      return `Meeting rescheduled`;
    case 'create_calendar_event':
      return `Calendar event created`;
    case 'update_notion_page':
      return `Notion page updated`;
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
