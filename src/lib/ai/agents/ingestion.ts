import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { sanitiseContent, buildSafeAIContext } from '@/lib/ai/safety/sanitise';
import { INGESTION_PROMPT } from '@/lib/ai/prompts/briefing';
import { fetchInboxMessages, fetchMessageForProcessing, parseGmailMessage } from '@/lib/integrations/gmail';
import { fetchOutlookInbox, fetchOutlookMessageForProcessing, parseOutlookMessage } from '@/lib/integrations/outlook';
import { fetchRecentDMs } from '@/lib/integrations/slack';
import { fetchICloudInboxMessages } from '@/lib/integrations/apple-icloud';
import { fetchUpcomingBookings } from '@/lib/integrations/calendly';
import { fetchTeamsMessages } from '@/lib/integrations/microsoft-teams';
import { fetchUnreadLinkedInMessages } from '@/lib/integrations/linkedin';
import { fetchUnreadTwitterDMs } from '@/lib/integrations/twitter';
import { listRecentDriveDocuments, exportDriveDocumentText } from '@/lib/integrations/google-drive';
import { listRecentDropboxFiles, downloadDropboxFileText } from '@/lib/integrations/dropbox';
import { listRecentOneDriveFiles, downloadOneDriveFileText } from '@/lib/integrations/onedrive';
import { fetchAssignedAsanaTasks } from '@/lib/integrations/asana';
import { fetchAssignedMondayItems } from '@/lib/integrations/monday';
import { fetchAssignedJiraIssues } from '@/lib/integrations/jira';
import { fetchAssignedLinearIssues } from '@/lib/integrations/linear';
import { fetchAssignedClickUpTasks } from '@/lib/integrations/clickup';
import { fetchAssignedTrelloCards } from '@/lib/integrations/trello';
import { fetchHubSpotDeals, fetchHubSpotTasks } from '@/lib/integrations/hubspot';
import { fetchSalesforceOpportunities, fetchSalesforceTasks } from '@/lib/integrations/salesforce';
import { fetchPipedriveDeals, fetchPipedriveActivities } from '@/lib/integrations/pipedrive';
import { fetchGitHubPRReviews, fetchGitHubMentions } from '@/lib/integrations/github';
import { upsertInboxItem, clearInboxItems } from '@/lib/db/queries/inbox';
import { createServiceClient } from '@/lib/db/client';
import { processContextFromScan } from '@/lib/context/pipeline';
import type { ContextPipelineInput } from '@/lib/context/types';
import type { ParsedGmailMessage } from '@/lib/integrations/gmail';
import type { ParsedOutlookMessage } from '@/lib/integrations/outlook';
import type { ParsedSlackMessage } from '@/lib/integrations/slack';

const anthropic = new Anthropic();

/** Feed processed items into the context memory pipeline (non-fatal on failure) */
async function feedContext(userId: string, provider: string, items: ContextPipelineInput[]) {
  if (items.length === 0) return;
  try {
    await processContextFromScan({ userId, provider, items });
  } catch {
    // Context enrichment is non-fatal — inbox ingestion still succeeds
  }
}

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

// ── TIER 1 — Email & Messaging ──────────────────────────────────────────────

export async function ingestGmailMessages(
  userId: string
): Promise<{ processed: number; found: number }> {
  const messageRefs = await fetchInboxMessages(userId, 20);
  const found = messageRefs.length;

  const supabase = createServiceClient();

  // Clear old Gmail inbox items so promotional/filtered items don't linger
  await clearInboxItems(supabase, userId, 'gmail');

  if (found === 0) {
    return { processed: 0, found: 0 };
  }

  let processed = 0;
  const contextItems: ContextPipelineInput[] = [];

  for (const ref of messageRefs) {
    if (!ref.id) continue;

    // Fetch full message for AI processing — body is NEVER stored
    const fullMessage = await fetchMessageForProcessing(userId, ref.id);
    const parsed = parseGmailMessage(fullMessage);

    // AI summarisation — sanitiseContent is called inside summariseGmailMessage
    const result = await summariseGmailMessage(parsed);

    // Skip promotional content that got through Gmail's category filter
    if (result.is_promotional) continue;

    const receivedAt = parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString();

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
    });

    // Collect for context memory pipeline
    contextItems.push({
      sourceId: parsed.id,
      sourceRef: { provider: 'gmail', message_id: parsed.id, thread_id: parsed.threadId },
      title: parsed.subject ?? 'No subject',
      rawContent: `From: ${parsed.fromName ?? parsed.from}\nSubject: ${parsed.subject}\n\n${parsed.body || parsed.snippet}`,
      occurredAt: receivedAt,
      people: [parsed.from].filter(Boolean),
      threadId: parsed.threadId,
      chunkType: 'email_thread',
    });

    processed++;
  }

  await feedContext(userId, 'gmail', contextItems);
  return { processed, found };
}

export async function ingestOutlookMessages(
  userId: string
): Promise<{ processed: number; found: number }> {
  const rawMessages = await fetchOutlookInbox(userId);
  const found = rawMessages.length;

  const supabase = createServiceClient();

  // Clear old Outlook inbox items so promotional/filtered items don't linger
  await clearInboxItems(supabase, userId, 'outlook');

  if (found === 0) {
    return { processed: 0, found: 0 };
  }

  let processed = 0;
  const contextItems: ContextPipelineInput[] = [];

  for (const raw of rawMessages) {
    const messageId = raw.id as string;
    if (!messageId) continue;

    // Fetch full message for AI processing — body is NEVER stored
    const fullMessage = await fetchOutlookMessageForProcessing(userId, messageId);
    const parsed = parseOutlookMessage(fullMessage);

    // AI summarisation — sanitiseContent is called inside summariseOutlookMessage
    const result = await summariseOutlookMessage(parsed);

    // Skip promotional content
    if (result.is_promotional) continue;

    const receivedAt = parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString();

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
      sentiment: result.sentiment as import('@/lib/db/types').MessageSentiment,
      received_at: receivedAt,
    });

    contextItems.push({
      sourceId: parsed.id,
      sourceRef: { provider: 'outlook', message_id: parsed.id, conversation_id: parsed.conversationId },
      title: parsed.subject ?? 'No subject',
      rawContent: `From: ${parsed.fromName ?? parsed.from}\nSubject: ${parsed.subject}\n\n${parsed.body || parsed.bodyPreview}`,
      occurredAt: receivedAt,
      people: [parsed.from].filter(Boolean),
      threadId: parsed.conversationId,
      chunkType: 'email_thread',
    });

    processed++;
  }

  await feedContext(userId, 'outlook', contextItems);
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
  const contextItems: ContextPipelineInput[] = [];

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
      sentiment: result.sentiment as import('@/lib/db/types').MessageSentiment,
      received_at: msg.date,
    });

    contextItems.push({
      sourceId: msg.id,
      sourceRef: { provider: 'slack', message_id: msg.id, thread_ts: msg.threadTs },
      title: `Slack DM from ${msg.fromName}`,
      rawContent: `From: ${msg.fromName}\n\n${msg.text}`,
      occurredAt: msg.date,
      people: [msg.from].filter(Boolean),
      threadId: msg.threadTs ?? undefined,
      chunkType: 'slack_conversation',
    });

    processed++;
  }

  await feedContext(userId, 'slack', contextItems);
  return { processed, found };
}

export async function ingestICloudMessages(
  userId: string
): Promise<{ processed: number; found: number }> {
  const messages = await fetchICloudInboxMessages(userId, 20);
  const found = messages.length;
  if (found === 0) return { processed: 0, found: 0 };

  const supabase = createServiceClient();
  let processed = 0;
  const contextItems: ContextPipelineInput[] = [];

  for (const msg of messages) {
    // ALWAYS sanitise before AI — body never stored
    const result = await summariseContent(
      msg.body || msg.snippet,
      'email',
      `icloud:${msg.id}`
    );

    const receivedAt = msg.date ? new Date(msg.date).toISOString() : new Date().toISOString();

    await upsertInboxItem(supabase, {
      user_id: userId,
      provider: 'apple_icloud_mail',
      external_id: msg.id,
      from_email: msg.from,
      from_name: msg.fromName,
      subject: msg.subject,
      ai_summary: result.summary,
      urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
      needs_reply: result.needs_reply,
      sentiment: result.sentiment as import('@/lib/db/types').MessageSentiment,
      received_at: receivedAt,
    });

    contextItems.push({
      sourceId: msg.id,
      sourceRef: { provider: 'apple_icloud_mail', message_id: msg.id },
      title: msg.subject ?? 'No subject',
      rawContent: `From: ${msg.fromName ?? msg.from}\nSubject: ${msg.subject}\n\n${msg.body || msg.snippet}`,
      occurredAt: receivedAt,
      people: [msg.from].filter(Boolean),
      chunkType: 'email_thread',
    });
    processed++;
  }

  await feedContext(userId, 'apple_icloud_mail', contextItems);
  return { processed, found };
}

export async function ingestCalendlyBookings(
  userId: string
): Promise<{ processed: number; found: number }> {
  const bookings = await fetchUpcomingBookings(userId, 20);
  const found = bookings.length;
  if (found === 0) return { processed: 0, found: 0 };

  const supabase = createServiceClient();
  let processed = 0;

  const contextItems: ContextPipelineInput[] = [];

  for (const booking of bookings) {
    const content = `Calendly booking: ${booking.name} with ${booking.guestName || 'Guest'} (${booking.guestEmail}). Starts: ${booking.startTime}. Location: ${booking.location || 'TBD'}.`;
    const result = await summariseContent(content, 'calendar_booking', `calendly:${booking.id}`);

    const receivedAt = booking.startTime ? new Date(booking.startTime).toISOString() : new Date().toISOString();

    await upsertInboxItem(supabase, {
      user_id: userId,
      provider: 'calendly',
      external_id: booking.id,
      from_email: booking.guestEmail || userId,
      from_name: booking.guestName || 'Calendly Guest',
      subject: booking.name,
      ai_summary: result.summary,
      urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
      needs_reply: false,
      sentiment: result.sentiment as import('@/lib/db/types').MessageSentiment,
      received_at: receivedAt,
    });

    contextItems.push({
      sourceId: booking.id,
      sourceRef: { provider: 'calendly', booking_id: booking.id },
      title: booking.name,
      rawContent: content,
      occurredAt: receivedAt,
      people: [booking.guestEmail].filter(Boolean),
      chunkType: 'calendar_event',
    });
    processed++;
  }

  await feedContext(userId, 'calendly', contextItems);
  return { processed, found };
}

export async function ingestTeamsMessages(
  userId: string
): Promise<{ processed: number; found: number }> {
  const messages = await fetchTeamsMessages(userId, 20);
  const found = messages.length;
  if (found === 0) return { processed: 0, found: 0 };

  const supabase = createServiceClient();
  let processed = 0;

  const contextItems: ContextPipelineInput[] = [];

  for (const msg of messages) {
    const result = await summariseContent(msg.body, 'teams_message', `teams:${msg.id}`);
    const title = msg.isDM ? `Teams DM from ${msg.fromName}` : `Teams message in ${msg.channelName}`;

    await upsertInboxItem(supabase, {
      user_id: userId,
      provider: 'microsoft_teams',
      external_id: msg.id,
      from_email: msg.from,
      from_name: msg.fromName,
      subject: title,
      ai_summary: result.summary,
      urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
      needs_reply: msg.isMention || msg.isDM,
      received_at: msg.date,
    });

    contextItems.push({
      sourceId: msg.id,
      sourceRef: { provider: 'microsoft_teams', message_id: msg.id },
      title,
      rawContent: `From: ${msg.fromName}\n\n${msg.body}`,
      occurredAt: msg.date,
      people: [msg.from].filter(Boolean),
      chunkType: 'slack_conversation',
    });
    processed++;
  }

  await feedContext(userId, 'microsoft_teams', contextItems);
  return { processed, found };
}

export async function ingestLinkedInMessages(
  userId: string
): Promise<{ processed: number; found: number }> {
  const messages = await fetchUnreadLinkedInMessages(userId, 20);
  const found = messages.length;
  if (found === 0) return { processed: 0, found: 0 };

  const supabase = createServiceClient();
  let processed = 0;

  const contextItems: ContextPipelineInput[] = [];

  for (const msg of messages) {
    const result = await summariseContent(msg.body, 'linkedin_message', `linkedin:${msg.id}`);

    await upsertInboxItem(supabase, {
      user_id: userId,
      provider: 'linkedin',
      external_id: msg.id,
      thread_id: msg.conversationId,
      from_email: msg.from,
      from_name: msg.fromName,
      subject: msg.subject,
      ai_summary: result.summary,
      urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
      needs_reply: msg.isUnread,
      received_at: msg.date,
    });

    contextItems.push({
      sourceId: msg.id,
      sourceRef: { provider: 'linkedin', message_id: msg.id, conversation_id: msg.conversationId },
      title: msg.subject ?? `LinkedIn message from ${msg.fromName}`,
      rawContent: `From: ${msg.fromName}\nSubject: ${msg.subject}\n\n${msg.body}`,
      occurredAt: msg.date,
      people: [msg.from].filter(Boolean),
      threadId: msg.conversationId,
      chunkType: 'email_thread',
    });
    processed++;
  }

  await feedContext(userId, 'linkedin', contextItems);
  return { processed, found };
}

export async function ingestTwitterDMs(
  userId: string
): Promise<{ processed: number; found: number }> {
  const dms = await fetchUnreadTwitterDMs(userId, 20);
  const found = dms.length;
  if (found === 0) return { processed: 0, found: 0 };

  const supabase = createServiceClient();
  let processed = 0;

  const contextItems: ContextPipelineInput[] = [];

  for (const dm of dms) {
    const result = await summariseContent(dm.body, 'twitter_dm', `twitter:${dm.id}`);

    await upsertInboxItem(supabase, {
      user_id: userId,
      provider: 'twitter',
      external_id: dm.id,
      thread_id: dm.conversationId,
      from_email: dm.fromUsername,
      from_name: dm.fromName,
      subject: `Twitter/X DM from @${dm.fromUsername}`,
      ai_summary: result.summary,
      urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
      needs_reply: true,
      sentiment: result.sentiment as import('@/lib/db/types').MessageSentiment,
      received_at: dm.date,
    });

    contextItems.push({
      sourceId: dm.id,
      sourceRef: { provider: 'twitter', message_id: dm.id, conversation_id: dm.conversationId },
      title: `Twitter/X DM from @${dm.fromUsername}`,
      rawContent: `From: ${dm.fromName} (@${dm.fromUsername})\n\n${dm.body}`,
      occurredAt: dm.date,
      people: [dm.fromUsername].filter(Boolean),
      threadId: dm.conversationId,
      chunkType: 'slack_conversation',
    });
    processed++;
  }

  await feedContext(userId, 'twitter', contextItems);
  return { processed, found };
}

// ── TIER 2 — Documents ──────────────────────────────────────────────────────

export async function ingestGoogleDriveDocuments(
  userId: string
): Promise<{ processed: number; found: number }> {
  const files = await listRecentDriveDocuments(userId, 30);
  const found = files.length;
  if (found === 0) return { processed: 0, found: 0 };

  const supabase = createServiceClient();
  let processed = 0;

  const contextItems: ContextPipelineInput[] = [];

  for (const file of files) {
    try {
      // Export text for AI — raw content NEVER stored
      const rawText = await exportDriveDocumentText(userId, file.id, file.mimeType);
      const result = await summariseContent(rawText, 'document', `gdrive:${file.id}`);

      await upsertInboxItem(supabase, {
        user_id: userId,
        provider: 'google_drive',
        external_id: file.id,
        from_email: userId,
        from_name: 'Google Drive',
        subject: file.name,
        ai_summary: result.summary,
        urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
        needs_reply: false,
        received_at: file.modifiedTime,
      });

      contextItems.push({
        sourceId: file.id,
        sourceRef: { provider: 'google_drive', file_id: file.id, mime_type: file.mimeType },
        title: file.name,
        rawContent: rawText,
        occurredAt: file.modifiedTime,
        people: [],
        chunkType: 'document_edit',
      });
      processed++;
    } catch {
      // Skip files that fail to export
    }
  }

  await feedContext(userId, 'google_drive', contextItems);
  return { processed, found };
}

export async function ingestDropboxDocuments(
  userId: string
): Promise<{ processed: number; found: number }> {
  const files = await listRecentDropboxFiles(userId, 30);
  const found = files.length;
  if (found === 0) return { processed: 0, found: 0 };

  const supabase = createServiceClient();
  let processed = 0;

  const contextItems: ContextPipelineInput[] = [];

  for (const file of files) {
    if (file.isFolder) continue;
    try {
      const rawText = await downloadDropboxFileText(userId, file.path);
      const result = await summariseContent(rawText, 'document', `dropbox:${file.id}`);

      await upsertInboxItem(supabase, {
        user_id: userId,
        provider: 'dropbox',
        external_id: file.id,
        from_email: userId,
        from_name: 'Dropbox',
        subject: file.name,
        ai_summary: result.summary,
        urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
        needs_reply: false,
        received_at: file.modifiedTime,
      });

      contextItems.push({
        sourceId: file.id,
        sourceRef: { provider: 'dropbox', file_id: file.id, path: file.path },
        title: file.name,
        rawContent: rawText,
        occurredAt: file.modifiedTime,
        people: [],
        chunkType: 'document_edit',
      });
      processed++;
    } catch {
      // Skip files that fail to download
    }
  }

  await feedContext(userId, 'dropbox', contextItems);
  return { processed, found };
}

export async function ingestOneDriveDocuments(
  userId: string
): Promise<{ processed: number; found: number }> {
  const files = await listRecentOneDriveFiles(userId, 30);
  const found = files.length;
  if (found === 0) return { processed: 0, found: 0 };

  const supabase = createServiceClient();
  let processed = 0;

  const contextItems: ContextPipelineInput[] = [];

  for (const file of files) {
    try {
      const rawText = await downloadOneDriveFileText(userId, file.id);
      const result = await summariseContent(rawText, 'document', `onedrive:${file.id}`);

      await upsertInboxItem(supabase, {
        user_id: userId,
        provider: 'onedrive',
        external_id: file.id,
        from_email: userId,
        from_name: 'OneDrive',
        subject: file.name,
        ai_summary: result.summary,
        urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
        needs_reply: false,
        received_at: file.modifiedTime,
      });

      contextItems.push({
        sourceId: file.id,
        sourceRef: { provider: 'onedrive', file_id: file.id },
        title: file.name,
        rawContent: rawText,
        occurredAt: file.modifiedTime,
        people: [],
        chunkType: 'document_edit',
      });
      processed++;
    } catch {
      // Skip files that fail to download
    }
  }

  await feedContext(userId, 'onedrive', contextItems);
  return { processed, found };
}

// ── TIER 2 — Task Management ────────────────────────────────────────────────

export async function ingestAsanaTasks(
  userId: string
): Promise<{ processed: number; found: number }> {
  const tasks = await fetchAssignedAsanaTasks(userId, 50);
  const found = tasks.length;
  if (found === 0) return { processed: 0, found: 0 };

  const supabase = createServiceClient();
  let processed = 0;

  const contextItems: ContextPipelineInput[] = [];

  for (const task of tasks) {
    const content = `Asana task: ${task.name}. Project: ${task.projectName}. Due: ${task.dueOn ?? 'No due date'}. Notes: ${task.notes.slice(0, 500)}`;
    const result = await summariseContent(content, 'task', `asana:${task.id}`);

    await upsertInboxItem(supabase, {
      user_id: userId,
      provider: 'asana',
      external_id: task.id,
      from_email: task.assigneeEmail || userId,
      from_name: task.assigneeName || 'Asana',
      subject: task.name,
      ai_summary: result.summary,
      urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
      needs_reply: false,
      sentiment: result.sentiment as import('@/lib/db/types').MessageSentiment,
      received_at: task.modifiedAt,
    });

    contextItems.push({
      sourceId: task.id,
      sourceRef: { provider: 'asana', task_id: task.id, project: task.projectName },
      title: task.name,
      rawContent: content,
      occurredAt: task.modifiedAt,
      people: [task.assigneeEmail].filter(Boolean),
      chunkType: 'task_update',
    });
    processed++;
  }

  await feedContext(userId, 'asana', contextItems);
  return { processed, found };
}

export async function ingestMondayItems(
  userId: string
): Promise<{ processed: number; found: number }> {
  const items = await fetchAssignedMondayItems(userId, 50);
  const found = items.length;
  if (found === 0) return { processed: 0, found: 0 };

  const supabase = createServiceClient();
  let processed = 0;

  const contextItems: ContextPipelineInput[] = [];

  for (const item of items) {
    const content = `Monday.com item: ${item.name}. Board: ${item.boardName}. Group: ${item.groupName}. Status: ${item.status}. Due: ${item.dueDate ?? 'No due date'}.`;
    const result = await summariseContent(content, 'task', `monday:${item.id}`);

    await upsertInboxItem(supabase, {
      user_id: userId,
      provider: 'monday',
      external_id: item.id,
      from_email: item.assigneeEmail || userId,
      from_name: item.assigneeName || 'Monday.com',
      subject: item.name,
      ai_summary: result.summary,
      urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
      needs_reply: false,
      sentiment: result.sentiment as import('@/lib/db/types').MessageSentiment,
      received_at: item.updatedAt,
    });

    contextItems.push({
      sourceId: item.id,
      sourceRef: { provider: 'monday', item_id: item.id, board: item.boardName },
      title: item.name,
      rawContent: content,
      occurredAt: item.updatedAt,
      people: [item.assigneeEmail].filter(Boolean),
      chunkType: 'task_update',
    });
    processed++;
  }

  await feedContext(userId, 'monday', contextItems);
  return { processed, found };
}

export async function ingestJiraIssues(
  userId: string
): Promise<{ processed: number; found: number }> {
  const issues = await fetchAssignedJiraIssues(userId, 50);
  const found = issues.length;
  if (found === 0) return { processed: 0, found: 0 };

  const supabase = createServiceClient();
  let processed = 0;

  const contextItems: ContextPipelineInput[] = [];

  for (const issue of issues) {
    const content = `Jira issue ${issue.key}: ${issue.summary}. Type: ${issue.issueType}. Priority: ${issue.priority}. Status: ${issue.status}. Project: ${issue.projectName}. Due: ${issue.dueDate ?? 'No due date'}. ${issue.description.slice(0, 300)}`;
    const result = await summariseContent(content, 'task', `jira:${issue.id}`);

    await upsertInboxItem(supabase, {
      user_id: userId,
      provider: 'jira',
      external_id: issue.id,
      from_email: issue.reporterEmail || userId,
      from_name: issue.reporterName || 'Jira',
      subject: `[${issue.key}] ${issue.summary}`,
      ai_summary: result.summary,
      urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
      needs_reply: false,
      sentiment: result.sentiment as import('@/lib/db/types').MessageSentiment,
      received_at: issue.updatedAt,
    });

    contextItems.push({
      sourceId: issue.id,
      sourceRef: { provider: 'jira', issue_id: issue.id, key: issue.key, project: issue.projectName },
      title: `[${issue.key}] ${issue.summary}`,
      rawContent: content,
      occurredAt: issue.updatedAt,
      people: [issue.reporterEmail].filter(Boolean),
      chunkType: 'task_update',
    });
    processed++;
  }

  await feedContext(userId, 'jira', contextItems);
  return { processed, found };
}

export async function ingestLinearIssues(
  userId: string
): Promise<{ processed: number; found: number }> {
  const issues = await fetchAssignedLinearIssues(userId, 50);
  const found = issues.length;
  if (found === 0) return { processed: 0, found: 0 };

  const supabase = createServiceClient();
  let processed = 0;

  const contextItems: ContextPipelineInput[] = [];

  for (const issue of issues) {
    const content = `Linear issue ${issue.identifier}: ${issue.title}. Team: ${issue.teamName}. Project: ${issue.projectName}. Status: ${issue.state}. Priority: ${issue.priorityLabel}. Due: ${issue.dueDate ?? 'No due date'}. ${issue.description.slice(0, 300)}`;
    const result = await summariseContent(content, 'task', `linear:${issue.id}`);

    await upsertInboxItem(supabase, {
      user_id: userId,
      provider: 'linear',
      external_id: issue.id,
      from_email: issue.assigneeEmail || userId,
      from_name: issue.assigneeName || 'Linear',
      subject: `[${issue.identifier}] ${issue.title}`,
      ai_summary: result.summary,
      urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
      needs_reply: false,
      sentiment: result.sentiment as import('@/lib/db/types').MessageSentiment,
      received_at: issue.updatedAt,
    });

    contextItems.push({
      sourceId: issue.id,
      sourceRef: { provider: 'linear', issue_id: issue.id, identifier: issue.identifier, project: issue.projectName },
      title: `[${issue.identifier}] ${issue.title}`,
      rawContent: content,
      occurredAt: issue.updatedAt,
      people: [issue.assigneeEmail].filter(Boolean),
      chunkType: 'task_update',
    });
    processed++;
  }

  await feedContext(userId, 'linear', contextItems);
  return { processed, found };
}

export async function ingestClickUpTasks(
  userId: string
): Promise<{ processed: number; found: number }> {
  const tasks = await fetchAssignedClickUpTasks(userId, 50);
  const found = tasks.length;
  if (found === 0) return { processed: 0, found: 0 };

  const supabase = createServiceClient();
  let processed = 0;

  const contextItems: ContextPipelineInput[] = [];

  for (const task of tasks) {
    const content = `ClickUp task: ${task.name}. Space: ${task.spaceName}. List: ${task.listName}. Status: ${task.status}. Priority: ${task.priority}. Due: ${task.dueDate ?? 'No due date'}. ${task.description.slice(0, 300)}`;
    const result = await summariseContent(content, 'task', `clickup:${task.id}`);

    await upsertInboxItem(supabase, {
      user_id: userId,
      provider: 'clickup',
      external_id: task.id,
      from_email: task.assigneeEmail || userId,
      from_name: task.assigneeName || 'ClickUp',
      subject: task.name,
      ai_summary: result.summary,
      urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
      needs_reply: false,
      sentiment: result.sentiment as import('@/lib/db/types').MessageSentiment,
      received_at: task.updatedAt,
    });

    contextItems.push({
      sourceId: task.id,
      sourceRef: { provider: 'clickup', task_id: task.id, space: task.spaceName },
      title: task.name,
      rawContent: content,
      occurredAt: task.updatedAt,
      people: [task.assigneeEmail].filter(Boolean),
      chunkType: 'task_update',
    });
    processed++;
  }

  await feedContext(userId, 'clickup', contextItems);
  return { processed, found };
}

export async function ingestTrelloCards(
  userId: string
): Promise<{ processed: number; found: number }> {
  const cards = await fetchAssignedTrelloCards(userId, 50);
  const found = cards.length;
  if (found === 0) return { processed: 0, found: 0 };

  const supabase = createServiceClient();
  let processed = 0;

  const contextItems: ContextPipelineInput[] = [];

  for (const card of cards) {
    if (card.closed) continue;
    const content = `Trello card: ${card.name}. Board: ${card.boardName}. List: ${card.listName}. Labels: ${card.labels.join(', ') || 'none'}. Due: ${card.dueDate ?? 'No due date'}. ${card.description.slice(0, 300)}`;
    const result = await summariseContent(content, 'task', `trello:${card.id}`);

    await upsertInboxItem(supabase, {
      user_id: userId,
      provider: 'trello',
      external_id: card.id,
      from_email: userId,
      from_name: 'Trello',
      subject: card.name,
      ai_summary: result.summary,
      urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
      needs_reply: false,
      sentiment: result.sentiment as import('@/lib/db/types').MessageSentiment,
      received_at: card.lastActivity,
    });

    contextItems.push({
      sourceId: card.id,
      sourceRef: { provider: 'trello', card_id: card.id, board: card.boardName },
      title: card.name,
      rawContent: content,
      occurredAt: card.lastActivity,
      people: [],
      chunkType: 'task_update',
    });
    processed++;
  }

  await feedContext(userId, 'trello', contextItems);
  return { processed, found };
}

// ── TIER 2 — CRM ────────────────────────────────────────────────────────────

export async function ingestHubSpotItems(
  userId: string
): Promise<{ processed: number; found: number }> {
  const [deals, tasks] = await Promise.all([
    fetchHubSpotDeals(userId, 25),
    fetchHubSpotTasks(userId, 25),
  ]);
  const found = deals.length + tasks.length;
  if (found === 0) return { processed: 0, found: 0 };

  const supabase = createServiceClient();
  let processed = 0;
  const contextItems: ContextPipelineInput[] = [];

  for (const deal of deals) {
    const content = `HubSpot deal: ${deal.name}. Stage: ${deal.stage}. Amount: ${deal.amount} ${deal.amount ? 'USD' : ''}. Close date: ${deal.closeDate ?? 'No close date'}.`;
    const result = await summariseContent(content, 'task', `hubspot-deal:${deal.id}`);

    await upsertInboxItem(supabase, {
      user_id: userId,
      provider: 'hubspot',
      external_id: `deal:${deal.id}`,
      from_email: userId,
      from_name: 'HubSpot',
      subject: deal.name,
      ai_summary: result.summary,
      urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
      needs_reply: false,
      sentiment: result.sentiment as import('@/lib/db/types').MessageSentiment,
      received_at: deal.lastModified,
    });

    contextItems.push({
      sourceId: `deal:${deal.id}`,
      sourceRef: { provider: 'hubspot', deal_id: deal.id, stage: deal.stage },
      title: deal.name,
      rawContent: content,
      occurredAt: deal.lastModified,
      people: [],
      chunkType: 'task_update',
    });
    processed++;
  }

  for (const task of tasks) {
    const content = `HubSpot task: ${task.subject}. Priority: ${task.priority}. Due: ${task.dueDate ?? 'No due date'}. ${task.body.slice(0, 300)}`;
    const result = await summariseContent(content, 'task', `hubspot-task:${task.id}`);

    await upsertInboxItem(supabase, {
      user_id: userId,
      provider: 'hubspot',
      external_id: `task:${task.id}`,
      from_email: userId,
      from_name: 'HubSpot',
      subject: task.subject,
      ai_summary: result.summary,
      urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
      needs_reply: false,
      sentiment: result.sentiment as import('@/lib/db/types').MessageSentiment,
      received_at: task.createdAt,
    });

    contextItems.push({
      sourceId: `task:${task.id}`,
      sourceRef: { provider: 'hubspot', task_id: task.id },
      title: task.subject,
      rawContent: content,
      occurredAt: task.createdAt,
      people: [],
      chunkType: 'task_update',
    });
    processed++;
  }

  await feedContext(userId, 'hubspot', contextItems);
  return { processed, found };
}

export async function ingestSalesforceItems(
  userId: string
): Promise<{ processed: number; found: number }> {
  const [opps, tasks] = await Promise.all([
    fetchSalesforceOpportunities(userId, 25),
    fetchSalesforceTasks(userId, 25),
  ]);
  const found = opps.length + tasks.length;
  if (found === 0) return { processed: 0, found: 0 };

  const supabase = createServiceClient();
  let processed = 0;
  const contextItems: ContextPipelineInput[] = [];

  for (const opp of opps) {
    const content = `Salesforce opportunity: ${opp.name}. Stage: ${opp.stage}. Amount: ${opp.amount}. Close date: ${opp.closeDate}. Account: ${opp.accountName}. Probability: ${opp.probability}%.`;
    const result = await summariseContent(content, 'task', `sf-opp:${opp.id}`);

    await upsertInboxItem(supabase, {
      user_id: userId,
      provider: 'salesforce',
      external_id: `opp:${opp.id}`,
      from_email: userId,
      from_name: 'Salesforce',
      subject: opp.name,
      ai_summary: result.summary,
      urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
      needs_reply: false,
      sentiment: result.sentiment as import('@/lib/db/types').MessageSentiment,
      received_at: opp.lastModified,
    });

    contextItems.push({
      sourceId: `opp:${opp.id}`,
      sourceRef: { provider: 'salesforce', opp_id: opp.id, stage: opp.stage, account: opp.accountName },
      title: opp.name,
      rawContent: content,
      occurredAt: opp.lastModified,
      people: [],
      chunkType: 'task_update',
    });
    processed++;
  }

  for (const task of tasks) {
    const content = `Salesforce task: ${task.subject}. Priority: ${task.priority}. Due: ${task.activityDate ?? 'No due date'}. Contact: ${task.whoName}. Related to: ${task.whatName}.`;
    const result = await summariseContent(content, 'task', `sf-task:${task.id}`);

    await upsertInboxItem(supabase, {
      user_id: userId,
      provider: 'salesforce',
      external_id: `task:${task.id}`,
      from_email: userId,
      from_name: 'Salesforce',
      subject: task.subject,
      ai_summary: result.summary,
      urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
      needs_reply: false,
      sentiment: result.sentiment as import('@/lib/db/types').MessageSentiment,
      received_at: task.createdAt,
    });

    contextItems.push({
      sourceId: `task:${task.id}`,
      sourceRef: { provider: 'salesforce', task_id: task.id, contact: task.whoName },
      title: task.subject,
      rawContent: content,
      occurredAt: task.createdAt,
      people: [task.whoName].filter(Boolean),
      chunkType: 'task_update',
    });
    processed++;
  }

  await feedContext(userId, 'salesforce', contextItems);
  return { processed, found };
}

export async function ingestPipedriveItems(
  userId: string
): Promise<{ processed: number; found: number }> {
  const [deals, activities] = await Promise.all([
    fetchPipedriveDeals(userId, 25),
    fetchPipedriveActivities(userId, 25),
  ]);
  const found = deals.length + activities.length;
  if (found === 0) return { processed: 0, found: 0 };

  const supabase = createServiceClient();
  let processed = 0;
  const contextItems: ContextPipelineInput[] = [];

  for (const deal of deals) {
    const content = `Pipedrive deal: ${deal.title}. Value: ${deal.value} ${deal.currency}. Status: ${deal.status}. Person: ${deal.personName}. Org: ${deal.orgName}. Expected close: ${deal.expectedCloseDate ?? 'No close date'}.`;
    const result = await summariseContent(content, 'task', `pipedrive-deal:${deal.id}`);

    await upsertInboxItem(supabase, {
      user_id: userId,
      provider: 'pipedrive',
      external_id: `deal:${deal.id}`,
      from_email: deal.personEmail || userId,
      from_name: deal.personName || 'Pipedrive',
      subject: deal.title,
      ai_summary: result.summary,
      urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
      needs_reply: false,
      sentiment: result.sentiment as import('@/lib/db/types').MessageSentiment,
      received_at: deal.updateTime,
    });

    contextItems.push({
      sourceId: `deal:${deal.id}`,
      sourceRef: { provider: 'pipedrive', deal_id: deal.id, org: deal.orgName },
      title: deal.title,
      rawContent: content,
      occurredAt: deal.updateTime,
      people: [deal.personEmail].filter(Boolean),
      chunkType: 'task_update',
    });
    processed++;
  }

  for (const activity of activities) {
    const content = `Pipedrive activity: ${activity.subject}. Type: ${activity.type}. Due: ${activity.dueDate ?? 'No due date'} ${activity.dueTime ?? ''}. Contact: ${activity.personName}. Deal: ${activity.dealTitle}. ${activity.note.slice(0, 300)}`;
    const result = await summariseContent(content, 'task', `pipedrive-activity:${activity.id}`);

    await upsertInboxItem(supabase, {
      user_id: userId,
      provider: 'pipedrive',
      external_id: `activity:${activity.id}`,
      from_email: activity.personEmail || userId,
      from_name: activity.personName || 'Pipedrive',
      subject: activity.subject,
      ai_summary: result.summary,
      urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
      needs_reply: false,
      sentiment: result.sentiment as import('@/lib/db/types').MessageSentiment,
      received_at: activity.addTime,
    });

    contextItems.push({
      sourceId: `activity:${activity.id}`,
      sourceRef: { provider: 'pipedrive', activity_id: activity.id, deal: activity.dealTitle },
      title: activity.subject,
      rawContent: content,
      occurredAt: activity.addTime,
      people: [activity.personEmail].filter(Boolean),
      chunkType: 'task_update',
    });
    processed++;
  }

  await feedContext(userId, 'pipedrive', contextItems);
  return { processed, found };
}

// ── TIER 2 — Code ───────────────────────────────────────────────────────────

export async function ingestGitHubItems(
  userId: string
): Promise<{ processed: number; found: number }> {
  const [prs, mentions] = await Promise.all([
    fetchGitHubPRReviews(userId, 20),
    fetchGitHubMentions(userId, 20),
  ]);
  const found = prs.length + mentions.length;
  if (found === 0) return { processed: 0, found: 0 };

  const supabase = createServiceClient();
  let processed = 0;
  const contextItems: ContextPipelineInput[] = [];

  for (const pr of prs) {
    const content = `GitHub PR review requested: [${pr.repoFullName}#${pr.number}] ${pr.title}. Author: ${pr.authorLogin}. Labels: ${pr.labels.join(', ') || 'none'}. Draft: ${pr.isDraft}. ${pr.body.slice(0, 500)}`;
    const result = await summariseContent(content, 'pull_request', `github-pr:${pr.id}`);

    await upsertInboxItem(supabase, {
      user_id: userId,
      provider: 'github',
      external_id: `pr:${pr.id}`,
      from_email: `${pr.authorLogin}@github`,
      from_name: pr.authorName || pr.authorLogin,
      subject: `[${pr.repoFullName}] PR #${pr.number}: ${pr.title}`,
      ai_summary: result.summary,
      urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
      needs_reply: true,
      sentiment: result.sentiment as import('@/lib/db/types').MessageSentiment,
      received_at: pr.updatedAt,
    });

    contextItems.push({
      sourceId: `pr:${pr.id}`,
      sourceRef: { provider: 'github', pr_id: pr.id, repo: pr.repoFullName, number: pr.number },
      title: `[${pr.repoFullName}] PR #${pr.number}: ${pr.title}`,
      rawContent: content,
      occurredAt: pr.updatedAt,
      people: [`${pr.authorLogin}@github`],
      chunkType: 'code_activity',
    });
    processed++;
  }

  for (const mention of mentions) {
    const content = `GitHub mention in ${mention.repoFullName}: ${mention.title}. Type: ${mention.type}. Author: ${mention.authorLogin}. ${mention.body.slice(0, 500)}`;
    const result = await summariseContent(content, 'pull_request', `github-mention:${mention.id}`);

    await upsertInboxItem(supabase, {
      user_id: userId,
      provider: 'github',
      external_id: `mention:${mention.id}`,
      from_email: `${mention.authorLogin}@github`,
      from_name: mention.authorLogin,
      subject: `Mentioned in [${mention.repoFullName}]: ${mention.title}`,
      ai_summary: result.summary,
      urgency_score: Math.min(10, Math.max(1, result.urgency_score)),
      needs_reply: false,
      sentiment: result.sentiment as import('@/lib/db/types').MessageSentiment,
      received_at: mention.createdAt,
    });

    contextItems.push({
      sourceId: `mention:${mention.id}`,
      sourceRef: { provider: 'github', mention_id: mention.id, repo: mention.repoFullName },
      title: `Mentioned in [${mention.repoFullName}]: ${mention.title}`,
      rawContent: content,
      occurredAt: mention.createdAt,
      people: [`${mention.authorLogin}@github`],
      chunkType: 'code_activity',
    });
    processed++;
  }

  await feedContext(userId, 'github', contextItems);
  return { processed, found };
}
