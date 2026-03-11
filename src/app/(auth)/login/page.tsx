'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  playfair: "var(--font-playfair), 'Playfair Display', Georgia, serif",
  dmSans: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showTotp, setShowTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = getSupabaseBrowserClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        if (signInError.message.includes('MFA')) {
          setShowTotp(true);
          setLoading(false);
          return;
        }
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        router.push('/chat');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTotpVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];

      if (!totpFactor) {
        setError('No TOTP factor found.');
        setLoading(false);
        return;
      }

      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: totpFactor.id });

      if (challengeError) {
        setError(challengeError.message);
        setLoading(false);
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code: totpCode,
      });

      if (verifyError) {
        setError(verifyError.message);
        setLoading(false);
        return;
      }

      router.push('/chat');
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
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
            Welcome back
          </h1>
          <p
            style={{
              fontFamily: c.dmSans,
              fontSize: '14px',
              color: c.slate,
              margin: 0,
            }}
          >
            Sign in to your account
          </p>
        </div>

        {!showTotp ? (
          <form onSubmit={handleLogin}>
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
                  autoComplete="current-password"
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
                {loading ? 'Signing in...' : 'Sign in'}
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
                Don&apos;t have an account?{' '}
                <Link
                  href="/signup"
                  style={{
                    color: c.dawn,
                    fontWeight: 500,
                    textDecoration: 'none',
                  }}
                >
                  Sign up
                </Link>
              </p>
            </div>
          </form>
        ) : (
          <form onSubmit={handleTotpVerify}>
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
                <label htmlFor="totp" style={{ color: c.charcoal, fontSize: '13px', fontWeight: 500, fontFamily: c.dmSans }}>
                  Authentication Code
                </label>
                <input
                  id="totp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  required
                  autoComplete="one-time-code"
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
                    letterSpacing: '0.15em',
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
                  Enter the 6-digit code from your authenticator app.
                </p>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                {loading ? 'Verifying...' : 'Verify'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowTotp(false);
                  setTotpCode('');
                  setError(null);
                }}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'transparent',
                  color: c.slate,
                  border: `1px solid ${c.border}`,
                  borderRadius: '7px',
                  fontSize: '14px',
                  fontWeight: 500,
                  fontFamily: c.dmSans,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                Back to login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
