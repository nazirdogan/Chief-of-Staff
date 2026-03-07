import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { sanitiseContent } from '@/lib/ai/safety/sanitise';
import { EMAIL_DRAFTER_PROMPT } from '@/lib/ai/prompts/operations/subagent-prompts';
import { getGmailClient } from '@/lib/integrations/gmail';
import { createServiceClient } from '@/lib/db/client';
import { createSubagentRun, completeSubagentRun, failSubagentRun } from '@/lib/db/queries/operations';
import type { ClassifiedTask } from '../am-sweep';

const anthropic = new Anthropic();

export interface EmailDraftResult {
  taskId: string;
  subject: string;
  draftId: string;
  notes: string;
}

export async function runEmailDrafter(
  userId: string,
  operationRunId: string,
  tasks: ClassifiedTask[]
): Promise<EmailDraftResult[]> {
  const supabase = createServiceClient();
  const run = await createSubagentRun(supabase, {
    operation_run_id: operationRunId,
    user_id: userId,
    agent_type: 'email_drafter',
    task_ids: tasks.map((t) => t.task_id),
  });

  const results: EmailDraftResult[] = [];

  try {
    const gmail = await getGmailClient(userId);

    for (const task of tasks) {
      try {
        const context = task.context_package?.specific_instructions ?? '';
        const subject = task.inbox_item?.subject ?? 'No subject';
        const from = task.inbox_item?.from_name ?? task.inbox_item?.from_email ?? '';
        const summary = task.inbox_item?.ai_summary ?? '';

        const sanitised = sanitiseContent(
          `Task: ${task.inbox_item?.task_title ?? ''}\nFrom: ${from}\nSubject: ${subject}\nSummary: ${summary}\nInstructions: ${context}`,
          'am_sweep'
        );

        const aiResponse = await anthropic.messages.create({
          model: AI_MODELS.FAST,
          max_tokens: 1000,
          system: EMAIL_DRAFTER_PROMPT,
          messages: [{ role: 'user', content: sanitised.content }],
        });

        const responseText = aiResponse.content.find((b) => b.type === 'text')?.text ?? '{}';
        const parsed = JSON.parse(responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());

        // Create Gmail draft — NEVER sends
        const draft = await gmail.users.drafts.create({
          userId: 'me',
          requestBody: {
            message: {
              threadId: task.inbox_item?.thread_id ?? undefined,
              raw: Buffer.from(
                `To: ${task.inbox_item?.from_email ?? ''}\r\n` +
                `Subject: ${parsed.subject ?? `Re: ${subject}`}\r\n` +
                `Content-Type: text/plain; charset=utf-8\r\n\r\n` +
                `${parsed.body ?? ''}`
              ).toString('base64url'),
            },
          },
        });

        results.push({
          taskId: task.task_id,
          subject: parsed.subject ?? subject,
          draftId: draft.data.id ?? '',
          notes: parsed.notes ?? '',
        });
      } catch (err) {
        results.push({
          taskId: task.task_id,
          subject: task.inbox_item?.subject ?? '',
          draftId: '',
          notes: `Error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    await completeSubagentRun(supabase, run.id, { drafts: results });
    return results;
  } catch (err) {
    await failSubagentRun(supabase, run.id, err instanceof Error ? err.message : String(err));
    throw err;
  }
}
