import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { createServiceClient } from '@/lib/db/client';
import { getStripe } from '@/lib/billing/stripe';

// GET /api/billing/invoices
// Returns the last 24 invoices for the user's Stripe customer.
export const GET = withAuth(async (req: AuthenticatedRequest) => {
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
      return NextResponse.json({ invoices: [] });
    }

    const stripe = getStripe();

    const invoices = await stripe.invoices.list({
      customer: profile.stripe_customer_id,
      limit: 24,
    });

    return NextResponse.json({
      invoices: invoices.data.map((inv) => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amount_paid: inv.amount_paid,
        amount_due: inv.amount_due,
        currency: inv.currency,
        created: new Date(inv.created * 1000).toISOString(),
        period_start: new Date(inv.period_start * 1000).toISOString(),
        period_end: new Date(inv.period_end * 1000).toISOString(),
        hosted_invoice_url: inv.hosted_invoice_url,
        invoice_pdf: inv.invoice_pdf,
      })),
    });
  } catch (err) {
    console.error('Failed to fetch invoices:', err);
    return NextResponse.json(
      { error: 'Failed to fetch invoices', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
});
