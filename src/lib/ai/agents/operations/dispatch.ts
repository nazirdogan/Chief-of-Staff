import { runEmailDrafter, type EmailDraftResult } from './subagents/email-drafter';
import { runNotesUpdater, type NotesUpdateResult } from './subagents/notes-updater';
import { runMeetingScheduler, type SchedulingResult } from './subagents/meeting-scheduler';
import { runResearcher, type ResearchResult } from './subagents/researcher';
import { runTaskExecutor, type TaskExecutionResult } from './subagents/task-executor';
import { runPrepAgent, type PrepResult } from './subagents/prep-agent';
import type { ClassifiedTask } from './am-sweep';

export interface CompletionReport {
  emailDrafts: EmailDraftResult[];
  notesUpdates: NotesUpdateResult[];
  scheduledMeetings: SchedulingResult[];
  research: ResearchResult[];
  executedTasks: TaskExecutionResult[];
  preppedTasks: PrepResult[];
  errors: Array<{ agent: string; error: string }>;
  totalTasksProcessed: number;
}

export async function dispatchSubagents(
  userId: string,
  operationRunId: string,
  greenTasks: ClassifiedTask[],
  yellowTasks: ClassifiedTask[]
): Promise<CompletionReport> {
  // Group GREEN tasks by agent assignment
  const emailTasks = greenTasks.filter((t) => t.agent_assignment === 'email_drafter');
  const notesTasks = greenTasks.filter((t) => t.agent_assignment === 'notes_updater');
  const schedulingTasks = greenTasks.filter((t) => t.agent_assignment === 'meeting_scheduler');
  const researchTasks = greenTasks.filter((t) => t.agent_assignment === 'researcher');
  const execTasks = greenTasks.filter((t) =>
    t.agent_assignment === 'task_executor' || !t.agent_assignment
  );

  // ALL yellow tasks go to prep agent
  const prepTasks = yellowTasks;

  const report: CompletionReport = {
    emailDrafts: [],
    notesUpdates: [],
    scheduledMeetings: [],
    research: [],
    executedTasks: [],
    preppedTasks: [],
    errors: [],
    totalTasksProcessed: 0,
  };

  // Fire all six agents in parallel
  const results = await Promise.allSettled([
    emailTasks.length > 0
      ? runEmailDrafter(userId, operationRunId, emailTasks)
      : Promise.resolve([] as EmailDraftResult[]),

    notesTasks.length > 0
      ? runNotesUpdater(userId, operationRunId, notesTasks)
      : Promise.resolve([] as NotesUpdateResult[]),

    schedulingTasks.length > 0
      ? runMeetingScheduler(userId, operationRunId, schedulingTasks)
      : Promise.resolve([] as SchedulingResult[]),

    researchTasks.length > 0
      ? runResearcher(userId, operationRunId, researchTasks)
      : Promise.resolve([] as ResearchResult[]),

    execTasks.length > 0
      ? runTaskExecutor(userId, operationRunId, execTasks)
      : Promise.resolve([] as TaskExecutionResult[]),

    prepTasks.length > 0
      ? runPrepAgent(userId, operationRunId, prepTasks)
      : Promise.resolve([] as PrepResult[]),
  ]);

  // Collect results
  const agentNames = ['email_drafter', 'notes_updater', 'meeting_scheduler', 'researcher', 'task_executor', 'prep_agent'];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      switch (i) {
        case 0: report.emailDrafts = result.value as EmailDraftResult[]; break;
        case 1: report.notesUpdates = result.value as NotesUpdateResult[]; break;
        case 2: report.scheduledMeetings = result.value as SchedulingResult[]; break;
        case 3: report.research = result.value as ResearchResult[]; break;
        case 4: report.executedTasks = result.value as TaskExecutionResult[]; break;
        case 5: report.preppedTasks = result.value as PrepResult[]; break;
      }
    } else {
      report.errors.push({
        agent: agentNames[i],
        error: result.reason?.message ?? String(result.reason),
      });
    }
  }

  report.totalTasksProcessed =
    report.emailDrafts.length +
    report.notesUpdates.length +
    report.scheduledMeetings.length +
    report.research.length +
    report.executedTasks.length +
    report.preppedTasks.length;

  return report;
}
