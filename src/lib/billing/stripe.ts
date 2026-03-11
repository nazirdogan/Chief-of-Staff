import Stripe from 'stripe';

// Stripe client — server-side only. Never import this on the client.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    _stripe = new Stripe(key, { apiVersion: '2026-02-25.clover' });
  }
  return _stripe;
}

// Tier → Stripe Price ID mapping.
// Resolved lazily at call time (not at module load) to ensure env vars are available.
export function getPriceId(tier: 'plus' | 'pro'): string {
  return tier === 'plus'
    ? (process.env.STRIPE_PLUS_PRICE_ID ?? '')
    : (process.env.STRIPE_PRO_PRICE_ID ?? '');
}

// Stripe subscription status → our tier
export function tierFromSubscription(
  status: Stripe.Subscription.Status,
  priceId: string
): string {
  if (status !== 'active' && status !== 'trialing') return 'free';

  if (priceId && priceId === process.env.STRIPE_PLUS_PRICE_ID) return 'plus';
  if (priceId && priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro';

  return 'free';
}
