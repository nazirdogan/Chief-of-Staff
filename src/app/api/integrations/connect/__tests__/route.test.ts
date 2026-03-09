/**
 * Tests for POST /api/integrations/connect
 *
 * Key behaviours verified:
 * 1. Returns a session token quickly — NO setupGmailWatch call during connect
 *    (setupGmailWatch would fail and add latency because the OAuth token doesn't
 *    exist yet; that's the root cause of the popup-blocker bug)
 * 2. Validates the provider param
 * 3. Returns the expected response shape
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Env ──────────────────────────────────────────────────────────────────────
vi.mock('@/lib/config', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'service',
    ANTHROPIC_API_KEY: 'sk-ant-test',
    OPENAI_API_KEY: 'sk-test',
    ENCRYPTION_KEY: 'a'.repeat(64),
    NANGO_SECRET_KEY: 'nango-test',
    UPSTASH_REDIS_REST_URL: 'http://localhost:6379',
    UPSTASH_REDIS_REST_TOKEN: 'token',
  },
}));

// ── Auth middleware ───────────────────────────────────────────────────────────
const mockUser = { id: 'user-123', email: 'test@example.com' };
vi.mock('@/lib/middleware/withAuth', () => ({
  withAuth: (handler: (req: unknown) => unknown) =>
    (req: unknown) => {
      (req as Record<string, unknown>).user = mockUser;
      return handler(req);
    },
}));

// ── Rate limit middleware (passthrough) ───────────────────────────────────────
vi.mock('@/lib/middleware/withRateLimit', () => ({
  withRateLimit: (_limit: number, _window: string, handler: (req: unknown) => unknown) => handler,
}));

// ── Nango ─────────────────────────────────────────────────────────────────────
const mockCreateConnectSession = vi.fn().mockResolvedValue('nango-session-token-abc');
vi.mock('@/lib/integrations/nango', () => ({
  createConnectSession: (...args: unknown[]) => mockCreateConnectSession(...args),
}));

// ── setupGmailWatch — should NOT be called from the connect route ─────────────
const mockSetupGmailWatch = vi.fn();
vi.mock('@/lib/integrations/gmail', () => ({
  setupGmailWatch: (...args: unknown[]) => mockSetupGmailWatch(...args),
}));

// ── handleApiError ────────────────────────────────────────────────────────────
vi.mock('@/lib/api-utils', () => ({
  handleApiError: (err: unknown) => {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  },
}));

// ── Import route AFTER all mocks ──────────────────────────────────────────────
import { POST } from '../route';

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/integrations/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/integrations/connect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns sessionToken for a valid provider', async () => {
    const req = makeRequest({ provider: 'google-mail' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sessionToken).toBe('nango-session-token-abc');
    expect(body.provider).toBe('google-mail');
    expect(body.dbProvider).toBe('gmail');
    expect(mockCreateConnectSession).toHaveBeenCalledWith(
      mockUser.id,
      'google-mail',
      ['https://www.googleapis.com/auth/gmail.readonly'],
    );
  });

  it('does NOT call setupGmailWatch (OAuth token does not exist yet)', async () => {
    const req = makeRequest({ provider: 'google-mail' });
    await POST(req);
    expect(mockSetupGmailWatch).not.toHaveBeenCalled();
  });

  it('returns 400 for an unknown provider', async () => {
    const req = makeRequest({ provider: 'unknown-service' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when provider is missing', async () => {
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('works for google-calendar', async () => {
    const req = makeRequest({ provider: 'google-calendar' });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.dbProvider).toBe('google_calendar');
    expect(mockSetupGmailWatch).not.toHaveBeenCalled();
  });
});
