'use client';

import { useState } from 'react';
import Link from 'next/link';

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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        setError('Something went wrong. Please try again.');
        return;
      }

      setSent(true);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="animate-slide-up" style={{ width: '100%', maxWidth: '380px' }}>
        <div
          style={{
            background: c.white,
            border: `1px solid ${c.border}`,
            borderRadius: '10px',
            padding: '40px 28px 32px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(5,150,105,0.08)',
              border: '1px solid rgba(5,150,105,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 9l5 5 9-9" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1
            style={{
              fontFamily: c.playfair,
              fontWeight: 700,
              fontSize: '22px',
              letterSpacing: '-0.01em',
              color: c.charcoal,
              margin: 0,
              marginBottom: '10px',
            }}
          >
            Check your email
          </h1>
          <p
            style={{
              fontFamily: c.dmSans,
              fontSize: '14px',
              lineHeight: 1.6,
              color: c.slate,
              margin: 0,
              marginBottom: '24px',
            }}
          >
            We sent a password reset link to{' '}
            <strong style={{ color: c.charcoal }}>{email}</strong>.
            The link expires in 1 hour.
          </p>
          <Link
            href="/login"
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: c.dawn,
              fontFamily: c.dmSans,
              textDecoration: 'none',
            }}
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up" style={{ width: '100%', maxWidth: '380px' }}>
      <div
        style={{
          background: c.white,
          border: `1px solid ${c.border}`,
          borderRadius: '10px',
          padding: '32px 28px 28px',
        }}
      >
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
            Reset password
          </h1>
          <p
            style={{
              fontFamily: c.dmSans,
              fontSize: '14px',
              color: c.slate,
              margin: 0,
            }}
          >
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
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
                autoFocus
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
              {loading ? 'Sending...' : 'Send reset link'}
            </button>

            <p
              style={{
                textAlign: 'center',
                fontSize: '13px',
                color: c.slate,
                fontFamily: c.dmSans,
                margin: 0,
              }}
            >
              <Link
                href="/login"
                style={{ color: c.dawn, fontWeight: 500, textDecoration: 'none' }}
              >
                Back to login
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
