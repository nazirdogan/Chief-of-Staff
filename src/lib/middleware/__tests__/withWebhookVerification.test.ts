import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Set env vars before importing
const TEST_NANGO_SECRET = 'test-nango-webhook-secret';

vi.stubEnv('NANGO_WEBHOOK_SECRET', TEST_NANGO_SECRET);

import { verifyNangoWebhook } from '../withWebhookVerification';

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL('http://localhost/api/webhooks/test'), {
    headers,
  });
}

describe('verifyNangoWebhook', () => {
  beforeEach(() => {
    vi.stubEnv('NANGO_WEBHOOK_SECRET', TEST_NANGO_SECRET);
  });

  it('returns true when HMAC signature is valid', () => {
    const body = JSON.stringify({ type: 'auth', connectionId: 'user-1' });
    const expectedSig = crypto
      .createHmac('sha256', TEST_NANGO_SECRET)
      .update(body)
      .digest('hex');

    const req = makeRequest({ 'X-Nango-Signature': expectedSig });
    expect(verifyNangoWebhook(req, body)).toBe(true);
  });

  it('returns false when signature is missing', () => {
    const body = JSON.stringify({ type: 'auth' });
    const req = makeRequest();
    expect(verifyNangoWebhook(req, body)).toBe(false);
  });

  it('returns false when signature is invalid', () => {
    const body = JSON.stringify({ type: 'auth' });
    const req = makeRequest({ 'X-Nango-Signature': 'deadbeef' });
    expect(verifyNangoWebhook(req, body)).toBe(false);
  });

  it('returns false when body has been tampered with', () => {
    const originalBody = JSON.stringify({ type: 'auth', connectionId: 'user-1' });
    const sig = crypto
      .createHmac('sha256', TEST_NANGO_SECRET)
      .update(originalBody)
      .digest('hex');

    const tamperedBody = JSON.stringify({ type: 'auth', connectionId: 'user-2' });
    const req = makeRequest({ 'X-Nango-Signature': sig });
    expect(verifyNangoWebhook(req, tamperedBody)).toBe(false);
  });
});
