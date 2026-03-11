import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { createServiceClient } from '@/lib/db/client';
import { getStripe } from '@/lib/billing/stripe';

// POST /api/billing/setup-intent
// Creates a Stripe SetupIntent so the user can add/update their payment method
// using the embedded PaymentElement (no redirect to Stripe-hosted pages).
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
        { error: 'No billing account found', code: 'NO_CUSTOMER' },
        { status: 404 }
      );
    }

    const stripe = getStripe();

    const setupIntent = await stripe.setupIntents.create({
      customer: profile.stripe_customer_id,
      payment_method_types: ['card'],
      usage: 'off_session', // For recurring subscription charges
    });

    return NextResponse.json({ client_secret: setupIntent.client_secret });
  } catch (err) {
    console.error('Failed to create setup intent:', err);
    return NextResponse.json(
      { error: 'Failed to initialise payment update', code: 'SETUP_FAILED' },
      { status: 500 }
    );
  }
});
