import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { sanitiseContent } from '@/lib/ai/safety/sanitise';
import { INGESTION_PROMPT } from '@/lib/ai/prompts/briefing';
import { fetchInboxMessages, fetchMessageForProcessing, parseGmailMessage } from '@/lib/integrations/gmail';
import { fetchRecentDMs } from '@/lib/integrations/slack';
import { upsertInboxItem, getExistingInboxSummaries, deleteInboxItemsNotIn } from '@/lib/db/queries/inbox';
import { createServiceClient } from '@/lib/db/client';
import type { ParsedGmailMessage } from '@/lib/integrations/gmail';
import type { ParsedSlackMessage } from '@/lib/integrations/slack';

const anthropic = new Anthropic();

interface IngestionResult {
  summary: string;
  urgency_score: number;
  needs_reply: boolean;
  sentiment: string;
  key_entities: string[];
  is_promotional: boolean;
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
      is_promotional: false,
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

  const userMessage = `[${sourceLabel}] (source: ${sourceId})\n\n${safeBody}`;

  const response = await anthropic.beta.messages.create({
    model: AI_MODELS.FAST,
    max_tokens: 300,
    system: [
      {
        type: 'text',
        text: INGESTION_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMessage }],
    betas: ['prompt-caching-2024-07-31'],
  });

  return parseIngestionResult(extractText(response.content as Anthropic.ContentBlock[]));
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

async function summariseSlackMessage(
  message: ParsedSlackMessage
): Promise<IngestionResult> {
  return summariseContent(
    message.text,
    'slack_message',
    `slack:${message.id}`
  );
}

// ── TIER 1 — Email & Messaging ──────────────────────────────────────────────

export async function ingestGmailMessages(
  userId: string,
  integrationId?: string,
  _legacyIntegrationId?: string
): Promise<{ processed: number; found: number }> {
  const messageRefs = await fetchInboxMessages(userId, 20, integrationId);
  const found = messageRefs.length;

  const supabase = createServiceClient();

  // Delta sync: load existing summaries so we can skip re-processing
  const existingSummaries = await getExistingInboxSummaries(supabase, userId, 'gmail');

  if (found === 0) {
    // Inbox is empty — remove all stored items for this account
    await deleteInboxItemsNotIn(supabase, userId, 'gmail', [], integrationId);
    return { processed: 0, found: 0 };
  }

  let processed = 0;
  const scannedIds: string[] = [];

  for (const ref of messageRefs) {
    if (!ref.id) continue;
    scannedIds.push(ref.id);

    // Fetch full message — body is NEVER stored
    const fullMessage = await fetchMessageForProcessing(userId, ref.id, integrationId);
    const parsed = parseGmailMessage(fullMessage);

    const existingSummary = existingSummaries.get(parsed.id);
    const receivedAt = parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString();

    if (existingSummary != null) {
      // Already summarised — skip AI, row is already correct in DB
      continue;
    }

    // New message — run AI summarisation
    const result = await summariseGmailMessage(parsed);

    // Skip promotional content that got through Gmail's category filter
    if (result.is_promotional) continue;

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
      sentiment: result.sentiment as import('@/lib/db/types').MessageSentiment,
      received_at: receivedAt,
      integration_id: integrationId ?? null,
    });

    processed++;
  }

  // Remove rows for messages no longer in the inbox (scoped to this account)
  await deleteInboxItemsNotIn(supabase, userId, 'gmail', scannedIds, integrationId);

  return { processed, found };
}

/**
 * Ingest a specific set of Gmail message refs delivered via Pub/Sub webhook.
 * Same pipeline as ingestGmailMessages but for individual messages rather than
 * a full inbox scan. Does not delete existing rows.
 */
export async function ingestGmailMessageRefs(
  userId: string,
  messageRefs: Array<{ id: string; threadId: string }>,
  integrationId?: string,
  _legacyIntegrationId?: string
): Promise<{ processed: number }> {
  if (messageRefs.length === 0) return { processed: 0 };

  const supabase = createServiceClient();
  const existingSummaries = await getExistingInboxSummaries(supabase, userId, 'gmail');

  let processed = 0;

  for (const ref of messageRefs) {
    const fullMessage = await fetchMessageForProcessing(userId, ref.id, integrationId);
    const parsed = parseGmailMessage(fullMessage);

    const existingSummary = existingSummaries.get(parsed.id);
    const receivedAt = parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString();

    if (existingSummary != null) continue;

    const result = await summariseGmailMessage(parsed);
    if (result.is_promotional) continue;

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
      sentiment: result.sentiment as import('@/lib/db/types').MessageSentiment,
      received_at: receivedAt,
      integration_id: integrationId ?? null,
    });

    processed++;
  }

  return { processed };
}

export async function ingestSlackDMs(
  userId: string
): Promise<{ processed: number; found: number }> {
  const messages = await fetchRecentDMs(userId);
  const found = messages.length;

  const supabase = createServiceClient();

  // Delta sync: load existing summaries so we can skip re-processing
  const existingSummaries = await getExistingInboxSummaries(supabase, userId, 'slack');

  if (found === 0) {
    await deleteInboxItemsNotIn(supabase, userId, 'slack', []);
    return { processed: 0, found: 0 };
  }

  let processed = 0;
  const scannedIds: string[] = [];

  for (const msg of messages) {
    scannedIds.push(msg.id);

    const existingSummary = existingSummaries.get(msg.id);

    if (existingSummary != null) continue;

    // New message — run AI summarisation
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
      sentiment: result.sentiment as import('@/lib/db/types').MessageSentiment,
      received_at: msg.date,
    });

    processed++;
  }

  // Remove rows for messages no longer in the recent DM window
  await deleteInboxItemsNotIn(supabase, userId, 'slack', scannedIds);

  return { processed, found };
}
