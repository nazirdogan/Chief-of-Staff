import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { createServiceClient } from '@/lib/db/client';
import { invalidateBlockedAppsCache } from '@/lib/desktop-observer/session-manager';

// GET: Fetch blocked apps list + all observed app names from activity_sessions
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();

    // Fetch blocked apps from profile and distinct observed app names in parallel
    const [profileRes, sessionsRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('profiles')
        .select('blocked_apps')
        .eq('id', req.user.id)
        .single(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('activity_sessions')
        .select('app_name')
        .eq('user_id', req.user.id),
    ]);

    if (profileRes.error) throw profileRes.error;

    // Deduplicate and sort app names alphabetically
    const allApps: string[] = sessionsRes.data
      ? [...new Set((sessionsRes.data as { app_name: string }[]).map((r) => r.app_name))]
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b))
      : [];

    return NextResponse.json({
      blocked_apps: profileRes.data?.blocked_apps ?? [],
      observed_apps: allApps,
    });
  } catch (err) {
    console.error('Failed to fetch privacy settings:', err);
    return NextResponse.json(
      { error: 'Failed to fetch privacy settings', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
});

// PATCH: Update blocked apps list
export const PATCH = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const { blocked_apps } = body as { blocked_apps?: string[] };

    if (!Array.isArray(blocked_apps)) {
      return NextResponse.json(
        { error: 'blocked_apps must be an array', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Validate all items are strings
    if (!blocked_apps.every((app) => typeof app === 'string')) {
      return NextResponse.json(
        { error: 'All blocked_apps entries must be strings', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('profiles')
      .update({ blocked_apps, updated_at: new Date().toISOString() })
      .eq('id', req.user.id)
      .select('blocked_apps')
      .single();

    if (error) throw error;

    // Invalidate the in-memory blocked apps cache so changes take effect immediately
    invalidateBlockedAppsCache(req.user.id);

    return NextResponse.json({ blocked_apps: data?.blocked_apps ?? [] });
  } catch (err) {
    console.error('Failed to update privacy settings:', err);
    return NextResponse.json(
      { error: 'Failed to update privacy settings', code: 'UPDATE_FAILED' },
      { status: 500 }
    );
  }
});
