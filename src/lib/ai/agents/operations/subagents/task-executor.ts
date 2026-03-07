import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { sanitiseContent } from '@/lib/ai/safety/sanitise';
import { TASK_EXECUTOR_PROMPT } from '@/lib/ai/prompts/operations/subagent-prompts';
import { createServiceClient } from '@/lib/db/client';
import { createSubagentRun, completeSubagentRun, failSubagentRun } from '@/lib/db/queries/operations';
import type { ClassifiedTask } from '../am-sweep';

const anthropic = new Anthropic();

export interface TaskExecutionResult {
  taskId: string;
  completed: boolean;
  output: string;
  actionsTaken: string[];
  remaining: string;
  notes: string;
}

export async function runTaskExecutor(
  userId: string,
  operationRunId: string,
  tasks: ClassifiedTask[]
): Promise<TaskExecutionResult[]> {
  const supabase = createServiceClient();
  const run = await createSubagentRun(supabase, {
    operation_run_id: operationRunId,
    user_id: userId,
    agent_type: 'task_executor',
    task_ids: tasks.map((t) => t.task_id),
  });

  const results: TaskExecutionResult[] = [];

  try {
    for (const task of tasks) {
      try {
        const context = task.context_package?.specific_instructions ?? '';
        const title = task.inbox_item?.task_title ?? task.inbox_item?.subject ?? '';
        const summary = task.inbox_item?.ai_summary ?? '';

        const sanitised = sanitiseContent(
          `Task: ${title}\nContext: ${summary}\nInstructions: ${context}`,
          'am_sweep'
        );

        const aiResponse = await anthropic.messages.create({
          model: AI_MODELS.FAST,
          max_tokens: 2000,
          system: TASK_EXECUTOR_PROMPT,
          messages: [{ role: 'user', content: sanitised.content }],
        });

        const responseText = aiResponse.content.find((b) => b.type === 'text')?.text ?? '{}';
        const parsed = JSON.parse(responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());

        // Store result in operation_context
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('inbox_items')
          .update({
            operation_context: {
              ...(task.inbox_item?.operation_context ?? {}),
              execution_result: {
                completed: parsed.task_completed,
                output: parsed.output,
                actions_taken: parsed.actions_taken,
              },
            },
          })
          .eq('id', task.task_id);

        results.push({
          taskId: task.task_id,
          completed: parsed.task_completed ?? false,
          output: parsed.output ?? '',
          actionsTaken: parsed.actions_taken ?? [],
          remaining: parsed.remaining ?? '',
          notes: parsed.notes ?? '',
        });
      } catch (err) {
        results.push({
          taskId: task.task_id,
          completed: false,
          output: '',
          actionsTaken: [],
          remaining: '',
          notes: `Error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    await completeSubagentRun(supabase, run.id, { executions: results });
    return results;
  } catch (err) {
    await failSubagentRun(supabase, run.id, err instanceof Error ? err.message : String(err));
    throw err;
  }
}
