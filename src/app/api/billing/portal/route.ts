import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { createServiceClient } from '@/lib/db/client';
import { getStripe } from '@/lib/billing/stripe';

// POST /api/billing/portal
// Opens the Stripe Customer Portal for managing/cancelling subscriptions.
// Desktop app opens the returned URL in the system browser.
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error } = await (supabase as any)
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found. Please upgrade first.', code: 'NO_CUSTOMER' },
        { status: 404 }
      );
    }

    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://imdonna.app';

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/settings/pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Failed to create billing portal session:', err);
    return NextResponse.json(
      { error: 'Failed to open billing portal', code: 'PORTAL_FAILED' },
      { status: 500 }
    );
  }
});
