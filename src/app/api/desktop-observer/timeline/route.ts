import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { createServiceClient } from '@/lib/db/client';
import { getSessionsInRange } from '@/lib/db/queries/activity-sessions';
import { getDayNarrative } from '@/lib/db/queries/day-narratives';
import type { AppCategory } from '@/lib/context/types';

/**
 * GET /api/desktop-observer/timeline
 *
 * Returns the activity timeline for a given date range, including:
 * - Activity sessions (grouped by app category)
 * - Day narrative (rolling summary)
 * - Activity stats
 *
 * Query params:
 *   date - ISO date (YYYY-MM-DD), defaults to today
 *   category - Filter by app category (email, chat, code, etc.)
 *   limit - Max sessions to return (default 100)
 */
export const GET = withAuth(
  withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
    try {
      const url = new URL(req.url);
      const dateParam = url.searchParams.get('date');
      const category = url.searchParams.get('category') as AppCategory | null;
      const limit = parseInt(url.searchParams.get('limit') ?? '100', 10);

      const date = dateParam ?? new Date().toISOString().split('T')[0];
      const dayStart = `${date}T00:00:00.000Z`;
      const dayEnd = `${date}T23:59:59.999Z`;

      const supabase = createServiceClient();
      const userId = req.user.id;

      const [sessions, narrative] = await Promise.all([
        getSessionsInRange(supabase, userId, dayStart, dayEnd, {
          category: category ?? undefined,
          limit,
        }),
        getDayNarrative(supabase, userId, date),
      ]);

      // Compute stats from sessions
      const stats = {
        sessionCount: sessions.length,
        totalActiveMinutes: 0,
        byCategory: {} as Record<string, { count: number; minutes: number }>,
        people: new Set<string>(),
        projects: new Set<string>(),
      };

      for (const s of sessions) {
        const durationMin = s.ended_at
          ? Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000)
          : Math.round((Date.now() - new Date(s.started_at).getTime()) / 60000);

        stats.totalActiveMinutes += durationMin;

        if (!stats.byCategory[s.app_category]) {
          stats.byCategory[s.app_category] = { count: 0, minutes: 0 };
        }
        stats.byCategory[s.app_category].count++;
        stats.byCategory[s.app_category].minutes += durationMin;

        for (const p of s.people) stats.people.add(p);
        for (const p of s.projects) stats.projects.add(p);
      }

      return NextResponse.json({
        date,
        narrative: narrative?.narrative ?? null,
        keyEvents: narrative?.key_events ?? [],
        stats: {
          ...stats,
          people: [...stats.people],
          projects: [...stats.projects],
        },
        sessions: sessions.map(s => ({
          id: s.id,
          appName: s.app_name,
          appCategory: s.app_category,
          windowTitle: s.window_title,
          url: s.url,
          startedAt: s.started_at,
          endedAt: s.ended_at,
          summary: s.summary,
          people: s.people,
          projects: s.projects,
          importance: s.importance,
        })),
      });
    } catch (error) {
      console.error('[desktop-observer/timeline] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch timeline', code: 'TIMELINE_ERROR' },
        { status: 500 }
      );
    }
  })
);
