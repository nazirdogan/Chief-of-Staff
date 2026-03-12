import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createServiceClient } from '@/lib/db/client';
import { withAuth } from '@/lib/middleware/withAuth';
import type { AuthenticatedRequest } from '@/lib/middleware/withAuth';
import {
  getNotificationPreferences,
  updateNotificationPreference,
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from '@/lib/db/queries/notification-preferences';

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();
    const prefs = await getNotificationPreferences(supabase, req.user.id);
    return NextResponse.json({ data: prefs });
  } catch (err) {
    Sentry.captureException(err, { extra: { userId: req.user.id } });
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences', code: 'FETCH_ERROR' },
      { status: 500 },
    );
  }
});

export const PATCH = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const { category, enabled } = body as {
      category: unknown;
      enabled: unknown;
    };

    if (typeof category !== 'string' || typeof enabled !== 'boolean') {
      return NextResponse.json(
        {
          error: 'category (string) and enabled (boolean) are required',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 },
      );
    }

    const validCategories = NOTIFICATION_CATEGORIES.map((c) => c.id);
    if (!validCategories.includes(category as NotificationCategory)) {
      return NextResponse.json(
        { error: 'Invalid notification category', code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    await updateNotificationPreference(
      supabase,
      req.user.id,
      category as NotificationCategory,
      enabled,
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    Sentry.captureException(err, { extra: { userId: req.user.id } });
    return NextResponse.json(
      { error: 'Failed to update notification preference', code: 'UPDATE_ERROR' },
      { status: 500 },
    );
  }
});
