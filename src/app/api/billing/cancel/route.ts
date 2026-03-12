import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { createServiceClient } from '@/lib/db/client';
import { getStripe } from '@/lib/billing/stripe';

// POST /api/billing/cancel
// Cancels the subscription at the end of the current billing period.
// The user retains access until period_end.
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error } = await (supabase as any)
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    if (!profile?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found', code: 'NO_SUBSCRIPTION' },
        { status: 404 }
      );
    }

    const stripe = getStripe();

    const subscription = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      { cancel_at_period_end: true }
    );

    // Reflect pending cancellation in our DB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('profiles')
      .update({
        subscription_status: 'active', // Still active until period ends
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.user.id);

    return NextResponse.json({
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_end: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
    });
  } catch (err) {
    console.error('Failed to cancel subscription:', err);
    return NextResponse.json(
      { error: 'Failed to cancel subscription', code: 'CANCEL_FAILED' },
      { status: 500 }
    );
  }
});
