import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { createServiceClient } from '@/lib/db/client';
import { getStripe } from '@/lib/billing/stripe';
import { z } from 'zod/v4';

const bodySchema = z.object({
  payment_method_id: z.string().min(1),
});

// POST /api/billing/update-payment
// After the client confirms a SetupIntent, this sets the new payment method
// as the default on the customer and active subscription.
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'payment_method_id is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { payment_method_id } = parsed.data;
    const supabase = createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error } = await (supabase as any)
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id')
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

    // Set as default payment method on the customer
    await stripe.customers.update(profile.stripe_customer_id, {
      invoice_settings: { default_payment_method: payment_method_id },
    });

    // Set as default on the active subscription too
    if (profile.stripe_subscription_id) {
      await stripe.subscriptions.update(profile.stripe_subscription_id, {
        default_payment_method: payment_method_id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to update payment method:', err);
    return NextResponse.json(
      { error: 'Failed to update payment method', code: 'UPDATE_FAILED' },
      { status: 500 }
    );
  }
});
