'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Shield, Eye, Trash2, AlertCircle } from 'lucide-react';

interface PermissionItem {
  label: string;
  description: string;
}

interface OAuthConsentScreenProps {
  provider: string;
  providerLabel: string;
  permissions: PermissionItem[];
  onConsent: () => void;
  onCancel: () => void;
  loading?: boolean;
  /** True while the session token is being pre-fetched. Disables the Proceed
   *  button to ensure it can only be clicked once the token is ready — preventing
   *  an async gap between the click and window.open() which would trigger popup
   *  blockers. */
  tokenLoading?: boolean;
  /** Error message if the session token could not be obtained. */
  tokenError?: string | null;
}

export function OAuthConsentScreen({
  providerLabel,
  permissions,
  onConsent,
  onCancel,
  loading,
  tokenLoading,
  tokenError,
}: OAuthConsentScreenProps) {
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Connect {providerLabel}</CardTitle>
        <CardDescription>
          Before connecting, here is exactly what Donna will access and
          how your data is handled.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">What we will access:</h3>
          <ul className="space-y-2">
            {permissions.map((perm, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <Eye className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <span className="font-medium">{perm.label}</span>
                  <p className="text-muted-foreground">{perm.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">How we protect your data:</h3>
          <ul className="space-y-2">
            <li className="flex gap-3 text-sm">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                Your OAuth tokens are stored in an encrypted vault (Nango) — never
                in our database.
              </span>
            </li>
            <li className="flex gap-3 text-sm">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                Raw email bodies are never stored. Only AI-generated summaries
                are kept.
              </span>
            </li>
            <li className="flex gap-3 text-sm">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                We will never send emails, create events, or modify anything
                without your explicit approval.
              </span>
            </li>
          </ul>
        </div>

        <div className="flex gap-3 text-sm">
          <Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span>
            You can disconnect at any time from Settings. All cached data is
            deleted immediately.
          </span>
        </div>
      </CardContent>
      {tokenError && (
        <div className="mx-6 mb-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{tokenError}</span>
        </div>
      )}
      <CardFooter className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={onConsent} disabled={loading || tokenLoading || !!tokenError}>
          {loading ? 'Connecting...' : tokenLoading ? 'Preparing...' : `Connect ${providerLabel}`}
        </Button>
      </CardFooter>
    </Card>
  );
}
