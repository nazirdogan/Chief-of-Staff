import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { sanitiseContent, buildSafeAIContext } from '@/lib/ai/safety/sanitise';
import { validateCitations } from '@/lib/ai/safety/citation-validator';
import { MEETING_PREP_PROMPT } from '@/lib/ai/prompts/meeting-prep';
import { createServiceClient } from '@/lib/db/client';
import { listInboxItems } from '@/lib/db/queries/inbox';
import { listTasks } from '@/lib/db/queries/tasks';
import { getContextChunksByPeople } from '@/lib/db/queries/context';
import type { SourceRef } from '@/lib/db/types';

const anthropic = new Anthropic();

export interface AttendeeContext {
  name: string;
  relationship_note: string;
  source_ref: SourceRef;
}

export interface OpenItem {
  description: string;
  source_ref: SourceRef;
}

export interface MeetingPrep {
  event_id: string;
  event_title: string;
  summary: string;
  attendee_context: AttendeeContext[];
  open_items: OpenItem[];
  suggested_talking_points: string[];
  watch_out_for: string | null;
}

interface CalendarEventInput {
  id: string;
  summary: string;
  description: string;
  start: string;
  end: string;
  attendees: Array<{ email: string; name: string }>;
  organizer: { email: string; name: string };
}

function extractText(content: Anthropic.ContentBlock[]): string {
  for (const block of content) {
    if (block.type === 'text') return block.text;
  }
  return '';
}

function parseJSON<T>(text: string): T | null {
  try {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function generateMeetingPrep(
  userId: string,
  event: CalendarEventInput
): Promise<MeetingPrep> {
  const supabase = createServiceClient();

  // Gather context about attendees from inbox and commitments
  const attendeeEmails = event.attendees.map(a => a.email);

  const [allInboxItems, allTasks] = await Promise.all([
    listInboxItems(supabase, userId, { limit: 100 }),
    listTasks(supabase, userId, { status: 'open' }),
  ]);

  // Filter to items involving meeting attendees
  const relevantInbox = allInboxItems.filter(item =>
    attendeeEmails.some(email =>
      item.from_email?.toLowerCase() === email.toLowerCase()
    )
  );

  const relevantTasks = allTasks.filter(task =>
    attendeeEmails.some(email =>
      task.recipient_email?.toLowerCase() === email.toLowerCase()
    )
  );

  // Build context for the AI
  const contextParts: Array<{ label: string; content: string; source: string }> = [];

  // Event details
  const { content: safeEventDesc } = sanitiseContent(
    event.description || '',
    `calendar:${event.id}`
  );
  contextParts.push({
    label: 'meeting_details',
    content: JSON.stringify({
      title: event.summary,
      start: event.start,
      end: event.end,
      description: safeEventDesc,
      attendees: event.attendees.map(a => ({ name: a.name, email: a.email })),
      organizer: event.organizer,
    }),
    source: `calendar:${event.id}`,
  });

  // Recent communications with attendees
  for (const item of relevantInbox.slice(0, 15)) {
    const { content: safeSummary } = sanitiseContent(
      item.ai_summary ?? '',
      `${item.provider}:${item.external_id}`
    );
    contextParts.push({
      label: 'recent_communication',
      content: JSON.stringify({
        from: item.from_name ?? item.from_email,
        from_email: item.from_email,
        subject: item.subject,
        summary: safeSummary,
        date: item.received_at,
        provider: item.provider,
        message_id: item.external_id,
      }),
      source: `${item.provider}:${item.external_id}`,
    });
  }

  // Open tasks with attendees
  for (const task of relevantTasks.slice(0, 10)) {
    const { content: safeText } = sanitiseContent(
      task.task_text,
      `task:${task.id}`
    );
    contextParts.push({
      label: 'open_task',
      content: JSON.stringify({
        task: safeText,
        to: task.recipient_name ?? task.recipient_email,
        to_email: task.recipient_email,
        source_quote: task.source_quote,
        source_ref: task.source_ref,
        deadline: task.implied_deadline,
        created: task.created_at,
      }),
      source: `task:${task.id}`,
    });
  }

  // Context memory enrichment: get recent context involving attendees
  try {
    for (const attendee of event.attendees.slice(0, 5)) {
      const chunks = await getContextChunksByPeople(supabase, userId, attendee.email, 5);
      for (const chunk of chunks) {
        const { content: safeContent } = sanitiseContent(
          chunk.content_summary,
          `${chunk.provider}:${chunk.source_id}`
        );
        contextParts.push({
          label: 'context_memory',
          content: JSON.stringify({
            type: chunk.chunk_type,
            provider: chunk.provider,
            title: chunk.title,
            summary: safeContent,
            importance: chunk.importance,
            occurred_at: chunk.occurred_at,
            people: chunk.people,
            projects: chunk.projects,
          }),
          source: `${chunk.provider}:${chunk.source_id}`,
        });
      }
    }
  } catch {
    // Non-fatal: continue without context memory
  }

  // If no context available, return a minimal prep
  if (relevantInbox.length === 0 && relevantTasks.length === 0) {
    return {
      event_id: event.id,
      event_title: event.summary,
      summary: `Meeting: ${event.summary}. No prior communications with attendees found in your connected accounts.`,
      attendee_context: [],
      open_items: [],
      suggested_talking_points: ['Introduce yourself and clarify the meeting agenda'],
      watch_out_for: null,
    };
  }

  const context = buildSafeAIContext(MEETING_PREP_PROMPT, contextParts);

  const response = await anthropic.messages.create({
    model: AI_MODELS.STANDARD,
    max_tokens: 1200,
    messages: [{ role: 'user', content: context }],
  });

  const raw = parseJSON<{
    summary: string;
    attendee_context: Array<{
      name: string;
      relationship_note: string;
      source_ref: SourceRef;
    }>;
    open_items: Array<{
      description: string;
      source_ref: SourceRef;
    }>;
    suggested_talking_points: string[];
    watch_out_for: string | null;
  }>(extractText(response.content));

  if (!raw) {
    return {
      event_id: event.id,
      event_title: event.summary,
      summary: `Meeting: ${event.summary}. Unable to generate detailed prep brief.`,
      attendee_context: [],
      open_items: [],
      suggested_talking_points: [],
      watch_out_for: null,
    };
  }

  // Validate all citations before returning
  const allClaims = [
    ...raw.attendee_context.map(a => ({
      text: a.relationship_note,
      source_ref: a.source_ref,
    })),
    ...raw.open_items.map(o => ({
      text: o.description,
      source_ref: o.source_ref,
    })),
  ];

  const validation = validateCitations(allClaims);

  // Filter out uncited claims — never surface claims without citations
  const validAttendeeContext = raw.attendee_context.filter(a =>
    a.source_ref?.provider && a.source_ref?.message_id && a.source_ref?.excerpt
  );
  const validOpenItems = raw.open_items.filter(o =>
    o.source_ref?.provider && o.source_ref?.message_id && o.source_ref?.excerpt
  );

  if (!validation.valid) {
    console.warn(
      `[MEETING_PREP] Removed ${validation.uncited_claims.length} uncited claims for event ${event.id}`
    );
  }

  return {
    event_id: event.id,
    event_title: event.summary,
    summary: raw.summary,
    attendee_context: validAttendeeContext,
    open_items: validOpenItems,
    suggested_talking_points: raw.suggested_talking_points ?? [],
    watch_out_for: raw.watch_out_for ?? null,
  };
}
