import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { createServiceClient } from '@/lib/db/client';
import { getStripe } from '@/lib/billing/stripe';

// GET /api/billing/details
// Returns subscription details and default payment method from Stripe.
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error } = await (supabase as any)
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id, subscription_tier, subscription_status, subscription_period_end')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    if (!profile?.stripe_subscription_id) {
      return NextResponse.json({ subscription: null, payment_method: null });
    }

    const stripe = getStripe();

    const subscription = await stripe.subscriptions.retrieve(
      profile.stripe_subscription_id,
      { expand: ['default_payment_method', 'latest_invoice'] }
    );

    // Extract payment method details
    let paymentMethod = null;
    const pm = subscription.default_payment_method;
    if (pm && typeof pm === 'object' && pm.type === 'card' && pm.card) {
      paymentMethod = {
        id: pm.id,
        brand: pm.card.brand,
        last4: pm.card.last4,
        exp_month: pm.card.exp_month,
        exp_year: pm.card.exp_year,
      };
    }

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        tier: profile.subscription_tier,
        current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
      },
      payment_method: paymentMethod,
    });
  } catch (err) {
    console.error('Failed to fetch billing details:', err);
    return NextResponse.json(
      { error: 'Failed to fetch billing details', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
});
