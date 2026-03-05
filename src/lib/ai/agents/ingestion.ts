import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { sanitiseContent, buildSafeAIContext } from '@/lib/ai/safety/sanitise';
import { INGESTION_PROMPT } from '@/lib/ai/prompts/briefing';
import { fetchInboxMessages, fetchMessageForProcessing, parseGmailMessage } from '@/lib/integrations/gmail';
import { fetchOutlookInbox, fetchOutlookMessageForProcessing, parseOutlookMessage } from '@/lib/integrations/outlook';
import { fetchRecentDMs } from '@/lib/integrations/slack';
import { upsertInboxItem } from '@/lib/db/queries/inbox';
import { createServiceClient } from '@/lib/db/client';
import type { ParsedGmailMessage } from '@/lib/integrations/gmail';
import type { ParsedOutlookMessage } from '@/lib/integrations/outlook';
import type { ParsedSlackMessage } from '@/lib/integrations/slack';

const anthropic = new Anthropic();

interface IngestionResult {
  summary: string;
  urgency_score: number;
  needs_reply: boolean;
  sentiment: string;
  key_entities: string[];
}

function extractText(content: Anthropic.ContentBlock[]): string {
  for (const block of content) {
    if (block.type === 'text') {
      return block.text;
    }
  }
  return '';
}

function parseIngestionResult(text: string): IngestionResult {
  try {
    // Strip potential markdown code fences
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      summary: text.slice(0, 200),
      urgency_score: 5,
      needs_reply: false,
      sentiment: 'neutral',
      key_entities: [],
    };
  }
}

async function summariseContent(
  content: string,
  sourceLabel: string,
  sourceId: string
): Promise<IngestionResult> {
  // ALWAYS sanitise before sending to AI
  const { content: safeBody } = sanitiseContent(content, sourceId);

  const context = buildSafeAIContext(
    INGESTION_PROMPT,
    [{ label: sourceLabel, content: safeBody, source: sourceId }]
  );

  const response = await anthropic.messages.create({
    model: AI_MODELS.FAST,
    max_tokens: 300,
    messages: [{ role: 'user', content: context }],
  });

  return parseIngestionResult(extractText(response.content));
}

async function summariseGmailMessage(
  message: ParsedGmailMessage
): Promise<IngestionResult> {
  return summariseContent(
    message.body || message.snippet,
    'email',
    `gmail:${message.id}`
  );
}

async function summariseOutlookMessage(
  message: ParsedOutlookMessage
): Promise<IngestionResult> {
  return summariseContent(
    message.body || message.bodyPreview,
    'email',
    `outlook:${message.id}`
  );
}

async function summariseSlackMessage(
  message: ParsedSlackMessage
): Promise<IngestionResult> {
  return summariseContent(
    message.text,
    'slack_message',
    `slack:${message.id}`
  );
}

export async function ingestGmailMessages(
  userId: string
): Promise<{ processed: number; found: number }> {
  const messageRefs = await fetchInboxMessages(userId, 20);
  const found = messageRefs.length;

  if (found === 0) {
    return { processed: 0, found: 0 };
  }

  const supabase = createServiceClient();
  let processed = 0;

  for (const ref of messageRefs) {
    if (!ref.id) continue;

    // Fetch full message for AI processing — body is NEVER stored
    const fullMessage = await fetchMessageForProcessing(userId, ref.id);
    const parsed = parseGmailMessage(fullMessage);

    // AI summarisation — sanitiseContent is called inside summariseGmailMessage
    const result = await summariseGmailMessage(parsed);

    // Store only metadata + AI summary — raw body discarded
    await upsertInboxItem(supabase, {
      user_id: userId,
      provider: 'gmail',
      external_id: parsed.id,
      thread_id: parsed.threadId,
      from_email: parsed.from,
      from_name: parsed.fromName,
      subject: parsed.subject,
      ai_summary: result.summary,
      urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
      needs_reply: result.needs_reply,
      received_at: parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString(),
    });

    processed++;
  }

  return { processed, found };
}

export async function ingestOutlookMessages(
  userId: string
): Promise<{ processed: number; found: number }> {
  const rawMessages = await fetchOutlookInbox(userId);
  const found = rawMessages.length;

  if (found === 0) {
    return { processed: 0, found: 0 };
  }

  const supabase = createServiceClient();
  let processed = 0;

  for (const raw of rawMessages) {
    const messageId = raw.id as string;
    if (!messageId) continue;

    // Fetch full message for AI processing — body is NEVER stored
    const fullMessage = await fetchOutlookMessageForProcessing(userId, messageId);
    const parsed = parseOutlookMessage(fullMessage);

    // AI summarisation — sanitiseContent is called inside summariseOutlookMessage
    const result = await summariseOutlookMessage(parsed);

    // Store only metadata + AI summary — raw body discarded
    await upsertInboxItem(supabase, {
      user_id: userId,
      provider: 'outlook',
      external_id: parsed.id,
      thread_id: parsed.conversationId,
      from_email: parsed.from,
      from_name: parsed.fromName,
      subject: parsed.subject,
      ai_summary: result.summary,
      urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
      needs_reply: result.needs_reply,
      received_at: parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString(),
    });

    processed++;
  }

  return { processed, found };
}

export async function ingestSlackDMs(
  userId: string
): Promise<{ processed: number; found: number }> {
  const messages = await fetchRecentDMs(userId);
  const found = messages.length;

  if (found === 0) {
    return { processed: 0, found: 0 };
  }

  const supabase = createServiceClient();
  let processed = 0;

  for (const msg of messages) {
    // AI summarisation — sanitiseContent is called inside summariseSlackMessage
    const result = await summariseSlackMessage(msg);

    await upsertInboxItem(supabase, {
      user_id: userId,
      provider: 'slack',
      external_id: msg.id,
      thread_id: msg.threadTs ?? undefined,
      from_email: msg.from,
      from_name: msg.fromName,
      subject: `Slack DM from ${msg.fromName}`,
      ai_summary: result.summary,
      urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
      needs_reply: result.needs_reply,
      received_at: msg.date,
    });

    processed++;
  }

  return { processed, found };
}
