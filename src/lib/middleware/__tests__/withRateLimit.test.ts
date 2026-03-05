import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import type { AuthenticatedRequest } from '../withAuth';

// Mock Upstash Redis and Ratelimit
const mockLimit = vi.fn();

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn(() => ({})),
  },
}));

vi.mock('@upstash/ratelimit', () => {
  function MockRatelimit() {
    return { limit: mockLimit };
  }
  MockRatelimit.slidingWindow = vi.fn().mockReturnValue('sliding-window-config');
  return { Ratelimit: MockRatelimit };
});

// Import after mocks are set up
import { withRateLimit } from '../withRateLimit';

function makeAuthenticatedRequest(
  url = 'http://localhost/api/test',
  userId = 'user-123'
): AuthenticatedRequest {
  const req = new Request(url) as unknown as AuthenticatedRequest;
  req.user = { id: userId, email: 'test@example.com', tier: 'free' as const };
  Object.defineProperty(req, 'nextUrl', {
    get: () => new URL(url),
  });
  return req;
}

describe('withRateLimit middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows request when under rate limit', async () => {
    mockLimit.mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60000,
    });

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withRateLimit(60, '1 m', handler);
    const response = await wrapped(makeAuthenticatedRequest());

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockLimit.mockResolvedValue({
      success: false,
      limit: 60,
      remaining: 0,
      reset: Date.now() + 30000,
    });

    const handler = vi.fn();
    const wrapped = withRateLimit(60, '1 m', handler);
    const response = await wrapped(makeAuthenticatedRequest());

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.code).toBe('RATE_LIMITED');
    expect(handler).not.toHaveBeenCalled();
  });

  it('includes rate limit headers in 429 response', async () => {
    mockLimit.mockResolvedValue({
      success: false,
      limit: 60,
      remaining: 0,
      reset: 1700000000,
    });

    const handler = vi.fn();
    const wrapped = withRateLimit(60, '1 m', handler);
    const response = await wrapped(makeAuthenticatedRequest());

    expect(response.headers.get('X-RateLimit-Limit')).toBe('60');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response.headers.get('X-RateLimit-Reset')).toBe('1700000000');
  });

  it('uses user ID as rate limit identifier', async () => {
    mockLimit.mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now(),
    });

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withRateLimit(60, '1 m', handler);
    await wrapped(makeAuthenticatedRequest('http://localhost/api/test', 'user-abc'));

    expect(mockLimit).toHaveBeenCalledWith('/api/test:user-abc');
  });
});
