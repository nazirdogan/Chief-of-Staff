import type Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/db/client';
import { getTodaysBriefing, updateBriefingItemFeedback } from '@/lib/db/queries/briefings';
import { listTasks, getTask, updateTask } from '@/lib/db/queries/tasks';
import { listContacts, getContact, getContactByEmail, getContactInteractions } from '@/lib/db/queries/contacts';
import { listInboxItems, getInboxItem } from '@/lib/db/queries/inbox';
import {
  getContextChunksByPeople,
  getContextChunksByProject,
  getContextChunksByThread,
  getWorkingPatterns,
  getMemorySnapshot,
  getRecentMemorySnapshots,
  getContextChunksByUser,
} from '@/lib/db/queries/context';
import { getSessionsInRange } from '@/lib/db/queries/activity-sessions';
import { getDayNarrative, getRecentDayNarratives } from '@/lib/db/queries/day-narratives';
import { queryContext, summarizeContext } from '@/lib/context/query-engine';
import type { TaskStatus, TaskConfidence, IntegrationProvider } from '@/lib/db/types';
import type { ContextChunkType, AppCategory } from '@/lib/context/types';

// Tool definitions for Anthropic tool-use API
export const CHAT_TOOL_DEFINITIONS: Anthropic.Messages.Tool[] = [
  {
    name: 'get_briefing',
    description: 'Get the daily briefing — a prioritized list of what matters today including commitments due, meetings, priority emails, and relationship alerts.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: { type: 'string', description: 'ISO date (YYYY-MM-DD). Defaults to today.' },
      },
      required: [],
    },
  },
  {
    name: 'give_briefing_feedback',
    description: 'Rate a briefing item as helpful (1) or not helpful (-1) to improve future briefings.',
    input_schema: {
      type: 'object' as const,
      properties: {
        item_id: { type: 'string', description: 'The briefing item ID' },
        feedback: { type: 'number', enum: [1, -1], description: '1 for helpful, -1 for not helpful' },
      },
      required: ['item_id', 'feedback'],
    },
  },
  {
    name: 'list_tasks',
    description: 'List tasks/commitments (promises the user made to others). Can filter by status and confidence level.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', enum: ['open', 'resolved', 'snoozed', 'dismissed', 'delegated'], description: 'Filter by status. Defaults to open.' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Filter by confidence level' },
        limit: { type: 'number', description: 'Max items to return' },
      },
      required: [],
    },
  },
  {
    name: 'resolve_task',
    description: 'Mark a task as resolved/done.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id: { type: 'string', description: 'The task ID to resolve' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'snooze_task',
    description: 'Snooze a task until a specific date.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id: { type: 'string', description: 'The task ID to snooze' },
        until: { type: 'string', description: 'ISO date to snooze until (YYYY-MM-DD)' },
      },
      required: ['task_id', 'until'],
    },
  },
  {
    name: 'dismiss_task',
    description: 'Dismiss a task (mark as no longer relevant).',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id: { type: 'string', description: 'The task ID to dismiss' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'list_contacts',
    description: 'List contacts. Can filter to only VIPs or only cold (at-risk) contacts.',
    input_schema: {
      type: 'object' as const,
      properties: {
        vip_only: { type: 'boolean', description: 'Only show VIP contacts' },
        cold_only: { type: 'boolean', description: 'Only show cold/at-risk contacts' },
        limit: { type: 'number', description: 'Max items to return' },
        order_by: { type: 'string', enum: ['relationship_score', 'last_interaction_at', 'name'], description: 'Sort order' },
      },
      required: [],
    },
  },
  {
    name: 'get_contact_detail',
    description: 'Get detailed info about a contact including interaction history. Use contact ID or email.',
    input_schema: {
      type: 'object' as const,
      properties: {
        contact_id: { type: 'string', description: 'The contact ID' },
        email: { type: 'string', description: 'Contact email (alternative to ID)' },
      },
      required: [],
    },
  },
  {
    name: 'list_inbox',
    description: 'List inbox items (emails, messages) from OAuth-connected providers (Gmail, Outlook, Slack). For WhatsApp, iMessage, Telegram, or other desktop apps, use search_memory instead.',
    input_schema: {
      type: 'object' as const,
      properties: {
        provider: { type: 'string', description: 'Filter by provider (gmail, outlook, slack, etc.)' },
        unread_only: { type: 'boolean', description: 'Only show unread items' },
        limit: { type: 'number', description: 'Max items to return' },
      },
      required: [],
    },
  },
  {
    name: 'get_inbox_item',
    description: 'Get details of a specific inbox item.',
    input_schema: {
      type: 'object' as const,
      properties: {
        item_id: { type: 'string', description: 'The inbox item ID' },
      },
      required: ['item_id'],
    },
  },
  {
    name: 'draft_reply',
    description: 'Generate an AI reply draft for an inbox item. Creates a pending action that the user must confirm before sending.',
    input_schema: {
      type: 'object' as const,
      properties: {
        item_id: { type: 'string', description: 'The inbox item ID to reply to' },
        instruction: { type: 'string', description: 'Optional instruction for the draft (e.g. "keep it brief", "decline politely")' },
      },
      required: ['item_id'],
    },
  },
  {
    name: 'compose_email',
    description: 'Compose a new email (not a reply). Creates a pending action that the user must confirm before sending. Use when the user wants to write a new email to someone.',
    input_schema: {
      type: 'object' as const,
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject line' },
        body: { type: 'string', description: 'Email body text' },
        from_account: { type: 'string', description: 'Optional: which email account to send from (e.g. "gmail", "outlook"). If not specified, uses the first connected account.' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'list_pending_actions',
    description: 'List actions awaiting user confirmation (draft emails, tasks, etc.).',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Max items to return' },
      },
      required: [],
    },
  },
  // ── Calendar Action Tools ──────────────────────────────────
  {
    name: 'create_calendar_event',
    description: 'Create a new calendar event. External attendees require explicit user confirmation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Event title' },
        start: { type: 'string', description: 'Start time in ISO format' },
        end: { type: 'string', description: 'End time in ISO format' },
        attendees: { type: 'array', items: { type: 'string' }, description: 'Attendee email addresses' },
        location: { type: 'string', description: 'Event location or meeting link' },
        description: { type: 'string', description: 'Event description' },
      },
      required: ['title', 'start', 'end'],
    },
  },
  {
    name: 'reschedule_calendar_event',
    description: 'Reschedule an existing calendar event to a new time.',
    input_schema: {
      type: 'object' as const,
      properties: {
        event_id: { type: 'string', description: 'The calendar event ID to reschedule' },
        new_start: { type: 'string', description: 'New start time in ISO format' },
        new_end: { type: 'string', description: 'New end time in ISO format' },
      },
      required: ['event_id', 'new_start', 'new_end'],
    },
  },
  {
    name: 'suggest_meeting_time',
    description: "Analyze the user's calendar and suggest the best available time slots for a meeting.",
    input_schema: {
      type: 'object' as const,
      properties: {
        duration_minutes: { type: 'number', description: 'Meeting duration in minutes. Defaults to 30.' },
        preferred_date: { type: 'string', description: 'Preferred date (ISO format). Defaults to tomorrow.' },
        attendees: { type: 'array', items: { type: 'string' }, description: 'Attendee emails to check availability for' },
      },
      required: [],
    },
  },
  {
    name: 'set_reminder',
    description: 'Set a reminder that will appear as a notification at the specified time.',
    input_schema: {
      type: 'object' as const,
      properties: {
        text: { type: 'string', description: 'What to remind about' },
        remind_at: { type: 'string', description: 'When to remind (ISO datetime)' },
      },
      required: ['text', 'remind_at'],
    },
  },
  // ── Web Search Tools ──────────────────────────────────────
  {
    name: 'web_search',
    description: 'Search the web for current information using Perplexity. Use when the user needs real-time information, news, research, company details, or anything not in their personal data.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'The search query' },
        depth: { type: 'string', enum: ['quick', 'deep', 'research'], description: 'Search depth. quick=fast factual lookup, deep=comprehensive search, research=multi-source deep analysis. Defaults to quick.' },
      },
      required: ['query'],
    },
  },
  // ── Context Memory Tools ──────────────────────────────────
  {
    name: 'search_memory',
    description: 'Semantic search across ALL context memory — emails, messages, meetings, documents, tasks, AND desktop-observed app activity (WhatsApp, iMessage, Telegram, Signal, Discord, etc.). Use this to find relevant context for any question. ALWAYS use this for questions about messaging apps not connected via OAuth.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Natural language search query' },
        time_range: { type: 'string', enum: ['today', 'this_week', 'this_month', 'all'], description: 'Time range filter' },
        provider: { type: 'string', description: 'Filter by provider (gmail, slack, notion, etc.)' },
        project: { type: 'string', description: 'Filter by project name' },
        person: { type: 'string', description: 'Filter by person email' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_working_patterns',
    description: "Get the user's working patterns — typical hours, communication habits, focus periods, top projects, top collaborators.",
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_day_summary',
    description: 'Get a memory snapshot/summary for a specific date. Includes narrative, key decisions, open loops, and notable interactions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: { type: 'string', description: 'ISO date (YYYY-MM-DD). Defaults to today.' },
      },
      required: [],
    },
  },
  {
    name: 'search_by_person',
    description: 'Find all context involving a specific person — emails, meetings, messages, tasks they were part of.',
    input_schema: {
      type: 'object' as const,
      properties: {
        email: { type: 'string', description: 'Person email address' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
      required: ['email'],
    },
  },
  {
    name: 'search_by_project',
    description: 'Find all context related to a specific project.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project: { type: 'string', description: 'Project name' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
      required: ['project'],
    },
  },
  {
    name: 'get_thread_context',
    description: 'Get the full context of a conversation thread — all messages and a summary.',
    input_schema: {
      type: 'object' as const,
      properties: {
        thread_id: { type: 'string', description: 'Thread ID' },
      },
      required: ['thread_id'],
    },
  },
  {
    name: 'what_happened',
    description: "Answer 'what happened' questions — summarizes activity over a time range with optional focus area. Combines desktop-observed activity sessions, day narratives, and context memory for a complete picture.",
    input_schema: {
      type: 'object' as const,
      properties: {
        time_range: { type: 'string', enum: ['last_hour', 'today', 'yesterday', 'this_week', 'last_week', 'this_month'], description: 'Time range to summarize' },
        focus: { type: 'string', enum: ['meetings', 'emails', 'tasks', 'projects', 'people', 'code', 'chat'], description: 'Optional focus area' },
      },
      required: ['time_range'],
    },
  },
  {
    name: 'get_screen_snapshot',
    description: "Get a live snapshot of what's currently on the user's screen — the active app, window title, page content, OCR text, browser URL, code file, chat messages, etc. Use this for questions like 'what am I looking at?', 'what's on my screen?', 'what app am I in?', or any question about the user's current screen state.",
    input_schema: {
      type: 'object' as const,
      properties: {
        question: { type: 'string', description: 'The user\'s question about their screen (used to focus the response)' },
      },
      required: [],
    },
  },
  {
    name: 'get_activity_timeline',
    description: 'Get a timeline of activity sessions from the desktop observer. Shows what apps the user used, who they talked to, what they worked on, and for how long. Best for questions about recent work activity.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: { type: 'string', description: 'ISO date (YYYY-MM-DD). Defaults to today.' },
        category: { type: 'string', enum: ['email', 'chat', 'code', 'terminal', 'browser', 'calendar', 'document', 'design'], description: 'Filter by activity type' },
        limit: { type: 'number', description: 'Max sessions to return (default 30)' },
      },
      required: [],
    },
  },
  {
    name: 'generate_meeting_prep',
    description: 'Generate a meeting prep brief for an upcoming meeting. Includes attendee context, relevant tasks, recent interactions, and optionally web research on attendees/companies.',
    input_schema: {
      type: 'object' as const,
      properties: {
        event_id: { type: 'string', description: 'Calendar event ID (if known)' },
        meeting_title: { type: 'string', description: 'Meeting title or topic' },
        attendees: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of attendee names or emails',
        },
      },
      required: [],
    },
  },
  // ── Report Generation Tools ───────────────────────────────
  {
    name: 'generate_report',
    description: 'Generate a structured report. Types: weekly_summary (past 7 days overview), project_status (status of a specific project), ad_hoc_research (deep research on a topic — Pro tier only).',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: { type: 'string', enum: ['weekly_summary', 'project_status', 'ad_hoc_research'], description: 'Report type' },
        topic: { type: 'string', description: 'For ad_hoc_research: the research topic' },
        project: { type: 'string', description: 'For project_status: the project name' },
      },
      required: ['type'],
    },
  },
];

// Tool execution — maps tool names to actual function calls
export async function executeChatTool(
  toolName: string,
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const supabase = createServiceClient();

  switch (toolName) {
    case 'get_briefing': {
      const date = input.date as string | undefined;
      const briefing = await getTodaysBriefing(supabase, userId, date);
      if (!briefing) return JSON.stringify({ message: 'No briefing available for this date.' });
      return JSON.stringify({
        date: briefing.briefing_date,
        item_count: briefing.items.length,
        meeting_preps: briefing.meeting_preps,
        items: briefing.items.map((item) => ({
          id: item.id,
          rank: item.rank,
          section: item.section,
          type: item.item_type,
          title: item.title,
          summary: item.summary,
          urgency: item.urgency_score,
          source: item.source_ref,
          suggested_action: item.action_suggestion,
        })),
      });
    }

    case 'give_briefing_feedback': {
      const itemId = input.item_id as string;
      const feedback = input.feedback as 1 | -1;
      await updateBriefingItemFeedback(supabase, userId, itemId, feedback);
      return JSON.stringify({ success: true, message: `Feedback recorded.` });
    }

    case 'list_tasks': {
      const tasks = await listTasks(supabase, userId, {
        status: (input.status as TaskStatus) ?? 'open',
        confidence: input.confidence as TaskConfidence | undefined,
        limit: input.limit as number | undefined,
      });
      return JSON.stringify(tasks.map((c) => ({
        id: c.id,
        text: c.task_text,
        to: c.recipient_name ?? c.recipient_email,
        confidence: c.confidence,
        deadline: c.implied_deadline,
        status: c.status,
        source: c.source_ref,
        created: c.created_at,
      })));
    }

    case 'resolve_task': {
      const id = input.task_id as string;
      const task = await getTask(supabase, userId, id);
      if (!task) return JSON.stringify({ error: 'Task not found.' });
      await updateTask(supabase, userId, id, {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      });
      return JSON.stringify({ success: true, message: `Task resolved: "${task.task_text}"` });
    }

    case 'snooze_task': {
      const id = input.task_id as string;
      const until = input.until as string;
      const task = await getTask(supabase, userId, id);
      if (!task) return JSON.stringify({ error: 'Task not found.' });
      await updateTask(supabase, userId, id, {
        status: 'snoozed',
        snoozed_until: until,
      });
      return JSON.stringify({ success: true, message: `Task snoozed until ${until}: "${task.task_text}"` });
    }

    case 'dismiss_task': {
      const id = input.task_id as string;
      const task = await getTask(supabase, userId, id);
      if (!task) return JSON.stringify({ error: 'Task not found.' });
      await updateTask(supabase, userId, id, { status: 'dismissed' });
      return JSON.stringify({ success: true, message: `Task dismissed: "${task.task_text}"` });
    }

    case 'list_contacts': {
      const contacts = await listContacts(supabase, userId, {
        vipOnly: input.vip_only as boolean | undefined,
        coldOnly: input.cold_only as boolean | undefined,
        limit: input.limit as number | undefined,
        orderBy: input.order_by as 'relationship_score' | 'last_interaction_at' | 'name' | undefined,
      });
      return JSON.stringify(contacts.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        organisation: c.organisation,
        is_vip: c.is_vip,
        is_cold: c.is_cold,
        relationship_score: c.relationship_score,
        last_interaction: c.last_interaction_at,
        last_channel: c.last_interaction_channel,
        interactions_30d: c.interaction_count_30d,
      })));
    }

    case 'get_contact_detail': {
      let contact = null;
      if (input.contact_id) {
        contact = await getContact(supabase, userId, input.contact_id as string);
      } else if (input.email) {
        contact = await getContactByEmail(supabase, userId, input.email as string);
      }
      if (!contact) return JSON.stringify({ error: 'Contact not found.' });

      const interactions = await getContactInteractions(supabase, userId, contact.id, 10);
      return JSON.stringify({
        ...contact,
        recent_interactions: interactions.map((i) => ({
          direction: i.direction,
          channel: i.channel,
          subject: i.subject,
          date: i.interacted_at,
        })),
      });
    }

    case 'list_inbox': {
      const items = await listInboxItems(supabase, userId, {
        provider: input.provider as IntegrationProvider | undefined,
        unreadOnly: input.unread_only as boolean | undefined,
        limit: input.limit as number | undefined,
      });
      return JSON.stringify(items.map((item) => ({
        id: item.id,
        provider: item.provider,
        from: item.from_name ?? item.from_email,
        from_email: item.from_email,
        subject: item.subject,
        summary: item.ai_summary,
        urgency: item.urgency_score,
        needs_reply: item.needs_reply,
        is_read: item.is_read,
        received: item.received_at,
      })));
    }

    case 'get_inbox_item': {
      const item = await getInboxItem(supabase, userId, input.item_id as string);
      if (!item) return JSON.stringify({ error: 'Inbox item not found.' });
      return JSON.stringify({
        id: item.id,
        provider: item.provider,
        from: item.from_name ?? item.from_email,
        from_email: item.from_email,
        subject: item.subject,
        summary: item.ai_summary,
        urgency: item.urgency_score,
        needs_reply: item.needs_reply,
        is_read: item.is_read,
        is_starred: item.is_starred,
        received: item.received_at,
        reply_drafted: item.reply_drafted,
      });
    }

    case 'draft_reply': {
      // This calls the existing draft endpoint logic inline
      const itemId = input.item_id as string;
      const instruction = input.instruction as string | undefined;
      const item = await getInboxItem(supabase, userId, itemId);
      if (!item) return JSON.stringify({ error: 'Inbox item not found.' });

      // Import dynamically to avoid circular deps
      const { sanitiseContent } = await import('@/lib/ai/safety/sanitise');
      const { REPLY_DRAFT_PROMPT } = await import('@/lib/ai/prompts/reply-draft');
      const { AI_MODELS } = await import('@/lib/ai/models');
      const Anthropic = (await import('@anthropic-ai/sdk')).default;

      const { content: safeSummary } = sanitiseContent(
        item.ai_summary ?? '',
        `${item.provider}:${item.external_id}`
      );

      const contextParts = [
        `From: ${item.from_name ?? item.from_email} <${item.from_email}>`,
        `Subject: ${item.subject ?? '(no subject)'}`,
        `Summary: ${safeSummary}`,
      ];
      if (instruction) contextParts.push(`\nUser instruction: ${instruction}`);

      const anthropic = new Anthropic();
      const response = await anthropic.messages.create({
        model: AI_MODELS.FAST,
        max_tokens: 1024,
        system: REPLY_DRAFT_PROMPT,
        messages: [{ role: 'user', content: contextParts.join('\n') }],
      });

      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        return JSON.stringify({ error: 'Failed to generate draft.' });
      }

      let draft: { subject: string; body: string; tone: string };
      try {
        draft = JSON.parse(textContent.text);
      } catch {
        draft = { subject: `Re: ${item.subject ?? ''}`, body: textContent.text, tone: 'professional' };
      }

      // Create pending action
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: pendingAction, error: actionError } = await (supabase as any)
        .from('pending_actions')
        .insert({
          user_id: userId,
          action_type: 'send_email',
          status: 'awaiting_confirmation',
          payload: {
            provider: item.provider,
            to: item.from_email,
            subject: draft.subject,
            body: draft.body,
            thread_id: item.thread_id ?? item.external_id,
            inbox_item_id: item.id,
          },
          source_context: {
            inbox_item_id: item.id,
            original_subject: item.subject,
            from: item.from_email,
            instruction: instruction ?? null,
          },
        })
        .select('id, expires_at')
        .single();

      if (actionError || !pendingAction) {
        console.error('[draft_reply] Failed to create pending action:', actionError);
        return JSON.stringify({
          draft,
          pending_action_id: null,
          error: 'Draft generated but failed to create pending action for confirmation.',
        });
      }

      return JSON.stringify({
        type: 'email_draft',
        draft: { ...draft, to: item.from_email, provider: item.provider },
        pending_action_id: pendingAction.id,
        expires_at: pendingAction.expires_at,
        message: 'Reply draft created. Review and confirm to send.',
      });
    }

    case 'compose_email': {
      const to = input.to as string;
      const subject = input.subject as string;
      const body = input.body as string;
      const fromAccount = input.from_account as string | undefined;

      // Determine which email provider to use
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: integrations } = await (supabase as any)
        .from('user_integrations')
        .select('provider, status')
        .eq('user_id', userId)
        .eq('status', 'connected')
        .in('provider', ['gmail', 'outlook']);

      const connected = (integrations ?? []) as Array<{ provider: string; status: string }>;
      const emailProviders = connected.map((i) => i.provider);

      if (emailProviders.length === 0) {
        return JSON.stringify({ error: 'No email account connected. Connect Gmail or Outlook in Settings > Integrations.' });
      }

      let provider: string;
      if (fromAccount && emailProviders.includes(fromAccount)) {
        provider = fromAccount;
      } else if (fromAccount && !emailProviders.includes(fromAccount)) {
        return JSON.stringify({ error: `${fromAccount} is not connected. Connected accounts: ${emailProviders.join(', ')}` });
      } else if (emailProviders.length === 1) {
        provider = emailProviders[0];
      } else {
        // Multiple accounts, no preference specified — ask user
        return JSON.stringify({
          needs_account_selection: true,
          available_accounts: emailProviders,
          message: `You have multiple email accounts connected (${emailProviders.join(', ')}). Which one should I send from?`,
        });
      }

      // Create pending action — send_email is ALWAYS Tier 3
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: pendingAction, error: actionError } = await (supabase as any)
        .from('pending_actions')
        .insert({
          user_id: userId,
          action_type: 'send_email',
          status: 'awaiting_confirmation',
          autonomy_tier: 3,
          payload: {
            provider,
            to,
            subject,
            body,
          },
          source_context: {
            instruction: `Compose new email to ${to}`,
          },
        })
        .select('id, expires_at')
        .single();

      if (actionError || !pendingAction) {
        console.error('[compose_email] Failed to create pending action:', actionError);
        return JSON.stringify({ error: 'Failed to create email draft for confirmation.' });
      }

      return JSON.stringify({
        type: 'email_draft',
        draft: { to, subject, body, provider },
        pending_action_id: pendingAction.id,
        expires_at: pendingAction.expires_at,
        message: 'Email draft created. Review and confirm to send.',
      });
    }

    case 'list_pending_actions': {
      const limit = (input.limit as number) ?? 10;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('pending_actions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'awaiting_confirmation')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) return JSON.stringify({ error: 'Failed to fetch pending actions.' });
      return JSON.stringify((data ?? []).map((a: Record<string, unknown>) => ({
        id: a.id,
        type: a.action_type,
        payload: a.payload,
        expires_at: a.expires_at,
        created_at: a.created_at,
      })));
    }

    // ── Context Memory Tool Execution ──────────────────────────
    case 'search_memory': {
      const query = input.query as string;
      const timeRange = input.time_range as string | undefined;
      const provider = input.provider as string | undefined;
      const project = input.project as string | undefined;
      const person = input.person as string | undefined;
      const limit = (input.limit as number) ?? 20;

      let after: string | undefined;
      const now = new Date();
      if (timeRange === 'today') {
        after = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      } else if (timeRange === 'this_week') {
        const d = new Date(now);
        d.setDate(d.getDate() - d.getDay());
        after = d.toISOString();
      } else if (timeRange === 'this_month') {
        after = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      }

      const result = await queryContext({
        userId,
        query,
        filters: {
          providers: provider ? [provider] : undefined,
          projects: project ? [project] : undefined,
          people: person ? [person] : undefined,
          after,
        },
        limit,
      });

      return JSON.stringify(result.chunks.map((c) => ({
        provider: c.provider,
        type: c.chunk_type,
        title: c.title,
        summary: c.content_summary,
        importance: c.importance,
        topics: c.topics,
        projects: c.projects,
        people: c.people,
        occurred_at: c.occurred_at,
        similarity: c.similarity,
        source: c.source_ref,
      })));
    }

    case 'get_working_patterns': {
      const patterns = await getWorkingPatterns(supabase, userId);
      if (!patterns) return JSON.stringify({ message: 'No working patterns analyzed yet. Patterns are generated daily.' });
      return JSON.stringify({
        typical_hours: `${patterns.typical_start_time ?? '?'} – ${patterns.typical_end_time ?? '?'}`,
        avg_emails_per_day: patterns.avg_emails_per_day,
        avg_slack_messages_per_day: patterns.avg_slack_messages_per_day,
        avg_meetings_per_day: patterns.avg_meetings_per_day,
        busiest_day: patterns.busiest_day_of_week,
        quietest_day: patterns.quietest_day_of_week,
        active_projects: patterns.active_projects_ranked,
        top_collaborators: patterns.top_collaborators,
        working_style: patterns.working_style_summary,
        recent_changes: patterns.recent_changes,
        last_analyzed: patterns.last_analyzed_at,
      });
    }

    case 'get_day_summary': {
      const date = (input.date as string) ?? new Date().toISOString().split('T')[0];

      // Try day narrative first (observer-first, continuously updated)
      const dayNarrative = await getDayNarrative(supabase, userId, date);

      // Also check legacy memory snapshot
      const snapshot = await getMemorySnapshot(supabase, userId, date);

      if (dayNarrative) {
        return JSON.stringify({
          date,
          source: 'desktop_observer',
          narrative: dayNarrative.narrative,
          ...(dayNarrative.structured_summary ? { structured_summary: dayNarrative.structured_summary } : {}),
          stats: {
            sessions: dayNarrative.session_count,
            email_sessions: dayNarrative.email_sessions,
            chat_sessions: dayNarrative.chat_sessions,
            code_sessions: dayNarrative.code_sessions,
            meeting_sessions: dayNarrative.meeting_sessions,
            browsing_sessions: dayNarrative.browsing_sessions,
            active_minutes: Math.round(dayNarrative.total_active_seconds / 60),
          },
          key_events: dayNarrative.key_events,
          people_seen: dayNarrative.people_seen,
          projects_worked_on: dayNarrative.projects_worked_on,
          last_updated: dayNarrative.last_updated_at,
          // Include legacy snapshot data if available
          ...(snapshot ? {
            legacy_data: {
              key_decisions: snapshot.key_decisions,
              open_loops: snapshot.open_loops,
              notable_interactions: snapshot.notable_interactions,
            },
          } : {}),
        });
      }

      if (snapshot) {
        return JSON.stringify({
          date: snapshot.snapshot_date,
          source: 'memory_snapshot',
          narrative: snapshot.day_narrative,
          stats: {
            emails: snapshot.emails_received,
            slack: snapshot.slack_messages,
            meetings: snapshot.meetings_attended,
            tasks: snapshot.tasks_completed,
            docs: snapshot.documents_edited,
            prs: snapshot.code_prs_opened,
          },
          key_decisions: snapshot.key_decisions,
          open_loops: snapshot.open_loops,
          notable_interactions: snapshot.notable_interactions,
        });
      }

      // No data at all — provide diagnostics
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: desktopSession } = await (supabase as any)
        .from('desktop_sessions')
        .select('last_seen_at, observer_running, observation_count')
        .eq('user_id', userId)
        .single();

      const desktopConnected = desktopSession
        ? Date.now() - new Date(desktopSession.last_seen_at).getTime() < 2 * 60 * 1000
        : false;

      return JSON.stringify({
        message: `No summary available for ${date}.`,
        diagnostics: {
          desktop_app: {
            connected: desktopConnected,
            observer_running: desktopSession?.observer_running ?? false,
            last_seen_at: desktopSession?.last_seen_at ?? null,
            total_observations: desktopSession?.observation_count ?? 0,
          },
        },
      });
    }

    case 'search_by_person': {
      const email = input.email as string;
      const limit = (input.limit as number) ?? 20;
      const chunks = await getContextChunksByPeople(supabase, userId, email, limit);
      return JSON.stringify(chunks.map((c) => ({
        provider: c.provider,
        type: c.chunk_type,
        title: c.title,
        summary: c.content_summary,
        importance: c.importance,
        occurred_at: c.occurred_at,
        source: c.source_ref,
      })));
    }

    case 'search_by_project': {
      const project = input.project as string;
      const limit = (input.limit as number) ?? 20;
      const chunks = await getContextChunksByProject(supabase, userId, project, limit);
      return JSON.stringify(chunks.map((c) => ({
        provider: c.provider,
        type: c.chunk_type,
        title: c.title,
        summary: c.content_summary,
        importance: c.importance,
        people: c.people,
        occurred_at: c.occurred_at,
        source: c.source_ref,
      })));
    }

    case 'get_thread_context': {
      const threadId = input.thread_id as string;
      const chunks = await getContextChunksByThread(supabase, userId, threadId);
      if (chunks.length === 0) return JSON.stringify({ message: 'No context found for this thread.' });
      return JSON.stringify({
        thread_id: threadId,
        message_count: chunks.length,
        participants: [...new Set(chunks.flatMap((c) => c.people))],
        messages: chunks.map((c) => ({
          title: c.title,
          summary: c.content_summary,
          importance: c.importance,
          occurred_at: c.occurred_at,
          source: c.source_ref,
        })),
      });
    }

    case 'what_happened': {
      const timeRange = input.time_range as string;
      const focus = input.focus as string | undefined;

      const now = new Date();
      let after: string;
      let before: string | undefined;

      switch (timeRange) {
        case 'last_hour': {
          after = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
          break;
        }
        case 'today': {
          after = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          break;
        }
        case 'yesterday': {
          const d = new Date(now);
          d.setDate(d.getDate() - 1);
          after = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
          before = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();
          break;
        }
        case 'this_week': {
          const d = new Date(now);
          d.setDate(d.getDate() - d.getDay());
          after = d.toISOString();
          break;
        }
        case 'last_week': {
          const d = new Date(now);
          d.setDate(d.getDate() - d.getDay() - 7);
          after = d.toISOString();
          const end = new Date(d);
          end.setDate(end.getDate() + 7);
          before = end.toISOString();
          break;
        }
        case 'this_month':
        default: {
          after = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          break;
        }
      }

      // Map focus to session category
      const focusCategoryMap: Record<string, AppCategory> = {
        meetings: 'calendar',
        emails: 'email',
        code: 'code',
        chat: 'chat',
      };
      const sessionCategory = focus ? focusCategoryMap[focus] : undefined;

      // First: try activity sessions (observer-first)
      const sessions = await getSessionsInRange(supabase, userId, after, before, {
        category: sessionCategory,
        limit: 50,
      });

      // Second: try day narratives for multi-day ranges
      const dayNarratives = (timeRange !== 'last_hour' && timeRange !== 'today')
        ? await getRecentDayNarratives(supabase, userId, 14)
        : [];
      const relevantNarratives = dayNarratives.filter(n => {
        const nDate = new Date(n.narrative_date).getTime();
        return nDate >= new Date(after).getTime() && (!before || nDate <= new Date(before).getTime());
      });

      // Third: fall back to context chunks
      const chunkTypeMap: Record<string, ContextChunkType | ContextChunkType[]> = {
        meetings: 'calendar_event',
        emails: 'email_thread',
        tasks: 'task_update',
        projects: ['document_edit', 'code_activity', 'file_activity'],
        people: ['slack_conversation', 'email_thread', 'crm_activity'],
      };
      const chunkTypeFilter = focus ? chunkTypeMap[focus] : undefined;
      const chunkType = Array.isArray(chunkTypeFilter) ? undefined : chunkTypeFilter;

      // Build response from best available data
      const result: Record<string, unknown> = {
        time_range: timeRange,
        focus: focus ?? 'all',
      };

      // Include session-based data if we have it
      if (sessions.length > 0) {
        const sessionSummaries = sessions.map(s => {
          const pd = (s.parsed_data ?? {}) as Record<string, unknown>;
          const base = {
            app: s.app_name,
            category: s.app_category,
            summary: s.summary ?? undefined,
            people: s.people,
            projects: s.projects,
            started_at: s.started_at,
            duration_min: s.ended_at
              ? Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000)
              : null,
          };
          switch (s.app_category) {
            case 'chat':
              return {
                ...base,
                conversation_with: pd.conversationPartner,
                platform: pd.platform,
                messages: Array.isArray(pd.messages)
                  ? (pd.messages as unknown[]).slice(-15).map((m) => {
                      const msg = m as Record<string, unknown>;
                      return `${String(msg.sender ?? msg.from ?? '')}: ${String(msg.text ?? msg.content ?? '').slice(0, 300)}`;
                    })
                  : undefined,
              };
            case 'email':
              return { ...base, subject: pd.subject, from: pd.from };
            case 'code':
              return {
                ...base,
                files_worked_on: Array.isArray(pd.filesWorkedOn)
                  ? (pd.filesWorkedOn as string[])
                  : pd.fileName ? [String(pd.fileName)] : undefined,
                file: pd.fileName,
                project: pd.projectName,
                language: pd.language,
                functions: Array.isArray(pd.functions) ? (pd.functions as unknown[]).slice(0, 5).map(String) : undefined,
              };
            case 'terminal':
              return {
                ...base,
                directory: pd.currentDirectory,
                commands: Array.isArray(pd.recentCommands) ? (pd.recentCommands as unknown[]).slice(-10).map(String) : undefined,
              };
            case 'browser':
              return { ...base, page: pd.pageTitle, domain: pd.domain };
            default:
              return { ...base, window: s.window_title };
          }
        });

        result.activity_sessions = sessionSummaries;
        result.session_count = sessions.length;

        // Compute aggregate stats
        const allPeople = new Set<string>();
        const allProjects = new Set<string>();
        let totalMinutes = 0;
        for (const s of sessions) {
          const dur = s.ended_at
            ? (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000
            : 0;
          totalMinutes += dur;
          for (const p of s.people) allPeople.add(p);
          for (const p of s.projects) allProjects.add(p);
        }
        result.total_active_minutes = Math.round(totalMinutes);
        result.people_involved = [...allPeople];
        result.projects_touched = [...allProjects];
      }

      // Include day narratives if we have them
      if (relevantNarratives.length > 0) {
        result.daily_narratives = relevantNarratives.map(n => ({
          date: n.narrative_date,
          narrative: n.narrative,
          structured_summary: n.structured_summary ?? undefined,
          key_events: n.key_events,
          people_seen: n.people_seen,
          projects_worked_on: n.projects_worked_on,
          active_minutes: Math.round(n.total_active_seconds / 60),
        }));
      }

      // If we have session data or narratives, return it directly
      if (sessions.length > 0 || relevantNarratives.length > 0) {
        return JSON.stringify(result);
      }

      // Fallback to context chunks
      let chunks = await getContextChunksByUser(supabase, userId, {
        after,
        before,
        chunkType,
        limit: 50,
      });

      if (Array.isArray(chunkTypeFilter)) {
        chunks = chunks.filter(c => (chunkTypeFilter as ContextChunkType[]).includes(c.chunk_type));
      }

      if (chunks.length === 0) {
        return JSON.stringify({
          message: `No activity found for ${timeRange}.`,
        });
      }

      // Also check for legacy memory snapshots
      const snapshots = !focus ? await getRecentMemorySnapshots(supabase, userId, 14) : [];
      const relevantSnapshots = snapshots.filter(s => {
        const sDate = new Date(s.snapshot_date).getTime();
        return sDate >= new Date(after).getTime() && (!before || sDate <= new Date(before).getTime());
      });

      if (relevantSnapshots.length > 0) {
        return JSON.stringify({
          time_range: timeRange,
          focus: focus ?? 'all',
          daily_summaries: relevantSnapshots.map(s => ({
            date: s.snapshot_date,
            narrative: s.day_narrative,
            stats: {
              emails: s.emails_received,
              slack: s.slack_messages,
              meetings: s.meetings_attended,
              tasks: s.tasks_completed,
            },
            key_decisions: s.key_decisions,
            open_loops: s.open_loops,
          })),
          total_activity_items: chunks.length,
        });
      }

      const contextSummary = await summarizeContext({
        chunks,
        purpose: `Summarize what happened ${timeRange}${focus ? ` focusing on ${focus}` : ''}`,
        userId,
      });

      return JSON.stringify({
        time_range: timeRange,
        focus: focus ?? 'all',
        summary: contextSummary.summary,
        sources: contextSummary.sources.slice(0, 10),
        total_activity_items: chunks.length,
      });
    }

    case 'get_screen_snapshot': {
      const question = input.question as string | undefined;

      // Fetch the live snapshot from the internal API
      const snapshotData = await fetchLiveScreenSnapshot(supabase, userId);

      if (!snapshotData.available) {
        return JSON.stringify({
          available: false,
          message: 'No recent screen activity detected. The desktop observer may not be running.',
        });
      }

      // If a question was provided, run it through Haiku for a focused answer
      if (question) {
        const { AI_MODELS } = await import('@/lib/ai/models');
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const anthropic = new Anthropic();

        const screenContext = JSON.stringify(snapshotData, null, 2);
        const response = await anthropic.messages.create({
          model: AI_MODELS.FAST,
          max_tokens: 500,
          system: `You are a screen-aware assistant. The user is asking about what's on their screen. You have a live snapshot of their desktop state. Answer concisely and specifically based on the screen data. Reference actual app names, file names, URLs, and content you see. If you don't have enough data to answer, say so.`,
          messages: [{
            role: 'user',
            content: `Screen snapshot:\n${screenContext}\n\nUser question: ${question}`,
          }],
        });

        const textBlock = response.content.find((c) => c.type === 'text');
        return JSON.stringify({
          available: true,
          answer: textBlock && textBlock.type === 'text' ? textBlock.text : 'Could not analyze screen.',
          snapshot: snapshotData,
        });
      }

      return JSON.stringify(snapshotData);
    }

    case 'get_activity_timeline': {
      const date = (input.date as string) ?? new Date().toISOString().split('T')[0];
      const category = input.category as AppCategory | undefined;
      const limit = (input.limit as number) ?? 30;

      const dayStart = `${date}T00:00:00.000Z`;
      const dayEnd = `${date}T23:59:59.999Z`;

      const [sessions, narrative] = await Promise.all([
        getSessionsInRange(supabase, userId, dayStart, dayEnd, { category, limit }),
        getDayNarrative(supabase, userId, date),
      ]);

      if (sessions.length === 0 && !narrative) {
        return JSON.stringify({ message: `No activity tracked for ${date}.` });
      }

      return JSON.stringify({
        date,
        narrative: narrative?.narrative ?? null,
        ...(narrative?.structured_summary ? { structured_summary: narrative.structured_summary } : {}),
        key_events: narrative?.key_events ?? [],
        people_seen: narrative?.people_seen ?? [],
        projects_worked_on: narrative?.projects_worked_on ?? [],
        active_minutes: narrative ? Math.round(narrative.total_active_seconds / 60) : 0,
        sessions: sessions.map(s => {
          const pd = (s.parsed_data ?? {}) as Record<string, unknown>;
          const base = {
            app: s.app_name,
            category: s.app_category,
            summary: s.summary ?? undefined,
            people: s.people,
            projects: s.projects,
            importance: s.importance,
            started_at: s.started_at,
            ended_at: s.ended_at,
            duration_min: s.ended_at
              ? Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000)
              : null,
          };
          switch (s.app_category) {
            case 'chat':
              return {
                ...base,
                conversation_with: pd.conversationPartner,
                platform: pd.platform,
                messages: Array.isArray(pd.messages)
                  ? (pd.messages as unknown[]).slice(-15).map((m) => {
                      const msg = m as Record<string, unknown>;
                      return `${String(msg.sender ?? msg.from ?? '')}: ${String(msg.text ?? msg.content ?? '').slice(0, 300)}`;
                    })
                  : undefined,
              };
            case 'email':
              return { ...base, subject: pd.subject, from: pd.from };
            case 'code':
              return {
                ...base,
                files_worked_on: Array.isArray(pd.filesWorkedOn)
                  ? (pd.filesWorkedOn as string[])
                  : pd.fileName ? [String(pd.fileName)] : undefined,
                file: pd.fileName,
                project: pd.projectName,
                language: pd.language,
                functions: Array.isArray(pd.functions) ? (pd.functions as unknown[]).slice(0, 5).map(String) : undefined,
              };
            case 'terminal':
              return {
                ...base,
                directory: pd.currentDirectory,
                commands: Array.isArray(pd.recentCommands) ? (pd.recentCommands as unknown[]).slice(-10).map(String) : undefined,
              };
            case 'browser':
              return { ...base, page: pd.pageTitle, domain: pd.domain };
            default:
              return { ...base, window: s.window_title };
          }
        }),
      });
    }

    case 'web_search': {
      const query = input.query as string;
      const depth = (input.depth as string) ?? 'quick';

      // Fetch subscription status — single query
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('subscription_status')
        .eq('id', userId)
        .single();

      const isSubscribed =
        profile?.subscription_status === 'active' ||
        profile?.subscription_status === 'trialing';

      if (!isSubscribed) {
        return JSON.stringify({
          error: 'Web search requires a Plus or Pro subscription.',
          upgrade_url: '/settings/pricing',
        });
      }

      const { quickSearch, deepSearch, deepResearch } = await import('@/lib/integrations/perplexity');

      try {
        let result;
        if (depth === 'research') {
          result = await deepResearch(query);
        } else if (depth === 'deep') {
          result = await deepSearch(query);
        } else {
          result = await quickSearch(query);
        }

        return JSON.stringify({
          answer: result.answer,
          citations: result.citations,
          model_used: result.model_used,
          depth,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Web search failed';
        return JSON.stringify({ error: message });
      }
    }

    case 'generate_meeting_prep': {
      const eventId = input.event_id as string | undefined;
      const meetingTitle = input.meeting_title as string | undefined;
      const rawAttendees = (input.attendees as string[]) ?? [];

      if (!eventId && !meetingTitle) {
        return JSON.stringify({ error: 'Provide either an event_id or meeting_title.' });
      }

      try {
        const { generateMeetingPrep } = await import('@/lib/ai/agents/meeting-prep');

        // Build attendees array — map plain strings to { email, name }
        const attendees = rawAttendees.map((a) => {
          const isEmail = a.includes('@');
          return { email: isEmail ? a : '', name: isEmail ? '' : a };
        });

        const prep = await generateMeetingPrep(userId, {
          id: eventId ?? `manual:${Date.now()}`,
          summary: meetingTitle ?? 'Meeting',
          description: '',
          start: new Date().toISOString(),
          end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          attendees,
          organizer: { email: '', name: '' },
        });

        return JSON.stringify({
          type: 'meeting_prep',
          title: meetingTitle ?? 'Meeting Prep',
          prep,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Meeting prep generation failed';
        return JSON.stringify({ error: message });
      }
    }

    // ── Calendar Action Tool Execution ──────────────────────────
    case 'create_calendar_event': {
      const title = input.title as string;
      const start = input.start as string;
      const end = input.end as string;
      const attendees = (input.attendees as string[]) ?? [];
      const location = input.location as string | undefined;
      const description = input.description as string | undefined;

      // Tier 3 if external attendees present, Tier 2 if internal-only
      const hasExternalAttendees = attendees.length > 0;
      const tier = hasExternalAttendees ? 3 : 2;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: pendingAction, error: actionError } = await (supabase as any)
        .from('pending_actions')
        .insert({
          user_id: userId,
          action_type: 'create_calendar_event',
          status: 'awaiting_confirmation',
          autonomy_tier: tier,
          payload: { title, start, end, attendees, location, description },
          source_context: { instruction: `Create event: ${title}` },
        })
        .select('id, expires_at')
        .single();

      if (actionError || !pendingAction) {
        console.error('[create_calendar_event] Failed to create pending action:', actionError);
        return JSON.stringify({ error: 'Failed to create calendar event action.' });
      }

      return JSON.stringify({
        type: 'calendar_event',
        event: { title, start, end, attendees, location },
        pending_action_id: pendingAction.id,
        expires_at: pendingAction.expires_at,
        tier,
        message: tier === 2 ? 'Calendar event ready. Tap to confirm.' : 'Calendar event created. Please review and confirm.',
      });
    }

    case 'reschedule_calendar_event': {
      const eventId = input.event_id as string;
      const newStart = input.new_start as string;
      const newEnd = input.new_end as string;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: pendingAction, error: actionError } = await (supabase as any)
        .from('pending_actions')
        .insert({
          user_id: userId,
          action_type: 'reschedule_meeting',
          status: 'awaiting_confirmation',
          autonomy_tier: 2,
          payload: { event_id: eventId, new_start: newStart, new_end: newEnd },
          source_context: { instruction: `Reschedule event ${eventId}` },
        })
        .select('id, expires_at')
        .single();

      if (actionError || !pendingAction) {
        console.error('[reschedule_calendar_event] Failed to create pending action:', actionError);
        return JSON.stringify({ error: 'Failed to create reschedule action.' });
      }

      return JSON.stringify({
        type: 'calendar_event',
        action: 'reschedule',
        event_id: eventId,
        new_start: newStart,
        new_end: newEnd,
        pending_action_id: pendingAction.id,
        expires_at: pendingAction.expires_at,
        message: 'Reschedule ready. Confirm to proceed.',
      });
    }

    case 'suggest_meeting_time': {
      const durationMinutes = (input.duration_minutes as number) ?? 30;
      const preferredDate = input.preferred_date as string | undefined;

      const targetDate = preferredDate
        ? new Date(preferredDate)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayStart = new Date(targetDate);
      dayStart.setHours(8, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(18, 0, 0, 0);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: events } = await (supabase as any)
        .from('context_chunks')
        .select('title, occurred_at, metadata')
        .eq('user_id', userId)
        .in('provider', ['google_calendar', 'outlook_calendar'])
        .eq('chunk_type', 'calendar_event')
        .gte('occurred_at', dayStart.toISOString())
        .lte('occurred_at', dayEnd.toISOString())
        .order('occurred_at', { ascending: true });

      // Find gaps between busy slots
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const busySlots = (events ?? []).map((e: any) => ({
        start: new Date(e.occurred_at as string),
        end: new Date(
          new Date(e.occurred_at as string).getTime() +
          ((e.metadata?.duration_minutes as number) || 60) * 60 * 1000
        ),
      }));

      const slots: Array<{ start: string; end: string }> = [];
      let cursor = dayStart;

      for (const busy of busySlots) {
        if (cursor.getTime() + durationMinutes * 60 * 1000 <= busy.start.getTime()) {
          slots.push({
            start: cursor.toISOString(),
            end: new Date(cursor.getTime() + durationMinutes * 60 * 1000).toISOString(),
          });
          if (slots.length >= 3) break;
        }
        cursor = new Date(Math.max(cursor.getTime(), busy.end.getTime()));
      }

      // Check for a slot after the last busy period
      if (slots.length < 3 && cursor.getTime() + durationMinutes * 60 * 1000 <= dayEnd.getTime()) {
        slots.push({
          start: cursor.toISOString(),
          end: new Date(cursor.getTime() + durationMinutes * 60 * 1000).toISOString(),
        });
      }

      if (slots.length === 0) {
        return JSON.stringify({
          message: `No available ${durationMinutes}-minute slots found on ${targetDate.toLocaleDateString()}. Try another date.`,
        });
      }

      return JSON.stringify({
        available_slots: slots,
        date: targetDate.toISOString().split('T')[0],
        duration_minutes: durationMinutes,
        message: `Found ${slots.length} available slot${slots.length > 1 ? 's' : ''}.`,
      });
    }

    case 'set_reminder': {
      const text = input.text as string;
      const remindAt = input.remind_at as string;

      // Store as a task with the reminder time as the implied deadline
      const { insertTask: insertReminderTask } = await import('@/lib/db/queries/tasks');
      const task = await insertReminderTask(supabase, {
        user_id: userId,
        task_text: text,
        confidence: 'high',
        confidence_score: 1.0,
        direction: 'inbound',
        implied_deadline: remindAt,
        source_ref: { type: 'chat', channel: 'reminder' },
        source_quote: text,
        recipient_email: '',
        recipient_name: 'Self',
      });

      return JSON.stringify({
        type: 'task_created',
        task_id: task?.id,
        text,
        remind_at: remindAt,
        message: `Reminder set for ${new Date(remindAt).toLocaleString()}: "${text}"`,
      });
    }

    case 'generate_report': {
      const reportType = input.type as string;
      const topic = input.topic as string | undefined;
      const project = input.project as string | undefined;

      const { generateWeeklySummary, generateProjectStatus, generateAdHocResearch } = await import('@/lib/ai/agents/report-generator');

      try {
        let result;
        switch (reportType) {
          case 'weekly_summary':
            result = await generateWeeklySummary(userId);
            break;
          case 'project_status':
            if (!project) return JSON.stringify({ error: 'Project name is required for project status reports.' });
            result = await generateProjectStatus(userId, project);
            break;
          case 'ad_hoc_research': {
            if (!topic) return JSON.stringify({ error: 'Topic is required for research reports.' });
            // Check Pro tier — ad-hoc research uses Opus and Perplexity deep research
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: profile } = await (supabase as any)
              .from('profiles')
              .select('subscription_status')
              .eq('id', userId)
              .single();
            const isSubscribed =
              profile?.subscription_status === 'active' ||
              profile?.subscription_status === 'trialing';
            if (!isSubscribed) {
              return JSON.stringify({
                error: 'Ad-hoc research reports require a Pro subscription.',
                upgrade_url: '/settings/pricing',
              });
            }
            result = await generateAdHocResearch(userId, topic);
            break;
          }
          default:
            return JSON.stringify({ error: 'Invalid report type.' });
        }

        return JSON.stringify({
          type: 'report',
          report: result,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Report generation failed';
        return JSON.stringify({ error: message });
      }
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

// ── Live Screen Snapshot Helper ──────────────────────────────────
// Fetches the current screen state directly from DB (same logic as the API route)
// to avoid an HTTP round-trip when called from the tool executor.

import { getActiveSession } from '@/lib/db/queries/activity-sessions';

async function fetchLiveScreenSnapshot(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<Record<string, unknown>> {
  // 1. Try the currently active (not yet ended) session
  let currentSession = await getActiveSession(supabase, userId);

  // 2. Fall back to most recent ended session (last 5 min)
  if (!currentSession) {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('activity_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('ended_at', fiveMinAgo)
      .order('ended_at', { ascending: false })
      .limit(1)
      .single();
    currentSession = data ?? null;
  }

  if (!currentSession) {
    return { available: false };
  }

  const pd = (currentSession.parsed_data ?? {}) as Record<string, unknown>;

  return {
    available: true,
    captured_at: currentSession.ended_at ?? currentSession.started_at,
    is_live: !currentSession.ended_at,
    app_name: currentSession.app_name,
    app_category: currentSession.app_category,
    window_title: currentSession.window_title,
    url: currentSession.url ?? pd.url ?? null,
    // Content fields
    page_title: pd.pageTitle ?? null,
    domain: pd.domain ?? null,
    key_content: pd.keyContent ?? null,
    page_headings: pd.pageHeadings ?? null,
    known_tool: pd.knownTool ?? null,
    file_name: pd.fileName ?? null,
    project_name: pd.projectName ?? null,
    language: pd.language ?? null,
    files_worked_on: pd.filesWorkedOn ?? null,
    code_snippet: pd.codeSnippet ?? null,
    email_subject: pd.subject ?? null,
    email_from: pd.from ?? null,
    conversation_partner: pd.conversationPartner ?? null,
    platform: pd.platform ?? null,
    recent_messages: Array.isArray(pd.messages) ? (pd.messages as unknown[]).slice(-8) : null,
    current_directory: pd.currentDirectory ?? null,
    recent_commands: pd.recentCommands ?? null,
    ocr_lines: Array.isArray(pd.ocrLines) ? (pd.ocrLines as string[]).slice(-20) : null,
    // Context
    people: currentSession.people,
    projects: currentSession.projects,
    summary: currentSession.summary,
  };
}
