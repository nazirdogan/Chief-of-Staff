import { createServiceClient } from '@/lib/db/client';
import { listUserIntegrations } from '@/lib/db/queries/integrations';
import type { IntegrationProvider } from '@/lib/db/types';

export interface SyncResult {
  provider: IntegrationProvider;
  status: 'success' | 'skipped' | 'error';
  itemsFound?: number;
  itemsProcessed?: number;
  error?: string;
}

/**
 * Runs data ingestion for all connected integrations for a user.
 * This is the core "scrape" — it pulls data from Gmail, Calendar, Notion, etc.
 * into inbox_items, commitments, contacts, and document_chunks tables.
 *
 * Safe to call frequently — uses upsert so duplicate data is handled.
 */
export async function syncAllIntegrations(userId: string): Promise<SyncResult[]> {
  const supabase = createServiceClient();
  const integrations = await listUserIntegrations(supabase, userId);
  const connected = integrations.filter(i => i.status === 'connected');

  if (connected.length === 0) {
    return [];
  }

  const results: SyncResult[] = [];
  const connectedProviders = new Set(connected.map(i => i.provider));

  // ── Gmail: Ingest inbox + extract commitments from sent ──
  if (connectedProviders.has('gmail')) {
    try {
      const { ingestGmailMessages } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestGmailMessages(userId);
      results.push({
        provider: 'gmail',
        status: 'success',
        itemsFound: result.found,
        itemsProcessed: result.processed,
      });
    } catch (err) {
      results.push({
        provider: 'gmail',
        status: 'error',
        error: err instanceof Error ? err.message : 'Gmail sync failed',
      });
    }

    // Also extract commitments from sent messages
    try {
      const { extractCommitmentsFromGmail } = await import('@/lib/ai/agents/commitment');
      const { getGmailClient } = await import('@/lib/integrations/gmail');
      const gmail = await getGmailClient(userId);
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 15,
        labelIds: ['SENT'],
        q: 'newer_than:1d',
      });
      const messageIds = (response.data.messages ?? [])
        .map(m => m.id)
        .filter((id): id is string => !!id);
      if (messageIds.length > 0) {
        await extractCommitmentsFromGmail(userId, messageIds);
      }
    } catch {
      // Commitment extraction is best-effort — don't fail the sync
    }
  }

  // ── Slack: Ingest DMs ──
  if (connectedProviders.has('slack')) {
    try {
      const { ingestSlackDMs } = await import('@/lib/ai/agents/ingestion');
      const result = await ingestSlackDMs(userId);
      results.push({
        provider: 'slack',
        status: 'success',
        itemsFound: result.found,
        itemsProcessed: result.processed,
      });
    } catch (err) {
      results.push({
        provider: 'slack',
        status: 'error',
        error: err instanceof Error ? err.message : 'Slack sync failed',
      });
    }
  }

  // ── Google Calendar: Events are read live at briefing time, but we verify access ──
  if (connectedProviders.has('google_calendar')) {
    try {
      const { getTodaysParsedEvents } = await import('@/lib/integrations/google-calendar');
      const events = await getTodaysParsedEvents(userId);
      results.push({
        provider: 'google_calendar',
        status: 'success',
        itemsFound: events.length,
        itemsProcessed: events.length,
      });
    } catch (err) {
      results.push({
        provider: 'google_calendar',
        status: 'error',
        error: err instanceof Error ? err.message : 'Google Calendar sync failed',
      });
    }
  }

  // ── Notion: Index pages into document_chunks ──
  if (connectedProviders.has('notion')) {
    try {
      const { listRecentPages, chunkPageContent } = await import('@/lib/integrations/notion');
      const { generateEmbedding } = await import('@/lib/ai/embeddings');
      const pages = await listRecentPages(userId, 20);
      let chunksIndexed = 0;

      for (const page of pages) {
        const chunks = chunkPageContent(page);
        for (const chunk of chunks) {
          try {
            const embedding = await generateEmbedding(chunk.content);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from('document_chunks')
              .upsert(
                {
                  user_id: userId,
                  provider: 'notion',
                  source_id: chunk.pageId,
                  chunk_index: chunk.chunkIndex,
                  content_summary: chunk.content,
                  embedding,
                  metadata: {
                    title: chunk.pageTitle,
                    url: chunk.pageUrl,
                    last_edited_time: chunk.lastEditedTime,
                  },
                  expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
                },
                { onConflict: 'user_id,provider,source_id,chunk_index' }
              );
            chunksIndexed++;
          } catch {
            // Skip failed chunks
          }
        }
      }

      results.push({
        provider: 'notion',
        status: 'success',
        itemsFound: pages.length,
        itemsProcessed: chunksIndexed,
      });
    } catch (err) {
      results.push({
        provider: 'notion',
        status: 'error',
        error: err instanceof Error ? err.message : 'Notion sync failed',
      });
    }
  }

  // ── Relationship scoring (runs after all ingestion) ──
  try {
    const { computeRelationshipUpdates } = await import('@/lib/ai/agents/relationship');
    const { getAllContactsForScoring, updateContact } = await import('@/lib/db/queries/contacts');
    const contacts = await getAllContactsForScoring(supabase, userId);
    if (contacts.length > 0) {
      const updates = computeRelationshipUpdates(contacts);
      for (const update of updates) {
        await updateContact(supabase, userId, update.contactId, {
          relationship_score: update.newScore,
          is_cold: update.isCold,
          cold_flagged_at: update.coldFlaggedAt,
        });
      }
    }
  } catch {
    // Relationship scoring is best-effort
  }

  return results;
}
