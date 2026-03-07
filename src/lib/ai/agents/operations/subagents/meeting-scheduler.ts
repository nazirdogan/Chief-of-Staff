import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { sanitiseContent } from '@/lib/ai/safety/sanitise';
import { MEETING_SCHEDULER_PROMPT } from '@/lib/ai/prompts/operations/subagent-prompts';
import { getTodaysParsedEvents, createCalendarEvent } from '@/lib/integrations/google-calendar';
import { createServiceClient } from '@/lib/db/client';
import { createSubagentRun, completeSubagentRun, failSubagentRun } from '@/lib/db/queries/operations';
import type { ClassifiedTask } from '../am-sweep';

const anthropic = new Anthropic();

export interface SchedulingResult {
  taskId: string;
  action: 'created' | 'proposed_options' | 'error';
  eventId?: string;
  options?: Array<{ start: string; end: string; reason: string }>;
  notes: string;
}

export async function runMeetingScheduler(
  userId: string,
  operationRunId: string,
  tasks: ClassifiedTask[]
): Promise<SchedulingResult[]> {
  const supabase = createServiceClient();
  const run = await createSubagentRun(supabase, {
    operation_run_id: operationRunId,
    user_id: userId,
    agent_type: 'meeting_scheduler',
    task_ids: tasks.map((t) => t.task_id),
  });

  const results: SchedulingResult[] = [];

  try {
    // Get current calendar for availability context
    let calendarContext = '';
    try {
      const events = await getTodaysParsedEvents(userId);
      calendarContext = events
        .map((e) => `${e.start} - ${e.end}: ${e.summary}`)
        .join('\n');
    } catch {
      calendarContext = 'Calendar unavailable';
    }

    for (const task of tasks) {
      try {
        const context = task.context_package?.specific_instructions ?? '';
        const title = task.inbox_item?.task_title ?? task.inbox_item?.subject ?? '';

        const sanitised = sanitiseContent(
          `Task: ${title}\nInstructions: ${context}\n\nCurrent Calendar:\n${calendarContext}`,
          'am_sweep'
        );

        const aiResponse = await anthropic.messages.create({
          model: AI_MODELS.FAST,
          max_tokens: 1000,
          system: MEETING_SCHEDULER_PROMPT,
          messages: [{ role: 'user', content: sanitised.content }],
        });

        const responseText = aiResponse.content.find((b) => b.type === 'text')?.text ?? '{}';
        const parsed = JSON.parse(responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());

        if (parsed.action === 'create_event' && parsed.event) {
          const eventId = await createCalendarEvent(userId, {
            summary: parsed.event.summary,
            description: parsed.event.description,
            location: parsed.event.location,
            start: { dateTime: parsed.event.start },
            end: { dateTime: parsed.event.end },
          });

          results.push({
            taskId: task.task_id,
            action: 'created',
            eventId,
            notes: parsed.notes ?? `Scheduled: ${parsed.event.summary}`,
          });
        } else {
          results.push({
            taskId: task.task_id,
            action: 'proposed_options',
            options: parsed.options ?? [],
            notes: parsed.notes ?? 'Options prepared for review',
          });
        }
      } catch (err) {
        results.push({
          taskId: task.task_id,
          action: 'error',
          notes: `Error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    await completeSubagentRun(supabase, run.id, { scheduled: results });
    return results;
  } catch (err) {
    await failSubagentRun(supabase, run.id, err instanceof Error ? err.message : String(err));
    throw err;
  }
}
