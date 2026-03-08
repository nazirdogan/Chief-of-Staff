import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { isAppError } from '@/lib/errors';

/**
 * Standard error response handler for API routes.
 * Logs to Sentry in production, returns consistent error shape.
 */
export function handleApiError(error: unknown): NextResponse {
  if (isAppError(error)) {
    // App errors are expected — only report 500+ to Sentry
    if (error.statusCode >= 500) {
      Sentry.captureException(error);
    }
    return NextResponse.json(error.toJSON(), { status: error.statusCode });
  }

  // Unexpected error — always report to Sentry
  Sentry.captureException(error);
  const errorDetail = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null
      ? JSON.stringify(error)
      : String(error);
  console.error('[API] Unexpected error:', errorDetail);

  return NextResponse.json(
    { error: 'Internal server error', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}
