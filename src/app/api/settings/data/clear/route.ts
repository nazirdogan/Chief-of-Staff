import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';

type ClearWindow = 'hour' | 'day' | 'week' | 'all';

const WINDOW_OFFSETS: Record<Exclude<ClearWindow, 'all'>, string> = {
  hour: '1 hour',
  day:  '1 day',
  week: '7 days',
};

// Tables that are safe to time-window delete by created_at / started_at
const TIMESTAMPED_TABLES = [
  { table: 'activity_sessions',    col: 'started_at' },
  { table: 'app_transitions',      col: 'created_at' },
  { table: 'day_narratives',       col: 'created_at' },
  { table: 'briefing_items',       col: 'created_at' },
  { table: 'briefings',            col: 'created_at' },
  { table: 'inbox_items',          col: 'created_at' },
  { table: 'context_chunks',       col: 'created_at' },
  { table: 'context_threads',      col: 'created_at' },
  { table: 'chat_messages',        col: 'created_at' },
  { table: 'chat_conversations',   col: 'created_at' },
  { table: 'catch_up_sessions',    col: 'created_at' },
  { table: 'desktop_sessions',     col: 'created_at' },
  { table: 'memory_snapshots',     col: 'created_at' },
  { table: 'working_patterns',     col: 'created_at' },
] as const;

export const DELETE = withAuth(withRateLimit(5, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const window = searchParams.get('window') as ClearWindow | null;

    if (!window || !['hour', 'day', 'week', 'all'].includes(window)) {
      return NextResponse.json(
        { error: 'window must be one of: hour, day, week, all', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const userId = req.user.id;
    const errors: string[] = [];

    for (const { table, col } of TIMESTAMPED_TABLES) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any).from(table).delete().eq('user_id', userId);

      if (window !== 'all') {
        const cutoff = new Date(
          Date.now() - parseDuration(WINDOW_OFFSETS[window])
        ).toISOString();
        query = query.gte(col, cutoff);
      }

      const { error } = await query;
      if (error) {
        // Log but continue — partial clears are better than total failure
        console.error(`[clear-data] Failed to clear ${table}:`, error.message);
        errors.push(table);
      }
    }

    if (errors.length === TIMESTAMPED_TABLES.length) {
      return NextResponse.json(
        { error: 'Failed to clear any data', code: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        window,
        cleared_tables: TIMESTAMPED_TABLES.length - errors.length,
        failed_tables: errors,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}));

function parseDuration(interval: string): number {
  if (interval === '1 hour')  return 60 * 60 * 1000;
  if (interval === '1 day')   return 24 * 60 * 60 * 1000;
  if (interval === '7 days')  return 7 * 24 * 60 * 60 * 1000;
  return 0;
}
