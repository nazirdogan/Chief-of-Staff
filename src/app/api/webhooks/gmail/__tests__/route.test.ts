/**
 * Tests for POST /api/webhooks/gmail (Google Pub/Sub push handler)
 *
 * Key behaviours:
 * 1. Always returns 200 (Pub/Sub retries on non-200 → duplicates)
 * 2. Ignores messages for unknown email addresses
 * 3. Calls setupGmailWatch + saves historyId when no historyId is stored yet
 * 4. Calls setupGmailWatch when historyId is stale (fetchNewMessages returns empty newHistoryId)
 * 5. Processes new messages and advances the stored historyId
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Config ────────────────────────────────────────────────────────────────────
vi.mock('@/lib/config', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'service',
    ANTHROPIC_API_KEY: 'sk-ant-test',
    OPENAI_API_KEY: 'sk-test',
    ENCRYPTION_KEY: 'a'.repeat(64),
    NANGO_SECRET_KEY: 'nango-test',
    GOOGLE_PUBSUB_TOPIC: 'projects/test/topics/gmail',
    UPSTASH_REDIS_REST_URL: 'http://localhost:6379',
    UPSTASH_REDIS_REST_TOKEN: 'token',
  },
}));

// ── Supabase service client ───────────────────────────────────────────────────
const mockSingle = vi.fn();
const mockEq = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnThis();
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect, eq: mockEq, single: mockSingle });
const mockServiceClient = { from: mockFrom };

vi.mock('@/lib/db/client', () => ({
  createServiceClient: () => mockServiceClient,
}));

// ── Gmail functions ───────────────────────────────────────────────────────────
const mockSetupGmailWatch = vi.fn().mockResolvedValue({ historyId: '99999', expiration: '9999999999' });
const mockFetchNewMessages = vi.fn().mockResolvedValue({ messages: [], newHistoryId: '12346' });

vi.mock('@/lib/integrations/gmail', () => ({
  setupGmailWatch: (...args: unknown[]) => mockSetupGmailWatch(...args),
  fetchNewMessagesSinceHistory: (...args: unknown[]) => mockFetchNewMessages(...args),
}));

// ── DB query helpers ──────────────────────────────────────────────────────────
const mockSaveGmailHistoryId = vi.fn().mockResolvedValue(undefined);
const mockGetGmailHistoryId = vi.fn().mockResolvedValue('12345');

vi.mock('@/lib/db/queries/integrations', () => ({
  saveGmailHistoryId: (...args: unknown[]) => mockSaveGmailHistoryId(...args),
  getGmailHistoryId: (...args: unknown[]) => mockGetGmailHistoryId(...args),
}));

// ── Ingestion agent ───────────────────────────────────────────────────────────
const mockIngestGmailMessageRefs = vi.fn().mockResolvedValue({ processed: 0 });

vi.mock('@/lib/ai/agents/ingestion', () => ({
  ingestGmailMessageRefs: (...args: unknown[]) => mockIngestGmailMessageRefs(...args),
}));

// ── Import route AFTER mocks ──────────────────────────────────────────────────
import { POST } from '../route';

function makePubSubRequest(emailAddress: string, historyId = 12345): NextRequest {
  const data = Buffer.from(JSON.stringify({ emailAddress, historyId })).toString('base64');
  return new NextRequest('http://localhost/api/webhooks/gmail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { data, messageId: 'msg-1', publishTime: new Date().toISOString() } }),
  });
}

describe('POST /api/webhooks/gmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user found — include id and nango_connection_id as route now selects them
    mockSingle.mockResolvedValue({ data: { user_id: 'user-123', id: 'integration-456', nango_connection_id: 'nango-conn-789' } });
    // Default: historyId stored
    mockGetGmailHistoryId.mockResolvedValue('12345');
    // Default: fetch returns new messages
    mockFetchNewMessages.mockResolvedValue({ messages: [], newHistoryId: '12346' });
    // Default: setupGmailWatch
    mockSetupGmailWatch.mockResolvedValue({ historyId: '99999', expiration: '9999999999' });
  });

  it('always returns 200', async () => {
    const res = await POST(makePubSubRequest('test@gmail.com'));
    expect(res.status).toBe(200);
  });

  it('returns 200 and does nothing for unknown email (no user)', async () => {
    mockSingle.mockResolvedValue({ data: null });
    const res = await POST(makePubSubRequest('nobody@gmail.com'));
    expect(res.status).toBe(200);
    expect(mockSetupGmailWatch).not.toHaveBeenCalled();
    expect(mockGetGmailHistoryId).not.toHaveBeenCalled();
  });

  it('returns 200 for malformed body (no message data)', async () => {
    const req = new NextRequest('http://localhost/api/webhooks/gmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: 'projects/test/subscriptions/gmail' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('calls setupGmailWatch + saves historyId when no historyId is stored', async () => {
    mockGetGmailHistoryId.mockResolvedValue(null);
    const res = await POST(makePubSubRequest('test@gmail.com'));
    expect(res.status).toBe(200);
    // Route passes userId + nangoConnectionId to setupGmailWatch
    expect(mockSetupGmailWatch).toHaveBeenCalledWith('user-123', 'nango-conn-789');
    // Route scopes historyId storage to integrationId, not userId
    expect(mockSaveGmailHistoryId).toHaveBeenCalledWith(
      mockServiceClient, 'integration-456', '99999', '9999999999',
    );
    // Should NOT try to fetch messages — we need a baseline historyId first
    expect(mockFetchNewMessages).not.toHaveBeenCalled();
  });

  it('calls setupGmailWatch when history is stale (410 — empty newHistoryId)', async () => {
    mockGetGmailHistoryId.mockResolvedValue('00001');
    mockFetchNewMessages.mockResolvedValue({ messages: [], newHistoryId: '' });

    const res = await POST(makePubSubRequest('test@gmail.com'));
    expect(res.status).toBe(200);
    expect(mockSetupGmailWatch).toHaveBeenCalledWith('user-123', 'nango-conn-789');
    expect(mockSaveGmailHistoryId).toHaveBeenCalledWith(
      mockServiceClient, 'integration-456', '99999', '9999999999',
    );
  });

  it('processes new messages and advances historyId', async () => {
    const newMessages = [
      { id: 'msg-a', threadId: 'thread-1' },
      { id: 'msg-b', threadId: 'thread-2' },
    ];
    mockFetchNewMessages.mockResolvedValue({ messages: newMessages, newHistoryId: '12350' });

    const res = await POST(makePubSubRequest('test@gmail.com'));
    expect(res.status).toBe(200);
    // Route now passes nangoConnectionId and integrationId as extra args
    expect(mockIngestGmailMessageRefs).toHaveBeenCalledWith(
      'user-123', newMessages, 'nango-conn-789', 'integration-456',
    );
    // historyId scoped to integrationId, no expiration on a delta save
    expect(mockSaveGmailHistoryId).toHaveBeenCalledWith(
      mockServiceClient, 'integration-456', '12350',
    );
  });

  it('does NOT call ingestGmailMessageRefs when there are no new messages', async () => {
    mockFetchNewMessages.mockResolvedValue({ messages: [], newHistoryId: '12346' });
    await POST(makePubSubRequest('test@gmail.com'));
    expect(mockIngestGmailMessageRefs).not.toHaveBeenCalled();
    // But still advances historyId (scoped to integrationId)
    expect(mockSaveGmailHistoryId).toHaveBeenCalledWith(
      mockServiceClient, 'integration-456', '12346',
    );
  });
});
