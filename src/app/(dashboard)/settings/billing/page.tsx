'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, CreditCard, Receipt, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '');

// ── Types ──────────────────────────────────────────────────────────────────

interface SubscriptionDetails {
  id: string;
  status: string;
  tier: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
}

interface PaymentMethodDetails {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amount_paid: number;
  amount_due: number;
  currency: string;
  created: string;
  period_start: string;
  period_end: string;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const CARD_BRAND_LABELS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  diners: 'Diners Club',
  jcb: 'JCB',
  unionpay: 'UnionPay',
};

function StatusBadge({ status, cancelAtPeriodEnd }: { status: string; cancelAtPeriodEnd: boolean }) {
  if (cancelAtPeriodEnd) {
    return (
      <Badge variant="outline" className="gap-1.5 border-yellow-500/30 text-yellow-500">
        <Clock className="h-3 w-3" />
        Canceling
      </Badge>
    );
  }
  if (status === 'active' || status === 'trialing') {
    return (
      <Badge variant="outline" className="gap-1.5 border-green-500/30 text-green-500">
        <CheckCircle className="h-3 w-3" />
        Active
      </Badge>
    );
  }
  if (status === 'past_due') {
    return (
      <Badge variant="outline" className="gap-1.5 border-red-500/30 text-red-500">
        <AlertTriangle className="h-3 w-3" />
        Past due
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1.5 text-muted-foreground">
      <XCircle className="h-3 w-3" />
      {capitalise(status)}
    </Badge>
  );
}

// ── Card Update Form (Stripe Elements) ────────────────────────────────────

function CardUpdateForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSaving(true);
    setError(null);

    try {
      const result = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      });

      if (result.error) {
        setError(result.error.message ?? 'Something went wrong. Please try again.');
        return;
      }

      // SetupIntent confirmed — persist the new payment method server-side
      const pmId = result.setupIntent?.payment_method;
      if (pmId && typeof pmId === 'string') {
        await fetch('/api/billing/update-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_method_id: pmId }),
        });
      }

      onSuccess();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2 pt-2">
        <Button type="submit" size="sm" disabled={!stripe || saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save card
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function BillingPage() {
  const router = useRouter();

  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodDetails | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Card update state
  const [showCardUpdate, setShowCardUpdate] = useState(false);
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null);
  const [loadingSetup, setLoadingSetup] = useState(false);

  // Cancel state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [detailsRes, invoicesRes] = await Promise.all([
        fetch('/api/billing/details'),
        fetch('/api/billing/invoices'),
      ]);

      if (detailsRes.ok) {
        const d = await detailsRes.json();
        setSubscription(d.subscription);
        setPaymentMethod(d.payment_method);
      }
      if (invoicesRes.ok) {
        const d = await invoicesRes.json();
        setInvoices(d.invoices ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleOpenCardUpdate() {
    setLoadingSetup(true);
    try {
      const res = await fetch('/api/billing/setup-intent', { method: 'POST' });
      if (!res.ok) return;
      const { client_secret } = await res.json();
      setSetupClientSecret(client_secret);
      setShowCardUpdate(true);
    } finally {
      setLoadingSetup(false);
    }
  }

  function handleCardUpdateSuccess() {
    setShowCardUpdate(false);
    setSetupClientSecret(null);
    fetchData();
  }

  async function handleCancel() {
    setCanceling(true);
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' });
      if (res.ok) {
        setShowCancelDialog(false);
        fetchData();
      }
    } finally {
      setCanceling(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">No active subscription.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/settings/pricing')}>
          View plans
        </Button>
      </div>
    );
  }

  const tierLabel =
    subscription.tier === 'plus' ? 'Plus' :
    subscription.tier === 'pro' ? 'Pro' :
    subscription.tier === 'enterprise' ? 'Enterprise' :
    capitalise(subscription.tier);

  return (
    <div className="space-y-6 p-6">

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your subscription, payment method, and invoices.
        </p>
      </div>

      {/* ── Subscription ── */}
      <Card className="border-white/[0.06] bg-white/[0.03]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Subscription</CardTitle>
            <StatusBadge
              status={subscription.status}
              cancelAtPeriodEnd={subscription.cancel_at_period_end}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{tierLabel}</p>
              {subscription.cancel_at_period_end ? (
                <p className="mt-0.5 text-sm text-yellow-500">
                  Access until {formatDate(subscription.current_period_end)}
                </p>
              ) : (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Renews {formatDate(subscription.current_period_end)}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/settings/pricing')}
            >
              Change plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Payment Method ── */}
      <Card className="border-white/[0.06] bg-white/[0.03]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payment method</CardTitle>
        </CardHeader>
        <CardContent>
          {showCardUpdate && setupClientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: setupClientSecret,
                appearance: {
                  theme: 'night',
                  variables: {
                    colorPrimary: '#ffffff',
                    colorBackground: '#0a0a0a',
                    colorText: '#ffffff',
                    colorDanger: '#ef4444',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    borderRadius: '8px',
                  },
                },
              }}
            >
              <CardUpdateForm
                onSuccess={handleCardUpdateSuccess}
                onCancel={() => {
                  setShowCardUpdate(false);
                  setSetupClientSecret(null);
                }}
              />
            </Elements>
          ) : paymentMethod ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {CARD_BRAND_LABELS[paymentMethod.brand] ?? capitalise(paymentMethod.brand)} ···· {paymentMethod.last4}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expires {String(paymentMethod.exp_month).padStart(2, '0')}/{paymentMethod.exp_year}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={loadingSetup}
                onClick={handleOpenCardUpdate}
              >
                {loadingSetup && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update card
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">No payment method on file.</p>
              <Button
                variant="outline"
                size="sm"
                disabled={loadingSetup}
                onClick={handleOpenCardUpdate}
              >
                {loadingSetup && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add card
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Billing History ── */}
      <Card className="border-white/[0.06] bg-white/[0.03]">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Billing history</CardTitle>
          </div>
          <CardDescription>Your last 24 invoices.</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">
                      {formatDate(inv.created)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inv.number ?? inv.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatAmount(inv.amount_paid || inv.amount_due, inv.currency)}
                      </p>
                      <p className={`text-xs ${inv.status === 'paid' ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {capitalise(inv.status ?? 'unknown')}
                      </p>
                    </div>
                    {inv.invoice_pdf && (
                      <a
                        href={inv.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      >
                        PDF
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Danger Zone ── */}
      {!subscription.cancel_at_period_end && (
        <Card className="border-red-500/20 bg-white/[0.03]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-red-500">Cancel subscription</CardTitle>
            <CardDescription>
              You&apos;ll keep access to {tierLabel} until{' '}
              {formatDate(subscription.current_period_end)}. After that your account
              moves to the free tier.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              className="border-red-500/30 text-red-500 hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-400"
              onClick={() => setShowCancelDialog(true)}
            >
              Cancel subscription
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Cancel Confirmation Dialog ── */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel your subscription?</DialogTitle>
            <DialogDescription>
              Your {tierLabel} plan stays active until{' '}
              <strong>{formatDate(subscription.current_period_end)}</strong>. After that
              you&apos;ll move to the free tier. You can resubscribe any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancelDialog(false)}
              disabled={canceling}
            >
              Keep my plan
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={canceling}
            >
              {canceling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
