import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { createServiceClient } from '@/lib/db/client';
import { getStripe, getPriceId } from '@/lib/billing/stripe';
import { z } from 'zod/v4';

const bodySchema = z.object({
  tier: z.enum(['plus', 'pro']),
});

// POST /api/billing/checkout
// Creates a Stripe Checkout Session and returns the URL.
// Called exclusively from the desktop app; the URL is opened in the system browser.
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid tier', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { tier } = parsed.data;
    const priceId = getPriceId(tier);

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price not configured for this tier', code: 'PRICE_NOT_FOUND' },
        { status: 500 }
      );
    }

    const stripe = getStripe();
    const supabase = createServiceClient();

    // Fetch or create Stripe customer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error: profileError } = await (supabase as any)
      .from('profiles')
      .select('stripe_customer_id, email, full_name')
      .eq('id', req.user.id)
      .single();

    if (profileError) throw profileError;

    let customerId: string = profile?.stripe_customer_id ?? '';

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email ?? req.user.email,
        name: profile?.full_name ?? undefined,
        metadata: { donna_user_id: req.user.id },
      });
      customerId = customer.id;

      // Persist the new customer ID
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', req.user.id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://imdonna.app';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/settings/pricing`,
      // Pass user ID so webhook can identify who paid
      client_reference_id: req.user.id,
      metadata: { tier },
      // Allow promotion codes (e.g. early access codes)
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { donna_user_id: req.user.id, tier },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const stripeMessage =
      err instanceof Error ? err.message : String(err);
    console.error('Failed to create checkout session:', stripeMessage);
    return NextResponse.json(
      { error: 'Failed to create checkout session', code: 'CHECKOUT_FAILED', detail: stripeMessage },
      { status: 500 }
    );
  }
});
