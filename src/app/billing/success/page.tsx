'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';

// This page is shown in the user's system browser after a successful Stripe payment.
// It confirms the subscription, then prompts them to return to the desktop app.
export default function BillingSuccessPage() {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    // Poll until the webhook has updated the subscription tier
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/billing/subscription');
        if (res.ok) {
          const data = await res.json();
          if (data.tier !== 'free' && data.status === 'active') {
            setConfirmed(true);
            clearInterval(interval);
          }
        }
      } catch {
        // Keep polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAFA] px-4 text-center">
      <div className="max-w-sm space-y-6">
        {confirmed ? (
          <>
            <CheckCircle className="mx-auto h-14 w-14 text-green-500" />
            <div className="space-y-2">
              <h1 className="font-serif text-2xl font-bold tracking-tight">
                You&apos;re all set.
              </h1>
              <p className="text-sm text-gray-500">
                Your subscription is active. Return to Donna on your desktop to get started.
              </p>
            </div>
            <p className="text-xs text-gray-400">You can close this tab.</p>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-gray-400" />
            <div className="space-y-2">
              <h1 className="font-serif text-2xl font-bold tracking-tight">
                Confirming your payment…
              </h1>
              <p className="text-sm text-gray-500">This only takes a moment.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
