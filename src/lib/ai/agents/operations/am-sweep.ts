import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import {
  TASK_CLASSIFICATION_PROMPT,
  TASK_CLASSIFICATION_USER_TEMPLATE,
} from '@/lib/ai/prompts/operations/task-classification';
import { getTodaysParsedEvents } from '@/lib/integrations/google-calendar';
import { createServiceClient } from '@/lib/db/client';
import { createOperationRun, completeOperationRun, failOperationRun } from '@/lib/db/queries/operations';
import { getDesktopObserverChunks } from '@/lib/db/queries/context';
import type { InboxItem, OperationCategory, SubagentType } from '@/lib/db/types';

const anthropic = new Anthropic();

// ── Types ───────────────────────────────────────────────────

export interface ClassifiedTask {
  task_id: string;
  category: OperationCategory;
  reasoning: string;
  agent_assignment: SubagentType | null;
  context_package: {
    original_email_summary?: string;
    relevant_calendar_events?: string[];
    relevant_contacts?: string[];
    relevant_documents?: string[];
    specific_instructions: string;
  };
  // Original inbox item data for agent use
  inbox_item?: InboxItem;
}

export interface ClassifiedTaskSet {
  green: ClassifiedTask[];
  yellow: ClassifiedTask[];
  red: ClassifiedTask[];
  gray: ClassifiedTask[];
  runId: string;
}

// ── Classification ──────────────────────────────────────────

export async function classifyTasks(userId: string): Promise<ClassifiedTaskSet> {
  const supabase = createServiceClient();
  const run = await createOperationRun(supabase, userId, 'am_sweep');

  try {
    // Fetch all open inbox items (not archived, not actioned, not deferred to future)
    const { data: items, error: itemsError } = await supabase
      .from('inbox_items')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .is('actioned_at', null)
      .order('received_at', { ascending: false });

    if (itemsError) throw itemsError;

    const inboxItems = (items ?? []) as InboxItem[];

    // Filter out items deferred to a future date
    const today = new Date().toISOString().split('T')[0];
    const actionableItems = inboxItems.filter(
      (item) => !item.deferred_to || item.deferred_to <= today
    );

    if (actionableItems.length === 0) {
      await completeOperationRun(supabase, run.id, { message: 'No tasks to classify' });
      return { green: [], yellow: [], red: [], gray: [], runId: run.id };
    }

    // Fetch today's calendar events
    let calendarEvents: Array<{ summary: string; start: string; end: string; attendees: string[] }> = [];
    try {
      const events = await getTodaysParsedEvents(userId);
      calendarEvents = events.map((e) => ({
        summary: e.summary,
        start: e.start,
        end: e.end,
        attendees: e.attendees.map((a) => a.name || a.email),
      }));
    } catch {
      // Calendar may not be connected — continue without it
    }

    // Fetch user context (VIPs, projects)
    const { data: onboarding } = await supabase
      .from('onboarding_data')
      .select('vip_contacts, active_projects')
      .eq('user_id', userId)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onboardingData = onboarding as any;
    const vipContacts = onboardingData?.vip_contacts ?? [];
    const activeProjects = onboardingData?.active_projects ?? [];

    // Fetch recent desktop observer context (last 24h) for enriched classification
    let desktopContext: string[] = [];
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const desktopChunks = await getDesktopObserverChunks(supabase, userId, {
        activityTypes: ['communicating'],
        after: yesterday.toISOString(),
        minImportance: 'background',
        limit: 20,
      });
      desktopContext = desktopChunks.map((c) => {
        const app = (c.source_ref as Record<string, unknown>)?.app ?? 'Desktop';
        return `[${app}] ${c.title ?? ''}: ${c.content_summary}`;
      });
    } catch {
      // Desktop observer data not available — continue without it
    }

    // Prepare tasks for classification
    const tasksForAI = actionableItems.map((item) => ({
      id: item.id,
      task_title: item.task_title,
      subject: item.subject,
      from_email: item.from_email,
      from_name: item.from_name,
      ai_summary: item.ai_summary,
      priority: String((item.operation_context as Record<string, unknown>)?.priority ?? 'P3'),
      tags: item.task_tags ?? [],
      estimated_duration_minutes: item.estimated_duration_minutes,
    }));

    // Call Sonnet for classification (higher quality reasoning needed)
    const aiResponse = await anthropic.messages.create({
      model: AI_MODELS.STANDARD,
      max_tokens: 4096,
      system: TASK_CLASSIFICATION_PROMPT,
      messages: [
        {
          role: 'user',
          content: TASK_CLASSIFICATION_USER_TEMPLATE({
            tasks: tasksForAI,
            calendarEvents,
            vipContacts,
            activeProjects,
            desktopContext,
          }),
        },
      ],
    });

    const responseText = aiResponse.content.find((b) => b.type === 'text')?.text ?? '[]';
    const classifications = parseClassifications(responseText);

    // Build classified task set
    const taskSet: ClassifiedTaskSet = {
      green: [],
      yellow: [],
      red: [],
      gray: [],
      runId: run.id,
    };

    // Map inbox items by ID for quick lookup
    const itemMap = new Map(actionableItems.map((item) => [item.id, item]));

    for (const classification of classifications) {
      const inboxItem = itemMap.get(classification.task_id);
      const classifiedTask: ClassifiedTask = {
        ...classification,
        inbox_item: inboxItem,
      };

      taskSet[classification.category].push(classifiedTask);

      // Update the inbox item with its classification
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('inbox_items')
        .update({
          operation_category: classification.category,
          operation_context: {
            ...(inboxItem?.operation_context ?? {}),
            classification_reasoning: classification.reasoning,
            agent_assignment: classification.agent_assignment,
            context_package: classification.context_package,
          },
        })
        .eq('id', classification.task_id);
    }

    const resultSummary = {
      green: taskSet.green.length,
      yellow: taskSet.yellow.length,
      red: taskSet.red.length,
      gray: taskSet.gray.length,
      total: classifications.length,
    };

    await completeOperationRun(supabase, run.id, resultSummary);
    return taskSet;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await failOperationRun(supabase, run.id, errorMessage);
    throw err;
  }
}

// ── Display ─────────────────────────────────────────────────

export function presentClassification(classified: ClassifiedTaskSet): string {
  const lines: string[] = ['=== AM SWEEP CLASSIFICATION ===', ''];

  const sections: Array<{ label: string; emoji: string; tasks: ClassifiedTask[] }> = [
    { label: 'GREEN (AI handles)', emoji: '🟢', tasks: classified.green },
    { label: 'YELLOW (AI preps, you decide)', emoji: '🟡', tasks: classified.yellow },
    { label: 'RED (needs your brain)', emoji: '🔴', tasks: classified.red },
    { label: 'GRAY (skip today)', emoji: '⬜', tasks: classified.gray },
  ];

  for (const section of sections) {
    lines.push(`${section.emoji} ${section.label} (${section.tasks.length})`);
    for (const task of section.tasks) {
      const title = task.inbox_item?.task_title || task.inbox_item?.subject || 'Untitled';
      const duration = task.inbox_item?.estimated_duration_minutes;
      lines.push(`  - ${title}${duration ? ` (${duration}m)` : ''}`);
      lines.push(`    → ${task.reasoning}`);
    }
    lines.push('');
  }

  const total = classified.green.length + classified.yellow.length + classified.red.length + classified.gray.length;
  lines.push(`Total: ${total} tasks classified`);

  return lines.join('\n');
}

// ── Helpers ─────────────────────────────────────────────────

function parseClassifications(text: string): Array<{
  task_id: string;
  category: OperationCategory;
  reasoning: string;
  agent_assignment: SubagentType | null;
  context_package: { specific_instructions: string };
}> {
  try {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

    return (parsed as Record<string, unknown>[]).map((item) => {
      const ctx = item.context_package as Record<string, unknown> | undefined;
      return {
        task_id: (item.task_id as string) ?? '',
        category: (['green', 'yellow', 'red', 'gray'].includes(item.category as string)
          ? item.category
          : 'yellow') as OperationCategory,
        reasoning: (item.reasoning as string) ?? '',
        agent_assignment: (item.agent_assignment as SubagentType | null) ?? null,
        context_package: {
          specific_instructions: (ctx?.specific_instructions as string) ?? '',
          ...ctx,
        },
      };
    });
  } catch {
    return [];
  }
}
