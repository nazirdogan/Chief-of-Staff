import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '../withAuth';

// Mock Supabase SSR
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  })),
}));

import { createServerClient } from '@supabase/ssr';

function makeRequest(url = 'http://localhost/api/test'): NextRequest {
  return new NextRequest(new URL(url));
}

describe('withAuth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no auth session exists', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('No session'),
        }),
      },
      from: vi.fn(),
    };
    vi.mocked(createServerClient).mockReturnValue(mockSupabase as never);

    const handler = vi.fn();
    const wrapped = withAuth(handler);
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe('AUTH_REQUIRED');
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 401 when getUser returns an error', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid token' },
        }),
      },
      from: vi.fn(),
    };
    vi.mocked(createServerClient).mockReturnValue(mockSupabase as never);

    const handler = vi.fn();
    const wrapped = withAuth(handler);
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('calls handler with user data when authenticated', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { subscription_tier: 'pro' },
            }),
          })),
        })),
      })),
    };
    vi.mocked(createServerClient).mockReturnValue(mockSupabase as never);

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAuth(handler);
    await wrapped(makeRequest());

    expect(handler).toHaveBeenCalledTimes(1);
    const calledReq = handler.mock.calls[0][0] as AuthenticatedRequest;
    expect(calledReq.user.id).toBe('user-123');
    expect(calledReq.user.email).toBe('test@example.com');
    expect(calledReq.user.tier).toBe('pro');
  });

  it('defaults tier to free when profile not found', async () => {
    const mockUser = { id: 'user-456', email: 'free@example.com' };
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null }),
          })),
        })),
      })),
    };
    vi.mocked(createServerClient).mockReturnValue(mockSupabase as never);

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAuth(handler);
    await wrapped(makeRequest());

    const calledReq = handler.mock.calls[0][0] as AuthenticatedRequest;
    expect(calledReq.user.tier).toBe('free');
  });
});
