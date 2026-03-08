import { createServiceClient } from '@/lib/db/client';
import { listSubagentRuns } from '@/lib/db/queries/operations';
import type { CompletionReport } from './dispatch';
import type { EmailDraftResult } from './subagents/email-drafter';
import type { NotesUpdateResult } from './subagents/notes-updater';
import type { SchedulingResult } from './subagents/meeting-scheduler';
import type { ResearchResult } from './subagents/researcher';
import type { TaskExecutionResult } from './subagents/task-executor';
import type { PrepResult } from './subagents/prep-agent';

export interface FormattedReport {
  sections: ReportSection[];
  summary: string;
}

export interface ReportSection {
  title: string;
  emoji: string;
  items: Array<{
    label: string;
    detail: string;
    actionUrl?: string;
  }>;
}

export function formatCompletionReport(report: CompletionReport): FormattedReport {
  const sections: ReportSection[] = [];

  // Tasks completed (GREEN dispatched)
  const completedItems = [
    ...report.executedTasks
      .filter((t) => t.completed)
      .map((t) => ({ label: t.output.slice(0, 80) || 'Task completed', detail: t.notes })),
    ...report.notesUpdates
      .filter((n) => n.documentTitle)
      .map((n) => ({ label: `Updated ${n.documentTitle}`, detail: n.notes })),
    ...report.scheduledMeetings
      .filter((m) => m.action === 'created')
      .map((m) => ({ label: m.notes, detail: `Event ID: ${m.eventId ?? ''}` })),
  ];

  if (completedItems.length > 0) {
    sections.push({
      title: 'Tasks Completed',
      emoji: 'check',
      items: completedItems,
    });
  }

  // Drafts waiting for review
  const draftItems = report.emailDrafts
    .filter((d) => d.draftId)
    .map((d) => ({
      label: `Draft: ${d.subject}`,
      detail: d.notes,
      actionUrl: `https://mail.google.com/mail/#drafts`,
    }));

  if (draftItems.length > 0) {
    sections.push({
      title: 'Drafts Waiting for Review',
      emoji: 'email',
      items: draftItems,
    });
  }

  // Items needing decisions (YELLOW prep results)
  const decisionItems = report.preppedTasks
    .filter((p) => p.decisionsNeeded.length > 0)
    .map((p) => ({
      label: p.draftOutput.slice(0, 80) || 'Decision needed',
      detail: p.decisionsNeeded.map((d) => d.question).join('; '),
    }));

  if (decisionItems.length > 0) {
    sections.push({
      title: 'Needs Your Decision',
      emoji: 'decision',
      items: decisionItems,
    });
  }

  // Research completed
  const researchItems = report.research
    .filter((r) => r.executiveSummary)
    .map((r) => ({
      label: r.topic,
      detail: r.executiveSummary,
    }));

  if (researchItems.length > 0) {
    sections.push({
      title: 'Research Completed',
      emoji: 'research',
      items: researchItems,
    });
  }

  // Scheduling options
  const optionItems = report.scheduledMeetings
    .filter((m) => m.action === 'proposed_options')
    .map((m) => ({
      label: m.notes,
      detail: `${m.options?.length ?? 0} time options prepared`,
    }));

  if (optionItems.length > 0) {
    sections.push({
      title: 'Scheduling Options',
      emoji: 'calendar',
      items: optionItems,
    });
  }

  // Errors
  if (report.errors.length > 0) {
    sections.push({
      title: 'Issues',
      emoji: 'warning',
      items: report.errors.map((e) => ({
        label: `${e.agent} failed`,
        detail: e.error,
      })),
    });
  }

  const summary = `${report.totalTasksProcessed} tasks processed: ${report.emailDrafts.length} drafts, ${report.executedTasks.filter((t) => t.completed).length} completed, ${report.preppedTasks.length} prepped, ${report.research.length} researched`;

  return { sections, summary };
}

export async function getCompletionReportForRun(
  userId: string,
  operationRunId: string
): Promise<FormattedReport | null> {
  const supabase = createServiceClient();
  const subagentRuns = await listSubagentRuns(supabase, operationRunId);

  if (subagentRuns.length === 0) return null;

  // Reconstruct completion report from subagent run results
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

  for (const run of subagentRuns) {
    const result = run.result as Record<string, unknown>;
    if (run.status === 'failed') {
      report.errors.push({ agent: run.agent_type, error: run.error ?? 'Unknown error' });
      continue;
    }

    switch (run.agent_type) {
      case 'email_drafter':
        report.emailDrafts = (result.drafts as EmailDraftResult[]) ?? [];
        break;
      case 'notes_updater':
        report.notesUpdates = (result.updates as NotesUpdateResult[]) ?? [];
        break;
      case 'meeting_scheduler':
        report.scheduledMeetings = (result.scheduled as SchedulingResult[]) ?? [];
        break;
      case 'researcher':
        report.research = (result.research as ResearchResult[]) ?? [];
        break;
      case 'task_executor':
        report.executedTasks = (result.executions as TaskExecutionResult[]) ?? [];
        break;
      case 'prep_agent':
        report.preppedTasks = (result.preps as PrepResult[]) ?? [];
        break;
    }
  }

  report.totalTasksProcessed =
    report.emailDrafts.length + report.notesUpdates.length +
    report.scheduledMeetings.length + report.research.length +
    report.executedTasks.length + report.preppedTasks.length;

  return formatCompletionReport(report);
}
