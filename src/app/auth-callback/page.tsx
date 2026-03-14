'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/db/browser-client';

// Client-side OAuth callback handler.
//
// Why client-side instead of the existing server-side /api/auth/callback?
// The PKCE flow stores a code_verifier in the browser (Tauri WebKit) via
// document.cookie when signInWithOAuth is called. On macOS, Tauri's WebKit
// does not always forward those localhost cookies when the server-side API
// route handles the redirect from accounts.google.com. By exchanging the
// code client-side, the browser Supabase client reads its own code_verifier
// directly — no cross-request cookie forwarding needed.
export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallbackContent />
    </Suspense>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');

  useEffect(() => {
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/chat';

    if (!code) {
      router.replace('/login?error=auth_callback_failed');
      return;
    }

    const supabase = getSupabaseBrowserClient();

    supabase.auth.exchangeCodeForSession(code).then(async ({ error }) => {
      if (error) {
        console.error('[auth-callback] exchangeCodeForSession failed:', error.message);
        setStatus('error');
        setTimeout(() => router.replace('/login?error=auth_callback_failed'), 1500);
        return;
      }

      // Check onboarding status
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login?error=auth_callback_failed');
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      const destination = profile?.onboarding_completed ? next : '/onboarding';
      router.replace(destination);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1B1F3A',
      }}
    >
      {status === 'loading' ? (
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '2px solid rgba(232,132,92,0.2)',
              borderTopColor: '#E8845C',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: '13px',
              color: 'rgba(155,175,196,0.5)',
              margin: 0,
            }}
          >
            Signing you in…
          </p>
        </div>
      ) : (
        <p
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: '13px',
            color: '#dc2626',
            margin: 0,
          }}
        >
          Sign in failed. Redirecting…
        </p>
      )}
    </div>
  );
}
