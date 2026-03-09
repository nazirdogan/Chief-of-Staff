import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import type { AuthenticatedRequest } from './withAuth';

const redis = Redis.fromEnv();

export function withRateLimit(
  limit: number,
  window: `${number} ${'s' | 'm' | 'h' | 'd'}`,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
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
      // If rate limiter fails (e.g. Redis connection issue), log and continue
      console.error('[RATE_LIMIT] Redis error, skipping rate limit:', err instanceof Error ? err.message : err);
    }

    return handler(req);
  };
}
