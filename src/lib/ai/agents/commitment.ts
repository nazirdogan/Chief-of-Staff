import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { sanitiseContent, buildSafeAIContext } from '@/lib/ai/safety/sanitise';
import { validateCommitmentRecord } from '@/lib/ai/safety/citation-validator';
import {
  COMMITMENT_EXTRACTION_PASS1_PROMPT,
  COMMITMENT_SCORING_PASS2_PROMPT,
} from '@/lib/ai/prompts/commitment-extraction';
import { insertCommitment } from '@/lib/db/queries/commitments';
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
