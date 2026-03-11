import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { createServiceClient } from '@/lib/db/client';

// GET /api/billing/subscription
// Returns the user's current subscription status and tier.
// Desktop app polls this after redirecting to the payment flow.
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('subscription_tier, subscription_status, subscription_period_end, stripe_customer_id')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    return NextResponse.json({
      tier: data?.subscription_tier ?? 'free',
      status: data?.subscription_status ?? 'inactive',
      period_end: data?.subscription_period_end ?? null,
      has_billing: !!data?.stripe_customer_id,
    });
  } catch (err) {
    console.error('Failed to fetch subscription:', err);
    return NextResponse.json(
      { error: 'Failed to fetch subscription', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
});
