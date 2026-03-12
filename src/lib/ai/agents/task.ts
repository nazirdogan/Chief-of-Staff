import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { sanitiseContent, buildSafeAIContext } from '@/lib/ai/safety/sanitise';
import { validateTaskRecord } from '@/lib/ai/safety/citation-validator';
import {
  TASK_EXTRACTION_PASS1_PROMPT,
  TASK_SCORING_PASS2_PROMPT,
  TASK_EXTRACTION_SLACK_PROMPT,
  TASK_EXTRACTION_CALENDAR_PROMPT,
  TASK_RESOLUTION_PROMPT,
  TASK_EXTRACTION_DESKTOP_PROMPT,
} from '@/lib/ai/prompts/task-extraction';
import { insertTask, listTasks, updateTask } from '@/lib/db/queries/tasks';
import { createServiceClient } from '@/lib/db/client';
import { fetchMessageForProcessing, parseGmailMessage } from '@/lib/integrations/gmail';
import {
  fetchOutlookSentMessages,
  parseOutlookMessage,
} from '@/lib/integrations/outlook';
import type { TaskConfidence } from '@/lib/db/types';

const anthropic = new Anthropic();

export interface SentMessage {
  id: string;
  threadId: string;
  provider: string;
  to: string;
  toName: string;
  body: string;
  date: string;
}

interface PotentialTask {
  exact_quote: string;
  task_type: string;
  to_person: string;
  direction?: 'outbound' | 'inbound';
}

interface TaskCandidate {
  message: SentMessage;
  potentialTasks: PotentialTask[];
}

interface ScoredTask {
  confidence_score: number;
  task_interpretation: string;
  has_explicit_deadline: boolean;
  implied_deadline: string | null;
  reasoning: string;
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

export async function extractTasks(
  userId: string,
  sentMessages: SentMessage[]
): Promise<{ extracted: number; total: number }> {
  const candidates: TaskCandidate[] = [];

  // PASS 1: Fast extraction — flag everything that might be a task
  for (const message of sentMessages) {
    const { content: safeBody } = sanitiseContent(
      message.body,
      `${message.provider}:${message.id}`
    );

    const context = buildSafeAIContext(
      TASK_EXTRACTION_PASS1_PROMPT,
      [{ label: 'sent_message', content: safeBody, source: `${message.provider}:${message.id}` }]
    );

    const response = await anthropic.messages.create({
      model: AI_MODELS.FAST,
      max_tokens: 500,
      messages: [{ role: 'user', content: context }],
    });

    const extracted = parseJSON<{
      has_tasks: boolean;
      potential_tasks: PotentialTask[];
    }>(extractText(response.content));

    if (extracted?.potential_tasks?.length) {
      candidates.push({
        message,
        potentialTasks: extracted.potential_tasks,
      });
    }
  }

  // PASS 2: Confidence scoring — only run on flagged items
  const supabase = createServiceClient();
  let extracted = 0;

  for (const candidate of candidates) {
    for (const potential of candidate.potentialTasks) {
      const context = buildSafeAIContext(
        TASK_SCORING_PASS2_PROMPT,
        [{
          label: 'potential_task',
          content: JSON.stringify(potential),
          source: `${candidate.message.provider}:${candidate.message.id}`,
        }]
      );

      const response = await anthropic.messages.create({
        model: AI_MODELS.STANDARD,
        max_tokens: 400,
        messages: [{ role: 'user', content: context }],
      });

      const scored = parseJSON<ScoredTask>(extractText(response.content));
      if (!scored || scored.confidence_score < 6) continue;

      const confidence: TaskConfidence =
        scored.confidence_score >= 8 ? 'high' : 'medium';

      const record = {
        user_id: userId,
        recipient_email: candidate.message.to,
        recipient_name: candidate.message.toName || undefined,
        task_text: scored.task_interpretation,
        source_quote: potential.exact_quote,
        source_ref: {
          provider: candidate.message.provider,
          message_id: candidate.message.id,
          thread_id: candidate.message.threadId,
          sent_at: candidate.message.date,
        },
        confidence,
        confidence_score: scored.confidence_score,
        implied_deadline: scored.implied_deadline || undefined,
        explicit_deadline: scored.has_explicit_deadline,
        direction: potential.direction ?? 'outbound' as const,
      };

      // Validate before DB insert
      validateTaskRecord(record);

      await insertTask(supabase, record);
      extracted++;
    }
  }

  return { extracted, total: sentMessages.length };
}

export async function extractTasksFromGmail(
  userId: string,
  messageIds: string[]
): Promise<{ extracted: number; total: number }> {
  const sentMessages: SentMessage[] = [];

  for (const messageId of messageIds) {
    const fullMessage = await fetchMessageForProcessing(userId, messageId);
    const parsed = parseGmailMessage(fullMessage);

    // Only process outbound messages (SENT label)
    if (!parsed.labelIds.includes('SENT')) continue;

    sentMessages.push({
      id: parsed.id,
      threadId: parsed.threadId,
      provider: 'gmail',
      to: parsed.to,
      toName: '',
      body: parsed.body || parsed.snippet,
      date: parsed.date,
    });
  }

  return extractTasks(userId, sentMessages);
}

export async function extractTasksFromOutlook(
  userId: string
): Promise<{ extracted: number; total: number }> {
  const rawMessages = await fetchOutlookSentMessages(userId);
  const sentMessages: SentMessage[] = [];

  for (const raw of rawMessages) {
    const parsed = parseOutlookMessage(raw, true);

    sentMessages.push({
      id: parsed.id,
      threadId: parsed.conversationId,
      provider: 'outlook',
      to: parsed.to,
      toName: '',
      body: parsed.body || parsed.bodyPreview,
      date: parsed.date,
    });
  }

  return extractTasks(userId, sentMessages);
}

/**
 * Extract tasks from Slack DMs the user has sent.
 * Uses the Slack-specific prompt tuned for shorter message formats.
 */
export async function extractTasksFromSlack(
  userId: string
): Promise<{ extracted: number; total: number }> {
  const { fetchRecentDMs } = await import('@/lib/integrations/slack');
  const { resolveSlackUserEmail } = await import('@/lib/integrations/slack');

  const messages = await fetchRecentDMs(userId, 15);
  const sentMessages: SentMessage[] = [];

  // We need to identify which messages were sent BY the user.
  // In Slack DMs, we need the authenticated user's Slack ID.
  // For now, process all messages and let the prompt filter.
  // The user's own messages won't have a "from" that matches other users.
  for (const msg of messages) {
    if (!msg.text || msg.text.length < 10) continue;

    // Resolve recipient email for the contact
    const recipientEmail = await resolveSlackUserEmail(userId, msg.from).catch(() => null);

    sentMessages.push({
      id: msg.id,
      threadId: msg.threadTs ?? msg.channelId,
      provider: 'slack',
      to: recipientEmail ?? msg.from,
      toName: msg.fromName,
      body: msg.text,
      date: msg.date,
    });
  }

  if (sentMessages.length === 0) return { extracted: 0, total: 0 };

  return extractTasksWithPrompt(userId, sentMessages, TASK_EXTRACTION_SLACK_PROMPT);
}

/**
 * Extract tasks from calendar event descriptions.
 * Scans today's events for action items and promises in descriptions/notes.
 */
export async function extractTasksFromCalendar(
  userId: string
): Promise<{ extracted: number; total: number }> {
  const { getTodaysParsedEvents } = await import('@/lib/integrations/google-calendar');

  let events;
  try {
    events = await getTodaysParsedEvents(userId);
  } catch {
    return { extracted: 0, total: 0 };
  }

  const sentMessages: SentMessage[] = [];

  for (const event of events) {
    // Only process events with meaningful descriptions
    if (!event.description || event.description.length < 20) continue;

    const attendeeEmails = event.attendees.map(a => a.email).join(', ');
    const attendeeNames = event.attendees.map(a => a.name).filter(Boolean).join(', ');

    sentMessages.push({
      id: event.id,
      threadId: event.id,
      provider: 'google_calendar',
      to: attendeeEmails || event.organizer.email,
      toName: attendeeNames || event.organizer.name,
      body: `Event: ${event.summary}\nDescription: ${event.description}`,
      date: event.start,
    });
  }

  if (sentMessages.length === 0) return { extracted: 0, total: 0 };

  return extractTasksWithPrompt(userId, sentMessages, TASK_EXTRACTION_CALENDAR_PROMPT);
}

/**
 * Extract tasks from desktop observer communication sessions.
 * Called during session summarisation for email/chat/slack activity.
 */
export async function extractTasksFromDesktopSession(
  userId: string,
  sessionId: string,
  appName: string,
  conversationPartner: string | null,
  messageText: string,
): Promise<{ extracted: number }> {
  if (!messageText || messageText.length < 20) return { extracted: 0 };

  const sentMessages: SentMessage[] = [{
    id: sessionId,
    threadId: sessionId,
    provider: 'desktop_observer',
    to: conversationPartner ?? 'unknown',
    toName: conversationPartner ?? '',
    body: messageText,
    date: new Date().toISOString(),
  }];

  const result = await extractTasksWithPrompt(
    userId,
    sentMessages,
    TASK_EXTRACTION_DESKTOP_PROMPT,
  );

  return { extracted: result.extracted };
}

/**
 * Generic task extraction with a custom Pass 1 prompt.
 * Pass 2 scoring reuses the standard TASK_SCORING_PASS2_PROMPT.
 */
async function extractTasksWithPrompt(
  userId: string,
  sentMessages: SentMessage[],
  pass1Prompt: string,
): Promise<{ extracted: number; total: number }> {
  const candidates: TaskCandidate[] = [];

  // PASS 1: Fast extraction with custom prompt
  for (const message of sentMessages) {
    const { content: safeBody } = sanitiseContent(
      message.body,
      `${message.provider}:${message.id}`
    );

    const context = buildSafeAIContext(
      pass1Prompt,
      [{ label: 'sent_message', content: safeBody, source: `${message.provider}:${message.id}` }]
    );

    const response = await anthropic.messages.create({
      model: AI_MODELS.FAST,
      max_tokens: 500,
      messages: [{ role: 'user', content: context }],
    });

    const extracted = parseJSON<{
      has_tasks: boolean;
      potential_tasks: PotentialTask[];
    }>(extractText(response.content));

    if (extracted?.potential_tasks?.length) {
      candidates.push({
        message,
        potentialTasks: extracted.potential_tasks,
      });
    }
  }

  // PASS 2: Confidence scoring (same as standard pipeline)
  const supabase = createServiceClient();
  let extracted = 0;

  for (const candidate of candidates) {
    for (const potential of candidate.potentialTasks) {
      const context = buildSafeAIContext(
        TASK_SCORING_PASS2_PROMPT,
        [{
          label: 'potential_task',
          content: JSON.stringify(potential),
          source: `${candidate.message.provider}:${candidate.message.id}`,
        }]
      );

      const response = await anthropic.messages.create({
        model: AI_MODELS.STANDARD,
        max_tokens: 400,
        messages: [{ role: 'user', content: context }],
      });

      const scored = parseJSON<ScoredTask>(extractText(response.content));
      if (!scored || scored.confidence_score < 6) continue;

      const confidence: TaskConfidence =
        scored.confidence_score >= 8 ? 'high' : 'medium';

      const record = {
        user_id: userId,
        recipient_email: candidate.message.to,
        recipient_name: candidate.message.toName || undefined,
        task_text: scored.task_interpretation,
        source_quote: potential.exact_quote,
        source_ref: {
          provider: candidate.message.provider,
          message_id: candidate.message.id,
          thread_id: candidate.message.threadId,
          sent_at: candidate.message.date,
        },
        confidence,
        confidence_score: scored.confidence_score,
        implied_deadline: scored.implied_deadline || undefined,
        explicit_deadline: scored.has_explicit_deadline,
        direction: potential.direction ?? 'outbound' as const,
      };

      validateTaskRecord(record);
      await insertTask(supabase, record);
      extracted++;
    }
  }

  return { extracted, total: sentMessages.length };
}

/**
 * Check if recent sent messages resolve any open tasks.
 * Compares each open task against recent outbound messages using Haiku.
 */
export async function checkTaskResolutions(
  userId: string,
  recentSentMessages: SentMessage[],
): Promise<{ resolved: number }> {
  if (recentSentMessages.length === 0) return { resolved: 0 };

  const supabase = createServiceClient();
  const openTasks = await listTasks(supabase, userId, { status: 'open' });

  if (openTasks.length === 0) return { resolved: 0 };

  let resolved = 0;

  for (const task of openTasks) {
    for (const message of recentSentMessages) {
      // Quick relevance check: recipient must match
      const taskRecipient = task.recipient_email.toLowerCase();
      const messageRecipient = message.to.toLowerCase();
      if (!messageRecipient.includes(taskRecipient) && !taskRecipient.includes(messageRecipient)) {
        continue;
      }

      const { content: safeBody } = sanitiseContent(
        message.body,
        `${message.provider}:${message.id}`
      );

      const context = buildSafeAIContext(
        TASK_RESOLUTION_PROMPT,
        [
          {
            label: 'open_task',
            content: `Task: ${task.task_text}\nOriginal quote: ${task.source_quote}\nTo: ${task.recipient_name ?? task.recipient_email}`,
            source: `task:${task.id}`,
          },
          {
            label: 'sent_message',
            content: safeBody,
            source: `${message.provider}:${message.id}`,
          },
        ]
      );

      const response = await anthropic.messages.create({
        model: AI_MODELS.FAST,
        max_tokens: 200,
        messages: [{ role: 'user', content: context }],
      });

      const result = parseJSON<{
        resolves_task: boolean;
        confidence: number;
        reasoning: string;
      }>(extractText(response.content));

      if (result?.resolves_task && result.confidence >= 7) {
        await updateTask(supabase, userId, task.id, {
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_via_ref: {
            provider: message.provider,
            message_id: message.id,
            thread_id: message.threadId,
            resolved_by: 'auto_detection',
            confidence: result.confidence,
            reasoning: result.reasoning,
          },
        });
        resolved++;
        break; // Move to next task once resolved
      }
    }
  }

  return { resolved };
}

/**
 * Find tasks with deadlines within the next 24 hours that haven't been resolved.
 * Returns tasks that should trigger proactive alerts.
 */
export function getUpcomingDeadlineTasks(
  tasks: Array<{ id: string; task_text: string; recipient_name: string | null; recipient_email: string; implied_deadline: string | null; explicit_deadline: boolean; source_ref: unknown }>,
): Array<typeof tasks[number]> {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return tasks.filter(t => {
    if (!t.implied_deadline) return false;
    const deadline = new Date(t.implied_deadline);
    return deadline > now && deadline <= in24Hours;
  });
}

// Legacy aliases for backward compatibility during transition
export {
  extractTasks as extractCommitments,
  extractTasksFromGmail as extractCommitmentsFromGmail,
  extractTasksFromOutlook as extractCommitmentsFromOutlook,
  extractTasksFromSlack as extractCommitmentsFromSlack,
  extractTasksFromCalendar as extractCommitmentsFromCalendar,
  extractTasksFromDesktopSession as extractCommitmentsFromDesktopSession,
  checkTaskResolutions as checkCommitmentResolutions,
  getUpcomingDeadlineTasks as getUpcomingDeadlineCommitments,
};
