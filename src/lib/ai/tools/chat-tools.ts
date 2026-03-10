import type Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/db/client';
import { getTodaysBriefing, updateBriefingItemFeedback } from '@/lib/db/queries/briefings';
import { listCommitments, getCommitment, updateCommitment } from '@/lib/db/queries/commitments';
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
import type { CommitmentStatus, CommitmentConfidence, IntegrationProvider } from '@/lib/db/types';
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
    name: 'list_commitments',
    description: 'List commitments (promises the user made to others). Can filter by status and confidence level.',
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
    name: 'resolve_commitment',
    description: 'Mark a commitment as resolved/done.',
    input_schema: {
      type: 'object' as const,
      properties: {
        commitment_id: { type: 'string', description: 'The commitment ID to resolve' },
      },
      required: ['commitment_id'],
    },
  },
  {
    name: 'snooze_commitment',
    description: 'Snooze a commitment until a specific date.',
    input_schema: {
      type: 'object' as const,
      properties: {
        commitment_id: { type: 'string', description: 'The commitment ID to snooze' },
        until: { type: 'string', description: 'ISO date to snooze until (YYYY-MM-DD)' },
      },
      required: ['commitment_id', 'until'],
    },
  },
  {
    name: 'dismiss_commitment',
    description: 'Dismiss a commitment (mark as no longer relevant).',
    input_schema: {
      type: 'object' as const,
      properties: {
        commitment_id: { type: 'string', description: 'The commitment ID to dismiss' },
      },
      required: ['commitment_id'],
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

    case 'list_commitments': {
      const commitments = await listCommitments(supabase, userId, {
        status: (input.status as CommitmentStatus) ?? 'open',
        confidence: input.confidence as CommitmentConfidence | undefined,
        limit: input.limit as number | undefined,
      });
      return JSON.stringify(commitments.map((c) => ({
        id: c.id,
        text: c.commitment_text,
        to: c.recipient_name ?? c.recipient_email,
        confidence: c.confidence,
        deadline: c.implied_deadline,
        status: c.status,
        source: c.source_ref,
        created: c.created_at,
      })));
    }

    case 'resolve_commitment': {
      const id = input.commitment_id as string;
      const commitment = await getCommitment(supabase, userId, id);
      if (!commitment) return JSON.stringify({ error: 'Commitment not found.' });
      await updateCommitment(supabase, userId, id, {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      });
      return JSON.stringify({ success: true, message: `Commitment resolved: "${commitment.commitment_text}"` });
    }

    case 'snooze_commitment': {
      const id = input.commitment_id as string;
      const until = input.until as string;
      const commitment = await getCommitment(supabase, userId, id);
      if (!commitment) return JSON.stringify({ error: 'Commitment not found.' });
      await updateCommitment(supabase, userId, id, {
        status: 'snoozed',
        snoozed_until: until,
      });
      return JSON.stringify({ success: true, message: `Commitment snoozed until ${until}: "${commitment.commitment_text}"` });
    }

    case 'dismiss_commitment': {
      const id = input.commitment_id as string;
      const commitment = await getCommitment(supabase, userId, id);
      if (!commitment) return JSON.stringify({ error: 'Commitment not found.' });
      await updateCommitment(supabase, userId, id, { status: 'dismissed' });
      return JSON.stringify({ success: true, message: `Commitment dismissed: "${commitment.commitment_text}"` });
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
        draft,
        pending_action_id: pendingAction.id,
        message: 'Draft created. This will NOT be sent until you confirm it.',
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
                  ? (pd.messages as unknown[]).slice(-5).map((m) => {
                      const msg = m as Record<string, unknown>;
                      return `${String(msg.sender ?? msg.from ?? '')}: ${String(msg.text ?? msg.content ?? '').slice(0, 150)}`;
                    })
                  : undefined,
              };
            case 'email':
              return { ...base, subject: pd.subject, from: pd.from };
            case 'code':
              return {
                ...base,
                file: pd.fileName,
                project: pd.projectName,
                language: pd.language,
                functions: Array.isArray(pd.functions) ? (pd.functions as unknown[]).slice(0, 5).map(String) : undefined,
              };
            case 'terminal':
              return {
                ...base,
                directory: pd.currentDirectory,
                commands: Array.isArray(pd.recentCommands) ? (pd.recentCommands as unknown[]).slice(-5).map(String) : undefined,
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
                  ? (pd.messages as unknown[]).slice(-5).map((m) => {
                      const msg = m as Record<string, unknown>;
                      return `${String(msg.sender ?? msg.from ?? '')}: ${String(msg.text ?? msg.content ?? '').slice(0, 150)}`;
                    })
                  : undefined,
              };
            case 'email':
              return { ...base, subject: pd.subject, from: pd.from };
            case 'code':
              return {
                ...base,
                file: pd.fileName,
                project: pd.projectName,
                language: pd.language,
                functions: Array.isArray(pd.functions) ? (pd.functions as unknown[]).slice(0, 5).map(String) : undefined,
              };
            case 'terminal':
              return {
                ...base,
                directory: pd.currentDirectory,
                commands: Array.isArray(pd.recentCommands) ? (pd.recentCommands as unknown[]).slice(-5).map(String) : undefined,
              };
            case 'browser':
              return { ...base, page: pd.pageTitle, domain: pd.domain };
            default:
              return { ...base, window: s.window_title };
          }
        }),
      });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}
