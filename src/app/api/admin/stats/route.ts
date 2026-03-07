import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/middleware/withAdmin';
import { createServiceClient } from '@/lib/db/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export const GET = withAdmin(async () => {
  const supabase = createServiceClient() as SupabaseAny;

  const [
    waitlistRes,
    usersRes,
    onboardedRes,
    briefingsRes,
    telegramRes,
    feedbackRes,
  ] = await Promise.all([
    supabase.from('waitlist').select('status', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('onboarding_completed', true),
    supabase.from('briefings').select('id', { count: 'exact', head: true }),
    supabase.from('telegram_sessions').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('user_feedback').select('id', { count: 'exact', head: true }).eq('resolved', false),
  ]);

  const [pendingRes, approvedRes] = await Promise.all([
    supabase.from('waitlist').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('waitlist').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
  ]);

  return NextResponse.json({
    stats: {
      waitlist_total: waitlistRes.count ?? 0,
      waitlist_pending: pendingRes.count ?? 0,
      waitlist_approved: approvedRes.count ?? 0,
      total_users: usersRes.count ?? 0,
      onboarded_users: onboardedRes.count ?? 0,
      total_briefings: briefingsRes.count ?? 0,
      active_telegram: telegramRes.count ?? 0,
      open_feedback: feedbackRes.count ?? 0,
    },
  });
});
