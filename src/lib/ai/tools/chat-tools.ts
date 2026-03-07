import type Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/db/client';
import { getTodaysBriefing, updateBriefingItemFeedback } from '@/lib/db/queries/briefings';
import { listCommitments, getCommitment, updateCommitment } from '@/lib/db/queries/commitments';
import { listContacts, getContact, getContactByEmail, getContactInteractions } from '@/lib/db/queries/contacts';
import { listInboxItems, getInboxItem } from '@/lib/db/queries/inbox';
import type { CommitmentStatus, CommitmentConfidence, IntegrationProvider } from '@/lib/db/types';

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
    description: 'List inbox items (emails, messages) across all connected providers.',
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
      const { data: pendingAction } = await (supabase as any)
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

      return JSON.stringify({
        draft,
        pending_action_id: pendingAction?.id,
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

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}
