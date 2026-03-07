import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { sanitiseContent } from '@/lib/ai/safety/sanitise';
import { RESEARCHER_PROMPT } from '@/lib/ai/prompts/operations/subagent-prompts';
import { createServiceClient } from '@/lib/db/client';
import { createSubagentRun, completeSubagentRun, failSubagentRun } from '@/lib/db/queries/operations';
import type { ClassifiedTask } from '../am-sweep';

const anthropic = new Anthropic();

export interface ResearchResult {
  taskId: string;
  topic: string;
  executiveSummary: string;
  findings: Array<{
    heading: string;
    content: string;
    sources: string[];
  }>;
  notes: string;
}

export async function runResearcher(
  userId: string,
  operationRunId: string,
  tasks: ClassifiedTask[]
): Promise<ResearchResult[]> {
  const supabase = createServiceClient();
  const run = await createSubagentRun(supabase, {
    operation_run_id: operationRunId,
    user_id: userId,
    agent_type: 'researcher',
    task_ids: tasks.map((t) => t.task_id),
  });

  const results: ResearchResult[] = [];

  try {
    for (const task of tasks) {
      try {
        const context = task.context_package?.specific_instructions ?? '';
        const title = task.inbox_item?.task_title ?? task.inbox_item?.subject ?? '';
        const summary = task.inbox_item?.ai_summary ?? '';

        const sanitised = sanitiseContent(
          `Research Task: ${title}\nContext: ${summary}\nSpecific Instructions: ${context}`,
          'am_sweep'
        );

        // Researcher uses Sonnet for quality
        const aiResponse = await anthropic.messages.create({
          model: AI_MODELS.STANDARD,
          max_tokens: 4000,
          system: RESEARCHER_PROMPT,
          messages: [{ role: 'user', content: sanitised.content }],
        });

        const responseText = aiResponse.content.find((b) => b.type === 'text')?.text ?? '{}';
        const parsed = JSON.parse(responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());

        // Store research in operation_context
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('inbox_items')
          .update({
            operation_context: {
              ...(task.inbox_item?.operation_context ?? {}),
              research: {
                topic: parsed.topic,
                executive_summary: parsed.executive_summary,
                findings: parsed.findings,
              },
            },
          })
          .eq('id', task.task_id);

        results.push({
          taskId: task.task_id,
          topic: parsed.topic ?? '',
          executiveSummary: parsed.executive_summary ?? '',
          findings: parsed.findings ?? [],
          notes: parsed.notes ?? '',
        });
      } catch (err) {
        results.push({
          taskId: task.task_id,
          topic: '',
          executiveSummary: '',
          findings: [],
          notes: `Error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    await completeSubagentRun(supabase, run.id, { research: results });
    return results;
  } catch (err) {
    await failSubagentRun(supabase, run.id, err instanceof Error ? err.message : String(err));
    throw err;
  }
}
