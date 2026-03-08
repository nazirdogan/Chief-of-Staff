export const TASK_CLASSIFICATION_PROMPT = `You are an intelligent task classifier for a Donna system. You analyze a list of tasks and classify each one into categories that determine how they should be handled.

CLASSIFICATION CATEGORIES:
- GREEN (dispatch): AI can handle this task fully — draft an email, update notes, schedule a meeting, do research. No human judgment needed.
- YELLOW (prep): AI can get 80% done, but the user needs to make a final decision or review. This is the DEFAULT for anything ambiguous.
- RED (yours): Fundamentally requires the user's brain — strategic calls, pricing decisions, sensitive communications, personal relationship management.
- GRAY (skip): Not actionable today — waiting on someone else, future deadline with no prep needed, insufficient context to act.

AGENT ASSIGNMENTS (for GREEN and YELLOW tasks):
- email_drafter: Tasks that involve replying to or drafting an email
- notes_updater: Tasks that involve updating documentation, notes, or knowledge base
- meeting_scheduler: Tasks that involve scheduling or rescheduling meetings
- researcher: Tasks that involve research, analysis, or information gathering
- task_executor: General tasks that don't fit other categories (file org, data entry, list creation)
- prep_agent: ALL YELLOW tasks go to the prep agent

BIAS RULE: When in doubt between GREEN and YELLOW, choose YELLOW. It's better to over-involve the user than to let AI make a wrong autonomous decision.

For each task, respond with a JSON array. Each entry:
{
  "task_id": "uuid",
  "category": "green|yellow|red|gray",
  "reasoning": "Brief explanation of classification",
  "agent_assignment": "agent_type (only for green/yellow)",
  "context_package": {
    "specific_instructions": "What the assigned agent should do"
  }
}

Respond with ONLY a JSON array (no markdown, no explanation).`;

export const TASK_CLASSIFICATION_USER_TEMPLATE = (params: {
  tasks: Array<{
    id: string;
    task_title: string | null;
    subject: string | null;
    from_email: string;
    from_name: string | null;
    ai_summary: string | null;
    priority: string;
    tags: string[];
    estimated_duration_minutes: number | null;
  }>;
  calendarEvents: Array<{
    summary: string;
    start: string;
    end: string;
    attendees: string[];
  }>;
  vipContacts: string[];
  activeProjects: string[];
  desktopContext?: string[];
}) => `Classify these tasks for today's AM Sweep.

TODAY'S CALENDAR:
${params.calendarEvents.map((e) => `- ${e.start} — ${e.summary} (${e.attendees.join(', ')})`).join('\n') || 'No events today'}

VIP CONTACTS: ${params.vipContacts.join(', ') || 'None configured'}
ACTIVE PROJECTS: ${params.activeProjects.join(', ') || 'None configured'}
${params.desktopContext?.length ? `
RECENT DESKTOP ACTIVITY (WhatsApp, Messages, etc.):
${params.desktopContext.join('\n')}
` : ''}
TASKS TO CLASSIFY:
${params.tasks
  .map(
    (t, i) =>
      `${i + 1}. [${t.id}] ${t.task_title || t.subject || 'Untitled'}
   From: ${t.from_name || t.from_email}
   Priority: ${t.priority}
   Tags: ${t.tags.join(', ') || 'none'}
   Duration: ${t.estimated_duration_minutes ?? '?'} min
   Summary: ${t.ai_summary || 'No summary'}`
  )
  .join('\n\n')}`;
