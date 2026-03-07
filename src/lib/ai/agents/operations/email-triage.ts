import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { sanitiseContent } from '@/lib/ai/safety/sanitise';
import { EMAIL_TRIAGE_PROMPT, EMAIL_TRIAGE_USER_TEMPLATE } from '@/lib/ai/prompts/operations/email-triage';
import {
  getGmailClient,
  parseGmailMessage,
  type ParsedGmailMessage,
} from '@/lib/integrations/gmail';
import { upsertInboxItem } from '@/lib/db/queries/inbox';
import { createServiceClient } from '@/lib/db/client';
import { createOperationRun, completeOperationRun, failOperationRun } from '@/lib/db/queries/operations';

const anthropic = new Anthropic();

interface TriageResult {
  is_actionable: boolean;
  task_title: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  estimated_duration_minutes: number;
  tags: string[];
  reason: string;
}

export interface EmailTriageRunResult {
  emailsScanned: number;
  tasksCreated: number;
  skippedNewsletter: number;
  skippedNotification: number;
  skippedCCOnly: number;
  skippedDuplicate: number;
  skippedNotActionable: number;
  errors: Array<{ messageId: string; error: string }>;
}

function isNewsletter(message: ParsedGmailMessage): boolean {
  // Check for common newsletter indicators
  const from = message.from.toLowerCase();
  const subject = message.subject.toLowerCase();
  return (
    from.includes('noreply') ||
    from.includes('no-reply') ||
    from.includes('newsletter') ||
    from.includes('notifications@') ||
    from.includes('digest@') ||
    from.includes('updates@') ||
    from.includes('mailer-daemon') ||
    from.includes('postmaster') ||
    subject.includes('unsubscribe') ||
    message.body.toLowerCase().includes('unsubscribe')
  );
}

function isNotification(message: ParsedGmailMessage): boolean {
  const from = message.from.toLowerCase();
  return (
    from.includes('noreply') ||
    from.includes('no-reply') ||
    from.includes('notifications@') ||
    from.includes('notify@') ||
    from.includes('alert@')
  );
}

function isCCOnly(message: ParsedGmailMessage, userEmail: string): boolean {
  const to = message.to.toLowerCase();
  return !to.includes(userEmail.toLowerCase());
}

function parseTriageResult(text: string): TriageResult {
  try {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      is_actionable: false,
      task_title: '',
      priority: 'P4',
      estimated_duration_minutes: 0,
      tags: [],
      reason: 'Failed to parse AI response',
    };
  }
}

function priorityToUrgency(priority: string): number {
  switch (priority) {
    case 'P1': return 9;
    case 'P2': return 7;
    case 'P3': return 5;
    case 'P4': return 3;
    default: return 5;
  }
}

export async function triageEmails(
  userId: string,
  userEmail: string,
  vipEmails: string[],
  activeProjects: string[]
): Promise<EmailTriageRunResult> {
  const supabase = createServiceClient();
  const run = await createOperationRun(supabase, userId, 'overnight_email');

  const result: EmailTriageRunResult = {
    emailsScanned: 0,
    tasksCreated: 0,
    skippedNewsletter: 0,
    skippedNotification: 0,
    skippedCCOnly: 0,
    skippedDuplicate: 0,
    skippedNotActionable: 0,
    errors: [],
  };

  try {
    // Fetch yesterday's emails
    const gmail = await getGmailClient(userId);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const afterEpoch = Math.floor(yesterday.getTime() / 1000);
    const beforeEpoch = Math.floor(today.getTime() / 1000);

    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 100,
      q: `after:${afterEpoch} before:${beforeEpoch} in:inbox`,
    });

    const messageIds = response.data.messages ?? [];
    result.emailsScanned = messageIds.length;

    for (const { id: messageId } of messageIds) {
      if (!messageId) continue;

      try {
        const raw = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'full',
        });

        const message = parseGmailMessage(raw.data);

        // Filter: newsletters
        if (isNewsletter(message)) {
          result.skippedNewsletter++;
          continue;
        }

        // Filter: notifications
        if (isNotification(message) && !vipEmails.includes(message.from)) {
          result.skippedNotification++;
          continue;
        }

        // Filter: CC-only
        if (isCCOnly(message, userEmail)) {
          result.skippedCCOnly++;
          continue;
        }

        // Check for existing inbox item (dedup by external_id)
        const { data: existing } = await supabase
          .from('inbox_items')
          .select('id, task_title')
          .eq('user_id', userId)
          .eq('provider', 'gmail')
          .eq('external_id', message.id)
          .limit(1);

        if (existing && existing.length > 0) {
          // Already exists — check if it already has task metadata
          const item = existing[0] as Record<string, unknown>;
          if (item.task_title) {
            result.skippedDuplicate++;
            continue;
          }
        }

        // Sanitise content before AI
        const sanitised = sanitiseContent(message.body.slice(0, 3000), 'gmail');

        // Call Haiku for triage
        const aiResponse = await anthropic.messages.create({
          model: AI_MODELS.FAST,
          max_tokens: 500,
          system: EMAIL_TRIAGE_PROMPT,
          messages: [
            {
              role: 'user',
              content: EMAIL_TRIAGE_USER_TEMPLATE({
                from: message.from,
                fromName: message.fromName,
                to: message.to,
                subject: message.subject,
                body: sanitised.content,
                isCC: isCCOnly(message, userEmail),
                vipEmails,
                activeProjects,
              }),
            },
          ],
        });

        const responseText = aiResponse.content.find((b) => b.type === 'text')?.text ?? '';
        const triage = parseTriageResult(responseText);

        if (!triage.is_actionable) {
          result.skippedNotActionable++;
          continue;
        }

        // Upsert to inbox_items with operations metadata
        await upsertInboxItem(supabase, {
          user_id: userId,
          provider: 'gmail',
          external_id: message.id,
          thread_id: message.threadId,
          from_email: message.from,
          from_name: message.fromName,
          subject: message.subject,
          ai_summary: triage.reason,
          urgency_score: priorityToUrgency(triage.priority),
          needs_reply: triage.tags.includes('call') || triage.task_title.toLowerCase().startsWith('reply'),
          received_at: message.date || new Date().toISOString(),
        });

        // Update with operations fields
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('inbox_items')
          .update({
            task_title: triage.task_title,
            estimated_duration_minutes: triage.estimated_duration_minutes,
            task_tags: triage.tags,
            operation_context: {
              priority: triage.priority,
              reason: triage.reason,
              source: 'overnight_email_triage',
            },
          })
          .eq('user_id', userId)
          .eq('provider', 'gmail')
          .eq('external_id', message.id);

        result.tasksCreated++;
      } catch (err) {
        result.errors.push({
          messageId: messageId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    await completeOperationRun(supabase, run.id, result as unknown as Record<string, unknown>);
    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await failOperationRun(supabase, run.id, errorMessage);
    throw err;
  }
}
