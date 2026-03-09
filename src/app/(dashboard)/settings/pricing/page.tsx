'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react';
import { BackButton } from '@/components/shared/BackButton';

interface PricingTier {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

const TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    description: 'Get started with basic intelligence.',
    features: [
      'Limited briefings per month',
      'Basic integrations (Gmail, Calendar)',
      'Chat with Donna',
      'Up to 100 inbox items',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29/mo',
    description: 'Full intelligence layer for power users.',
    features: [
      'Unlimited daily briefings',
      'All integrations (Gmail, Outlook, Slack, Notion)',
      'Desktop observer',
      'Custom instructions',
      'Privacy controls',
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
  },
];

export default function PricingSettingsPage() {
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  const fetchTier = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/account');
      if (res.ok) {
        const data = await res.json();
        setCurrentTier(data.subscription_tier ?? 'free');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTier();
  }, [fetchTier]);

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
          Choose the plan that fits your workflow.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TIERS.map((tier) => {
          const isCurrent = currentTier === tier.id;

          return (
            <Card
              key={tier.id}
              className={`relative ${tier.highlighted ? 'border-primary shadow-md' : ''}`}
            >
              {tier.highlighted && (
                <Badge className="absolute -top-2.5 left-4">Most Popular</Badge>
              )}
              <CardHeader>
                <CardTitle className="text-lg">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                <p className="mt-2 text-3xl font-bold tracking-tight">{tier.price}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button variant="outline" size="sm" disabled className="w-full">
                    Current plan
                  </Button>
                ) : (
                  <Button
                    variant={tier.highlighted ? 'default' : 'outline'}
                    size="sm"
                    disabled
                    className="w-full"
                  >
                    Upgrade
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Coming Soon
                    </Badge>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
