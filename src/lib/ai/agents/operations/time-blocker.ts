import { getEventsForDateRange, createCalendarEvent } from '@/lib/integrations/google-calendar';
import { createServiceClient } from '@/lib/db/client';
import { createOperationRun, completeOperationRun, failOperationRun } from '@/lib/db/queries/operations';
import { createTimeBlocks, deleteProposedTimeBlocks } from '@/lib/db/queries/time-blocks';
import type { InboxItem, UserOperationsConfig, TimeBlock } from '@/lib/db/types';

// ── Types ───────────────────────────────────────────────────

export interface ProposedBlock {
  title: string;
  start_time: string;
  end_time: string;
  block_type: TimeBlock['block_type'];
  task_id: string | null;
  location: string | null;
}

export interface OverflowTask {
  taskId: string;
  title: string;
  reason: string;
  recommendedDate: string;
}

export interface ProposedSchedule {
  blocks: ProposedBlock[];
  overflow: OverflowTask[];
  runId: string;
}

interface TimeSlot {
  start: Date;
  end: Date;
}

// ── Main Function ───────────────────────────────────────────

export async function generateTimeBlocks(userId: string): Promise<ProposedSchedule> {
  const supabase = createServiceClient();
  const run = await createOperationRun(supabase, userId, 'time_block');

  try {
    // Fetch user config
    const { data: configData } = await supabase
      .from('user_operations_config')
      .select('*')
      .eq('user_id', userId)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: Partial<UserOperationsConfig> = (configData as any) ?? {};
    const bufferMinutes = config.default_buffer_minutes ?? 10;
    const homeTasksAfter = config.home_tasks_after ?? '19:00';
    const deepWorkPreference = config.deep_work_preferred_time ?? 'morning';
    const exerciseDays = config.exercise_days ?? [1, 3, 5];
    const exerciseDuration = config.exercise_duration_minutes ?? 60;

    // Fetch remaining tasks (RED + reviewed YELLOW + unhandled)
    const { data: items } = await supabase
      .from('inbox_items')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .is('actioned_at', null)
      .in('operation_category', ['red', 'yellow', 'green'])
      .order('received_at', { ascending: true });

    const tasks = (items ?? []) as InboxItem[];

    // Fetch today's calendar
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(7, 0, 0, 0); // workday start
    const endOfDay = new Date(now);
    endOfDay.setHours(22, 0, 0, 0); // workday end

    const calendarEvents = await getEventsForDateRange(userId, startOfDay, endOfDay);

    // Build occupied slots from calendar events
    const occupiedSlots: TimeSlot[] = calendarEvents
      .filter((e) => !e.isAllDay)
      .map((e) => ({
        start: new Date(e.start),
        end: new Date(e.end),
      }));

    // Find available time slots
    const availableSlots = findAvailableSlots(startOfDay, endOfDay, occupiedSlots, bufferMinutes);

    // Sort tasks by priority then duration
    const sortedTasks = [...tasks].sort((a, b) => {
      const priorityA = getPriorityWeight((a.operation_context as Record<string, unknown> | null)?.priority as string | undefined);
      const priorityB = getPriorityWeight((b.operation_context as Record<string, unknown> | null)?.priority as string | undefined);
      if (priorityA !== priorityB) return priorityA - priorityB;
      return (a.estimated_duration_minutes ?? 30) - (b.estimated_duration_minutes ?? 30);
    });

    const proposedBlocks: ProposedBlock[] = [];
    const overflow: OverflowTask[] = [];
    const usedSlots: TimeSlot[] = [];

    // Add exercise block if today is an exercise day
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, etc.
    if (exerciseDays.includes(dayOfWeek)) {
      const exerciseSlot = findBestSlot(availableSlots, usedSlots, exerciseDuration, {
        preferAfter: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0),
        preferBefore: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0),
      });
      if (exerciseSlot) {
        proposedBlocks.push({
          title: 'Exercise',
          start_time: exerciseSlot.start.toISOString(),
          end_time: exerciseSlot.end.toISOString(),
          block_type: 'exercise',
          task_id: null,
          location: null,
        });
        usedSlots.push(exerciseSlot);
      }
    }

    // Schedule tasks
    for (const task of sortedTasks) {
      const duration = task.estimated_duration_minutes ?? 30;
      const tags = task.task_tags ?? [];
      const title = task.task_title ?? task.subject ?? 'Untitled task';

      // Apply tag-based constraints
      const constraints = getConstraints(tags, homeTasksAfter, deepWorkPreference, now);

      const slot = findBestSlot(availableSlots, usedSlots, duration, constraints);

      if (slot) {
        proposedBlocks.push({
          title,
          start_time: slot.start.toISOString(),
          end_time: slot.end.toISOString(),
          block_type: tags.includes('errand') ? 'errand_batch' : tags.includes('deep-work') ? 'deep_work' : 'task',
          task_id: task.id,
          location: null,
        });
        usedSlots.push(slot);
      } else {
        // Task doesn't fit today
        const recommendedDate = getNextAvailableDate(now);
        overflow.push({
          taskId: task.id,
          title,
          reason: `No available ${duration}-minute slot matching constraints`,
          recommendedDate,
        });
      }
    }

    // Sort blocks by start time
    proposedBlocks.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    // Clear any previous proposed blocks and save new ones
    await deleteProposedTimeBlocks(supabase, userId);

    if (proposedBlocks.length > 0) {
      await createTimeBlocks(
        supabase,
        proposedBlocks.map((b) => ({
          user_id: userId,
          operation_run_id: run.id,
          task_id: b.task_id,
          title: b.title,
          start_time: b.start_time,
          end_time: b.end_time,
          block_type: b.block_type,
          location: b.location,
          google_calendar_event_id: null,
          status: 'proposed' as const,
        }))
      );
    }

    const resultSummary = {
      blocksProposed: proposedBlocks.length,
      overflow: overflow.length,
    };

    await completeOperationRun(supabase, run.id, resultSummary);

    return { blocks: proposedBlocks, overflow, runId: run.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await failOperationRun(supabase, run.id, errorMessage);
    throw err;
  }
}

export async function confirmTimeBlockSchedule(
  userId: string,
  runId: string
): Promise<{ eventsCreated: number }> {
  const supabase = createServiceClient();

  // Fetch proposed blocks for this run
  const { data: blocks } = await supabase
    .from('time_blocks')
    .select('*')
    .eq('user_id', userId)
    .eq('operation_run_id', runId)
    .eq('status', 'proposed');

  const timeBlocks = (blocks ?? []) as TimeBlock[];
  let eventsCreated = 0;

  for (const block of timeBlocks) {
    try {
      const gcalEventId = await createCalendarEvent(userId, {
        summary: block.title,
        description: `Time block: ${block.block_type}`,
        location: block.location ?? undefined,
        start: { dateTime: block.start_time },
        end: { dateTime: block.end_time },
        colorId: getColorForBlockType(block.block_type),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('time_blocks')
        .update({ status: 'confirmed', google_calendar_event_id: gcalEventId })
        .eq('id', block.id);

      eventsCreated++;
    } catch (err) {
      console.error(`Failed to create calendar event for block ${block.id}:`, err);
    }
  }

  return { eventsCreated };
}

// ── Helpers ─────────────────────────────────────────────────

function findAvailableSlots(
  dayStart: Date,
  dayEnd: Date,
  occupied: TimeSlot[],
  bufferMinutes: number
): TimeSlot[] {
  const sorted = [...occupied].sort((a, b) => a.start.getTime() - b.start.getTime());
  const slots: TimeSlot[] = [];
  let cursor = dayStart;

  for (const event of sorted) {
    const eventStart = new Date(event.start.getTime() - bufferMinutes * 60 * 1000);
    if (cursor < eventStart) {
      slots.push({ start: new Date(cursor), end: eventStart });
    }
    const eventEnd = new Date(event.end.getTime() + bufferMinutes * 60 * 1000);
    if (eventEnd > cursor) {
      cursor = eventEnd;
    }
  }

  if (cursor < dayEnd) {
    slots.push({ start: new Date(cursor), end: dayEnd });
  }

  return slots;
}

function findBestSlot(
  available: TimeSlot[],
  used: TimeSlot[],
  durationMinutes: number,
  constraints?: {
    preferAfter?: Date;
    preferBefore?: Date;
    requireAfter?: Date;
    requireBefore?: Date;
    minDuration?: number;
  }
): TimeSlot | null {
  const durationMs = durationMinutes * 60 * 1000;

  for (const slot of available) {
    let start = new Date(slot.start);
    const end = slot.end;

    // Apply constraints
    if (constraints?.requireAfter && start < constraints.requireAfter) {
      start = new Date(constraints.requireAfter);
    }
    if (constraints?.preferAfter && start < constraints.preferAfter) {
      start = new Date(constraints.preferAfter);
    }
    if (constraints?.requireBefore && new Date(start.getTime() + durationMs) > constraints.requireBefore) {
      continue;
    }

    // Check for overlap with used slots
    const proposedEnd = new Date(start.getTime() + durationMs);
    if (proposedEnd > end) continue;

    const overlaps = used.some((u) =>
      start < u.end && proposedEnd > u.start
    );
    if (overlaps) continue;

    return { start, end: proposedEnd };
  }

  return null;
}

function getConstraints(
  tags: string[],
  homeTasksAfter: string,
  deepWorkPreference: string,
  today: Date
) {
  const constraints: {
    preferAfter?: Date;
    preferBefore?: Date;
    requireAfter?: Date;
    requireBefore?: Date;
    minDuration?: number;
  } = {};

  if (tags.includes('home')) {
    const [hours, minutes] = homeTasksAfter.split(':').map(Number);
    constraints.requireAfter = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
  }

  if (tags.includes('deep-work')) {
    if (deepWorkPreference === 'morning') {
      constraints.preferBefore = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0);
    } else {
      constraints.preferAfter = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 0);
    }
    constraints.minDuration = 90;
  }

  if (tags.includes('call')) {
    constraints.requireAfter = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0);
    constraints.requireBefore = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0);
  }

  return constraints;
}

function getPriorityWeight(priority: string | undefined): number {
  switch (priority) {
    case 'P1': return 1;
    case 'P2': return 2;
    case 'P3': return 3;
    case 'P4': return 4;
    default: return 3;
  }
}

function getNextAvailableDate(from: Date): string {
  const next = new Date(from);
  next.setDate(next.getDate() + 1);
  // Skip weekends
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }
  return next.toISOString().split('T')[0];
}

function getColorForBlockType(blockType: string): string {
  switch (blockType) {
    case 'deep_work': return '9';   // Blueberry
    case 'exercise': return '2';     // Sage
    case 'errand_batch': return '6'; // Tangerine
    case 'transit': return '8';      // Graphite
    case 'buffer': return '8';       // Graphite
    default: return '1';             // Lavender
  }
}
