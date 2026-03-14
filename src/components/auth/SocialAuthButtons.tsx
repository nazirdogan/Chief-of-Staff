'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/db/browser-client';

const c = {
  white: '#FFFFFF',
  charcoal: '#2D2D2D',
  slate: '#8D99AE',
  border: 'rgba(45,45,45,0.10)',
  borderHover: 'rgba(45,45,45,0.20)',
  errorBg: 'rgba(220,38,38,0.07)',
  errorText: '#dc2626',
  dmSans: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
};

const buttonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  width: '100%',
  padding: '9px 16px',
  background: c.white,
  color: c.charcoal,
  border: `1px solid ${c.border}`,
  borderRadius: '7px',
  fontSize: '14px',
  fontWeight: 500,
  fontFamily: c.dmSans,
  cursor: 'pointer',
  transition: 'border-color 0.15s ease, background 0.15s ease',
};

export function SocialAuthButtons() {
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabaseBrowserClient();

  async function handleOAuthLogin(provider: 'google' | 'apple') {
    setError(null);
    setLoading(provider);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth-callback?next=/chat`,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setLoading(null);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {error && (
        <div
          style={{
            borderRadius: '6px',
            background: c.errorBg,
            padding: '10px 12px',
            fontSize: '13px',
            color: c.errorText,
            fontFamily: c.dmSans,
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={loading !== null}
        onClick={() => handleOAuthLogin('google')}
        style={{
          ...buttonStyle,
          opacity: loading !== null ? 0.6 : 1,
          cursor: loading !== null ? 'not-allowed' : 'pointer',
        }}
      >
        {loading === 'google' ? <LoadingSpinner /> : <GoogleIcon />}
        Continue with Google
      </button>

      <button
        type="button"
        disabled={loading !== null}
        onClick={() => handleOAuthLogin('apple')}
        style={{
          ...buttonStyle,
          opacity: loading !== null ? 0.6 : 1,
          cursor: loading !== null ? 'not-allowed' : 'pointer',
        }}
      >
        {loading === 'apple' ? <LoadingSpinner /> : <AppleIcon />}
        Continue with Apple
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 22" fill={c.charcoal}>
      <path
        d="M17.05 18.68c-.93 2.08-1.38 3.01-2.58 4.85-1.68 2.58-4.04 5.8-6.97 5.82-2.6.03-3.27-1.7-6.8-1.67-3.52.02-4.25 1.7-6.86 1.67C-9.08 29.33-11.3 26.4-13 23.82c-4.72-7.2-5.22-15.66-2.3-20.16 2.07-3.18 5.34-5.04 8.39-5.04 3.12 0 5.08 1.71 7.66 1.71 2.5 0 4.03-1.72 7.63-1.72 2.72 0 5.63 1.48 7.7 4.04-6.77 3.72-5.67 13.4 1.08 16.03ZM4.53-4.36C5.88-5.94 6.88-8.17 6.53-10.44 4.45-10.3 2.01-9 .5-7.28c-1.37 1.56-2.5 3.82-2.06 6.02 2.24.07 4.56-1.26 6.1-3.1Z"
        transform="translate(4.5 11) scale(0.52)"
      />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg
      style={{ height: '16px', width: '16px', animation: 'spin 1s linear infinite' }}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        style={{ opacity: 0.25 }}
        cx="12"
        cy="12"
        r="10"
        stroke={c.charcoal}
        strokeWidth="4"
      />
      <path
        style={{ opacity: 0.75 }}
        fill={c.charcoal}
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
      />
    </svg>
  );
}
