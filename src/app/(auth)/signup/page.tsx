'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/db/browser-client';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';

const c = {
  white: '#FFFFFF',
  parchment: '#FAF9F6',
  charcoal: '#2D2D2D',
  dawn: '#E8845C',
  slate: '#8D99AE',
  border: 'rgba(45,45,45,0.10)',
  errorBg: 'rgba(220,38,38,0.07)',
  errorText: '#dc2626',
  successBg: 'rgba(5,150,105,0.07)',
  successText: '#059669',
  playfair: "var(--font-playfair), 'Playfair Display', Georgia, serif",
  dmSans: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
};

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = getSupabaseBrowserClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Create user server-side (email_confirm: true — no verification email needed)
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error || 'Failed to create account.');
        setLoading(false);
        return;
      }

      // Sign in immediately — no email verification step
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      window.location.href = '/onboarding';
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="animate-slide-up" style={{ width: '100%', maxWidth: '380px' }}>
      {/* Card — explicit inline styles, immune to dark mode CSS variables */}
      <div
        style={{
          background: c.white,
          border: `1px solid ${c.border}`,
          borderRadius: '10px',
          padding: '32px 28px 28px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1
            style={{
              fontFamily: c.playfair,
              fontWeight: 700,
              fontSize: '24px',
              letterSpacing: '-0.01em',
              color: c.charcoal,
              margin: 0,
              marginBottom: '6px',
            }}
          >
            Get started
          </h1>
          <p
            style={{
              fontFamily: c.dmSans,
              fontSize: '14px',
              color: c.slate,
              margin: 0,
            }}
          >
            Create your account
          </p>
        </div>

        <form onSubmit={handleSignup}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="fullName" style={{ color: c.charcoal, fontSize: '13px', fontWeight: 500, fontFamily: c.dmSans }}>
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
                style={{
                  background: c.parchment,
                  border: `1px solid rgba(45,45,45,0.15)`,
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: c.charcoal,
                  width: '100%',
                  fontSize: '14px',
                  fontFamily: c.dmSans,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="email" style={{ color: c.charcoal, fontSize: '13px', fontWeight: 500, fontFamily: c.dmSans }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{
                  background: c.parchment,
                  border: `1px solid rgba(45,45,45,0.15)`,
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: c.charcoal,
                  width: '100%',
                  fontSize: '14px',
                  fontFamily: c.dmSans,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="password" style={{ color: c.charcoal, fontSize: '13px', fontWeight: 500, fontFamily: c.dmSans }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={12}
                style={{
                  background: c.parchment,
                  border: `1px solid rgba(45,45,45,0.15)`,
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: c.charcoal,
                  width: '100%',
                  fontSize: '14px',
                  fontFamily: c.dmSans,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <p
                style={{
                  fontSize: '12px',
                  color: c.slate,
                  fontFamily: c.dmSans,
                  margin: 0,
                }}
              >
                Must be at least 12 characters.
              </p>
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: loading ? 'rgba(232,132,92,0.6)' : c.dawn,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '7px',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: c.dmSans,
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.01em',
                transition: 'background 0.15s ease',
              }}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>

            {/* Divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                margin: '2px 0',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: c.border }} />
              <span
                style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: c.slate,
                  fontFamily: c.dmSans,
                }}
              >
                or
              </span>
              <div style={{ flex: 1, height: '1px', background: c.border }} />
            </div>

            <SocialAuthButtons />

            <p
              style={{
                textAlign: 'center',
                fontSize: '13px',
                color: c.slate,
                fontFamily: c.dmSans,
                margin: 0,
                marginTop: '4px',
              }}
            >
              Already have an account?{' '}
              <Link
                href="/login"
                style={{
                  color: c.dawn,
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
