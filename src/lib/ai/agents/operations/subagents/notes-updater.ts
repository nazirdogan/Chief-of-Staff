import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { sanitiseContent } from '@/lib/ai/safety/sanitise';
import { NOTES_UPDATER_PROMPT } from '@/lib/ai/prompts/operations/subagent-prompts';
import { createServiceClient } from '@/lib/db/client';
import { createSubagentRun, completeSubagentRun, failSubagentRun } from '@/lib/db/queries/operations';
import type { ClassifiedTask } from '../am-sweep';

const anthropic = new Anthropic();

export interface NotesUpdateResult {
  taskId: string;
  documentTitle: string;
  contentAdded: string;
  notes: string;
}

export async function runNotesUpdater(
  userId: string,
  operationRunId: string,
  tasks: ClassifiedTask[]
): Promise<NotesUpdateResult[]> {
  const supabase = createServiceClient();
  const run = await createSubagentRun(supabase, {
    operation_run_id: operationRunId,
    user_id: userId,
    agent_type: 'notes_updater',
    task_ids: tasks.map((t) => t.task_id),
  });

  const results: NotesUpdateResult[] = [];

  try {
    for (const task of tasks) {
      try {
        const context = task.context_package?.specific_instructions ?? '';
        const title = task.inbox_item?.task_title ?? task.inbox_item?.subject ?? '';
        const summary = task.inbox_item?.ai_summary ?? '';

        const sanitised = sanitiseContent(
          `Task: ${title}\nSummary: ${summary}\nInstructions: ${context}`,
          'am_sweep'
        );

        const aiResponse = await anthropic.messages.create({
          model: AI_MODELS.FAST,
          max_tokens: 2000,
          system: NOTES_UPDATER_PROMPT,
          messages: [{ role: 'user', content: sanitised.content }],
        });

        const responseText = aiResponse.content.find((b) => b.type === 'text')?.text ?? '{}';
        const parsed = JSON.parse(responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());

        // Store the notes update in the inbox item's operation_context
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('inbox_items')
          .update({
            operation_context: {
              ...(task.inbox_item?.operation_context ?? {}),
              notes_update: {
                document_title: parsed.document_title,
                content_to_add: parsed.content_to_add,
                section: parsed.section,
              },
            },
          })
          .eq('id', task.task_id);

        results.push({
          taskId: task.task_id,
          documentTitle: parsed.document_title ?? '',
          contentAdded: parsed.content_to_add ?? '',
          notes: parsed.notes ?? '',
        });
      } catch (err) {
        results.push({
          taskId: task.task_id,
          documentTitle: '',
          contentAdded: '',
          notes: `Error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    await completeSubagentRun(supabase, run.id, { updates: results });
    return results;
  } catch (err) {
    await failSubagentRun(supabase, run.id, err instanceof Error ? err.message : String(err));
    throw err;
  }
}
