import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { sanitiseContent, buildSafeAIContext } from '@/lib/ai/safety/sanitise';
import { validateCommitmentRecord } from '@/lib/ai/safety/citation-validator';
import {
  COMMITMENT_EXTRACTION_PASS1_PROMPT,
  COMMITMENT_SCORING_PASS2_PROMPT,
  COMMITMENT_EXTRACTION_SLACK_PROMPT,
  COMMITMENT_EXTRACTION_CALENDAR_PROMPT,
  COMMITMENT_RESOLUTION_PROMPT,
  COMMITMENT_EXTRACTION_DESKTOP_PROMPT,
} from '@/lib/ai/prompts/commitment-extraction';
import { insertCommitment, listCommitments, updateCommitment } from '@/lib/db/queries/commitments';
import { createServiceClient } from '@/lib/db/client';
import { fetchMessageForProcessing, parseGmailMessage } from '@/lib/integrations/gmail';
import {
  fetchOutlookSentMessages,
  parseOutlookMessage,
} from '@/lib/integrations/outlook';
import type { CommitmentConfidence } from '@/lib/db/types';

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

interface PotentialCommitment {
  exact_quote: string;
  commitment_type: string;
  to_person: string;
}

interface CommitmentCandidate {
  message: SentMessage;
  potentialCommitments: PotentialCommitment[];
}

interface ScoredCommitment {
  confidence_score: number;
  commitment_interpretation: string;
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

export async function extractCommitments(
  userId: string,
  sentMessages: SentMessage[]
): Promise<{ extracted: number; total: number }> {
  const candidates: CommitmentCandidate[] = [];

  // PASS 1: Fast extraction — flag everything that might be a commitment
  for (const message of sentMessages) {
    const { content: safeBody } = sanitiseContent(
      message.body,
      `${message.provider}:${message.id}`
    );

    const context = buildSafeAIContext(
      COMMITMENT_EXTRACTION_PASS1_PROMPT,
      [{ label: 'sent_message', content: safeBody, source: `${message.provider}:${message.id}` }]
    );

    const response = await anthropic.messages.create({
      model: AI_MODELS.FAST,
      max_tokens: 500,
      messages: [{ role: 'user', content: context }],
    });

    const extracted = parseJSON<{
      has_commitments: boolean;
      potential_commitments: PotentialCommitment[];
    }>(extractText(response.content));

    if (extracted?.potential_commitments?.length) {
      candidates.push({
        message,
        potentialCommitments: extracted.potential_commitments,
      });
    }
  }

  // PASS 2: Confidence scoring — only run on flagged items
  const supabase = createServiceClient();
  let extracted = 0;

  for (const candidate of candidates) {
    for (const potential of candidate.potentialCommitments) {
      const context = buildSafeAIContext(
        COMMITMENT_SCORING_PASS2_PROMPT,
        [{
          label: 'potential_commitment',
          content: JSON.stringify(potential),
          source: `${candidate.message.provider}:${candidate.message.id}`,
        }]
      );

      const response = await anthropic.messages.create({
        model: AI_MODELS.STANDARD,
        max_tokens: 400,
        messages: [{ role: 'user', content: context }],
      });

      const scored = parseJSON<ScoredCommitment>(extractText(response.content));
      if (!scored || scored.confidence_score < 6) continue;

      const confidence: CommitmentConfidence =
        scored.confidence_score >= 8 ? 'high' : 'medium';

      const record = {
        user_id: userId,
        recipient_email: candidate.message.to,
        recipient_name: candidate.message.toName || undefined,
        commitment_text: scored.commitment_interpretation,
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
      };

      // Validate before DB insert
      validateCommitmentRecord(record);

      await insertCommitment(supabase, record);
      extracted++;
    }
  }

  return { extracted, total: sentMessages.length };
}

export async function extractCommitmentsFromGmail(
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

  return extractCommitments(userId, sentMessages);
}

export async function extractCommitmentsFromOutlook(
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

  return extractCommitments(userId, sentMessages);
}

/**
 * Extract commitments from Slack DMs the user has sent.
 * Uses the Slack-specific prompt tuned for shorter message formats.
 */
export async function extractCommitmentsFromSlack(
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

  return extractCommitmentsWithPrompt(userId, sentMessages, COMMITMENT_EXTRACTION_SLACK_PROMPT);
}

/**
 * Extract commitments from calendar event descriptions.
 * Scans today's events for action items and promises in descriptions/notes.
 */
export async function extractCommitmentsFromCalendar(
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

  return extractCommitmentsWithPrompt(userId, sentMessages, COMMITMENT_EXTRACTION_CALENDAR_PROMPT);
}

/**
 * Extract commitments from desktop observer communication sessions.
 * Called during session summarisation for email/chat/slack activity.
 */
export async function extractCommitmentsFromDesktopSession(
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

  const result = await extractCommitmentsWithPrompt(
    userId,
    sentMessages,
    COMMITMENT_EXTRACTION_DESKTOP_PROMPT,
  );

  return { extracted: result.extracted };
}

/**
 * Generic commitment extraction with a custom Pass 1 prompt.
 * Pass 2 scoring reuses the standard COMMITMENT_SCORING_PASS2_PROMPT.
 */
async function extractCommitmentsWithPrompt(
  userId: string,
  sentMessages: SentMessage[],
  pass1Prompt: string,
): Promise<{ extracted: number; total: number }> {
  const candidates: CommitmentCandidate[] = [];

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
      has_commitments: boolean;
      potential_commitments: PotentialCommitment[];
    }>(extractText(response.content));

    if (extracted?.potential_commitments?.length) {
      candidates.push({
        message,
        potentialCommitments: extracted.potential_commitments,
      });
    }
  }

  // PASS 2: Confidence scoring (same as standard pipeline)
  const supabase = createServiceClient();
  let extracted = 0;

  for (const candidate of candidates) {
    for (const potential of candidate.potentialCommitments) {
      const context = buildSafeAIContext(
        COMMITMENT_SCORING_PASS2_PROMPT,
        [{
          label: 'potential_commitment',
          content: JSON.stringify(potential),
          source: `${candidate.message.provider}:${candidate.message.id}`,
        }]
      );

      const response = await anthropic.messages.create({
        model: AI_MODELS.STANDARD,
        max_tokens: 400,
        messages: [{ role: 'user', content: context }],
      });

      const scored = parseJSON<ScoredCommitment>(extractText(response.content));
      if (!scored || scored.confidence_score < 6) continue;

      const confidence: CommitmentConfidence =
        scored.confidence_score >= 8 ? 'high' : 'medium';

      const record = {
        user_id: userId,
        recipient_email: candidate.message.to,
        recipient_name: candidate.message.toName || undefined,
        commitment_text: scored.commitment_interpretation,
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
      };

      validateCommitmentRecord(record);
      await insertCommitment(supabase, record);
      extracted++;
    }
  }

  return { extracted, total: sentMessages.length };
}

/**
 * Check if recent sent messages resolve any open commitments.
 * Compares each open commitment against recent outbound messages using Haiku.
 */
export async function checkCommitmentResolutions(
  userId: string,
  recentSentMessages: SentMessage[],
): Promise<{ resolved: number }> {
  if (recentSentMessages.length === 0) return { resolved: 0 };

  const supabase = createServiceClient();
  const openCommitments = await listCommitments(supabase, userId, { status: 'open' });

  if (openCommitments.length === 0) return { resolved: 0 };

  let resolved = 0;

  for (const commitment of openCommitments) {
    for (const message of recentSentMessages) {
      // Quick relevance check: recipient must match
      const commitmentRecipient = commitment.recipient_email.toLowerCase();
      const messageRecipient = message.to.toLowerCase();
      if (!messageRecipient.includes(commitmentRecipient) && !commitmentRecipient.includes(messageRecipient)) {
        continue;
      }

      const { content: safeBody } = sanitiseContent(
        message.body,
        `${message.provider}:${message.id}`
      );

      const context = buildSafeAIContext(
        COMMITMENT_RESOLUTION_PROMPT,
        [
          {
            label: 'open_commitment',
            content: `Commitment: ${(commitment as unknown as Record<string, string>).task_text || (commitment as unknown as Record<string, string>).commitment_text}\nOriginal quote: ${commitment.source_quote}\nTo: ${commitment.recipient_name ?? commitment.recipient_email}`,
            source: `commitment:${commitment.id}`,
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
        resolves_commitment: boolean;
        confidence: number;
        reasoning: string;
      }>(extractText(response.content));

      if (result?.resolves_commitment && result.confidence >= 7) {
        await updateCommitment(supabase, userId, commitment.id, {
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
        break; // Move to next commitment once resolved
      }
    }
  }

  return { resolved };
}

/**
 * Find commitments with deadlines within the next 24 hours that haven't been resolved.
 * Returns commitments that should trigger proactive alerts.
 */
export function getUpcomingDeadlineCommitments(
  commitments: Array<{ id: string; commitment_text: string; recipient_name: string | null; recipient_email: string; implied_deadline: string | null; explicit_deadline: boolean; source_ref: unknown }>,
): Array<typeof commitments[number]> {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return commitments.filter(c => {
    if (!c.implied_deadline) return false;
    const deadline = new Date(c.implied_deadline);
    return deadline > now && deadline <= in24Hours;
  });
}
