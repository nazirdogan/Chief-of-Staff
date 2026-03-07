import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { sanitiseContent } from '@/lib/ai/safety/sanitise';
import { PREP_AGENT_PROMPT } from '@/lib/ai/prompts/operations/subagent-prompts';
import { createServiceClient } from '@/lib/db/client';
import { createSubagentRun, completeSubagentRun, failSubagentRun } from '@/lib/db/queries/operations';
import type { ClassifiedTask } from '../am-sweep';

const anthropic = new Anthropic();

export interface PrepResult {
  taskId: string;
  draftOutput: string;
  decisionsNeeded: Array<{
    question: string;
    options: Array<{
      label: string;
      description: string;
      pros: string[];
      cons: string[];
    }>;
    recommendation: string;
  }>;
  notes: string;
}

export async function runPrepAgent(
  userId: string,
  operationRunId: string,
  tasks: ClassifiedTask[]
): Promise<PrepResult[]> {
  const supabase = createServiceClient();
  const run = await createSubagentRun(supabase, {
    operation_run_id: operationRunId,
    user_id: userId,
    agent_type: 'prep_agent',
    task_ids: tasks.map((t) => t.task_id),
  });

  const results: PrepResult[] = [];

  try {
    for (const task of tasks) {
      try {
        const context = task.context_package?.specific_instructions ?? '';
        const title = task.inbox_item?.task_title ?? task.inbox_item?.subject ?? '';
        const summary = task.inbox_item?.ai_summary ?? '';

        const sanitised = sanitiseContent(
          `Task: ${title}\nContext: ${summary}\nInstructions: ${context}\n\nGet this task 80% done and identify the decisions only the user can make.`,
          'am_sweep'
        );

        const aiResponse = await anthropic.messages.create({
          model: AI_MODELS.FAST,
          max_tokens: 3000,
          system: PREP_AGENT_PROMPT,
          messages: [{ role: 'user', content: sanitised.content }],
        });

        const responseText = aiResponse.content.find((b) => b.type === 'text')?.text ?? '{}';
        const parsed = JSON.parse(responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());

        // Store prep result in operation_context
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('inbox_items')
          .update({
            operation_context: {
              ...(task.inbox_item?.operation_context ?? {}),
              prep_result: {
                draft_output: parsed.draft_output,
                decisions_needed: parsed.decisions_needed,
              },
            },
          })
          .eq('id', task.task_id);

        results.push({
          taskId: task.task_id,
          draftOutput: parsed.draft_output ?? '',
          decisionsNeeded: parsed.decisions_needed ?? [],
          notes: parsed.notes ?? '',
        });
      } catch (err) {
        results.push({
          taskId: task.task_id,
          draftOutput: '',
          decisionsNeeded: [],
          notes: `Error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    await completeSubagentRun(supabase, run.id, { preps: results });
    return results;
  } catch (err) {
    await failSubagentRun(supabase, run.id, err instanceof Error ? err.message : String(err));
    throw err;
  }
}
