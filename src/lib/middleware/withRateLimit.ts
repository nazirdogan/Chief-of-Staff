import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import type { AuthenticatedRequest } from './withAuth';

const redis = Redis.fromEnv();

/**
 * Rate-limit middleware for authenticated routes.
 *
 * @param limit     Max requests allowed in the window.
 * @param window    Sliding window duration (e.g. '1 m', '1 h').
 * @param handler   The route handler to wrap.
 * @param failOpen  If true, allows requests through when Redis is unreachable.
 *                  Defaults to false (fail closed — returns 503).
 */
export function withRateLimit(
  limit: number,
  window: `${number} ${'s' | 'm' | 'h' | 'd'}`,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  failOpen: boolean = false
) {
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
  });

  return async (req: AuthenticatedRequest): Promise<NextResponse> => {
    const identifier = req.user.id;
    try {
      const {
        success,
        limit: l,
        reset,
        remaining,
      } = await ratelimit.limit(`${req.nextUrl.pathname}:${identifier}`);

      if (!success) {
        return NextResponse.json(
          { error: 'Too many requests', code: 'RATE_LIMITED' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': l.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString(),
            },
          }
        );
      }
    } catch (err) {
      console.error('[RATE_LIMIT] Redis error:', err instanceof Error ? err.message : err);
      if (!failOpen) {
        return NextResponse.json(
          { error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE' },
          { status: 503 }
        );
      }
      // failOpen=true — log and continue
    }

    return handler(req);
  };
}

/**
 * IP-based rate-limit middleware for public webhook endpoints.
 * Uses the client IP (from x-forwarded-for or x-real-ip) as the identifier
 * instead of a user ID.
 *
 * @param limit   Max requests allowed in the window.
 * @param window  Sliding window duration.
 * @param handler The route handler to wrap.
 */
export function withWebhookRateLimit(
  limit: number,
  window: `${number} ${'s' | 'm' | 'h' | 'd'}`,
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
  });

  return async (req: NextRequest): Promise<NextResponse> => {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';

    try {
      const { success } = await ratelimit.limit(`webhook:${req.nextUrl.pathname}:${ip}`);

      if (!success) {
        return NextResponse.json(
          { error: 'Too many requests', code: 'RATE_LIMITED' },
          { status: 429 }
        );
      }
    } catch (err) {
      // Webhooks fail closed — reject when Redis is unreachable
      console.error('[WEBHOOK_RATE_LIMIT] Redis error:', err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE' },
        { status: 503 }
      );
    }

    return handler(req);
  };
}
