'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

const PROVIDER_LABELS: Record<string, string> = {
  gmail: 'Gmail',
  google_calendar: 'Google Calendar',
  slack: 'Slack',
  notion: 'Notion',
  outlook: 'Outlook',
  microsoft_calendar: 'Microsoft Calendar',
};

function ConnectedContent() {
  const params = useSearchParams();
  const provider = params.get('provider') ?? params.get('connected');
  const error = params.get('error');

  const providerLabel = provider ? (PROVIDER_LABELS[provider] ?? provider) : 'Your account';

  if (error) {
    const errorMessages: Record<string, string> = {
      google_denied: 'You cancelled the sign-in.',
      token_exchange_failed: 'Could not complete sign-in. Please try again from the app.',
      db_error: 'Sign-in succeeded but saving failed. Please try again.',
      invalid_state: 'Invalid request. Please start the connection again from the app.',
      invalid_callback: 'Incomplete callback. Please try again.',
    };
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Connection failed</h1>
          <p className="mt-1 text-sm text-gray-500">
            {errorMessages[error] ?? 'Something went wrong. Please try again from the Donna app.'}
          </p>
        </div>
        <p className="text-xs text-gray-400">You can close this tab and return to Donna.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{providerLabel} connected</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your {providerLabel} account has been linked to Donna successfully.
        </p>
      </div>
      <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-sm font-medium text-gray-700">Return to the Donna app</p>
        <p className="mt-0.5 text-xs text-gray-500">
          You can close this tab — your connection is active and Donna is already syncing.
        </p>
      </div>
      <a
        href="donna://integrations/connected"
        className="mt-1 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Open Donna
      </a>
    </div>
  );
}

export default function ConnectedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <span className="font-serif text-2xl font-semibold tracking-tight text-gray-900">donna</span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <Suspense fallback={
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 animate-pulse rounded-full bg-gray-100" />
              <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
            </div>
          }>
            <ConnectedContent />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Your data is encrypted and never shared. &copy; {new Date().getFullYear()} Donna
        </p>
      </div>
    </div>
  );
}
