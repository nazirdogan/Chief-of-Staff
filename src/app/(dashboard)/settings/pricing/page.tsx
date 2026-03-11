'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react';
import { BackButton } from '@/components/shared/BackButton';

interface PricingTier {
  id: string;
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta?: string;
}

// Tier rank — higher number = higher tier
const TIER_RANK: Record<string, number> = {
  free: 0,
  plus: 1,
  pro: 2,
  enterprise: 3,
};

const TIERS: PricingTier[] = [
  {
    id: 'plus',
    name: 'Plus',
    price: '$20',
    period: '/mo',
    description: 'The essentials to stay on top of your day.',
    features: [
      'One briefing per day',
      'One email account (Gmail or Outlook)',
      'Core integrations (Calendar, Tasks)',
      'Chat with Donna',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$35',
    period: '/mo',
    description: 'Full intelligence for power users.',
    features: [
      'Unlimited daily briefings',
      'All integrations (Gmail, Outlook, Slack, Notion)',
      'Multiple email accounts',
      'Priority support',
    ],
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    description: 'For teams that need full control.',
    features: [
      'Everything in Pro',
      'Team-wide deployment',
      'Custom data region',
      'SSO / SAML',
      'Dedicated support',
      'Custom integrations',
    ],
    cta: 'Contact us',
  },
];

export default function PricingSettingsPage() {
  const router = useRouter();
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [hasBilling, setHasBilling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/subscription');
      if (res.ok) {
        const data = await res.json();
        setCurrentTier(data.tier ?? 'free');
        setHasBilling(data.has_billing ?? false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Open a URL in the system browser (Tauri) or current tab (web).
  async function openExternal(url: string) {
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('plugin:shell|open', { path: url });
        return;
      } catch {
        // Fall through to browser navigation if plugin is unavailable
      }
    }
    window.location.href = url;
  }

  async function handleUpgrade(tierId: string) {
    if (tierId === 'enterprise') {
      await openExternal('mailto:hello@imdonna.app?subject=Enterprise%20Enquiry');
      return;
    }

    setUpgrading(tierId);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierId }),
      });

      if (!res.ok) {
        const raw = await res.text();
        console.error('Checkout error', res.status, raw);
        return;
      }

      const { url } = await res.json();
      if (url) await openExternal(url);
    } finally {
      setUpgrading(null);
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pricing</h1>
        <div className="mt-4 flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton href="/settings" />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pricing</h1>
        <p className="text-sm text-muted-foreground">
          Choose the plan that fits your workflow. Billed monthly. Cancel any time.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TIERS.map((tier) => {
          const isCurrent = currentTier === tier.id;
          const isLoading = upgrading === tier.id;
          const currentRank = TIER_RANK[currentTier] ?? 0;
          const tierRank = TIER_RANK[tier.id] ?? 0;
          const isDowngrade = !isCurrent && tierRank < currentRank;

          let buttonLabel: string;
          if (isCurrent) {
            buttonLabel = 'Current plan';
          } else if (isDowngrade) {
            buttonLabel = 'Downgrade';
          } else {
            buttonLabel = tier.cta ?? 'Upgrade';
          }

          return (
            <Card
              key={tier.id}
              className={`relative flex flex-col ${tier.highlighted ? 'border-primary shadow-md' : ''}`}
            >
              {tier.highlighted && (
                <Badge className="absolute -top-2.5 left-4">Most Popular</Badge>
              )}
              <CardHeader>
                <CardTitle className="text-lg">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                <p className="mt-2 flex items-baseline gap-0.5">
                  <span className="text-3xl font-bold tracking-tight">{tier.price}</span>
                  {tier.period && (
                    <span className="text-sm text-muted-foreground">{tier.period}</span>
                  )}
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="flex-1 space-y-2">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <Button
                    variant={isCurrent ? 'outline' : tier.highlighted && !isDowngrade ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                    disabled={isCurrent || isLoading}
                    onClick={() => !isCurrent && handleUpgrade(tier.id)}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {buttonLabel}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {hasBilling && (
        <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.03] p-4">
          <div>
            <p className="text-sm font-medium">Billing &amp; Invoices</p>
            <p className="text-xs text-muted-foreground">
              Payment method, invoice history, and cancellation.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/settings/billing')}
          >
            Manage billing
          </Button>
        </div>
      )}
    </div>
  );
}
