'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/db/browser-client';

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

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const supabase = getSupabaseBrowserClient();

  // Supabase sends the reset token in the URL hash. The browser client
  // automatically exchanges it for a session when the page loads.
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
  }, [supabase.auth]);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      // Sign out other sessions and send to login with success hint
      await supabase.auth.signOut({ scope: 'others' });
      router.push('/login?reset=success');
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
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
          <p style={{ fontFamily: c.dmSans, fontSize: '14px', color: c.slate, margin: 0 }}>
            Verifying reset link…
          </p>
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
            New password
          </h1>
          <p style={{ fontFamily: c.dmSans, fontSize: '14px', color: c.slate, margin: 0 }}>
            Choose a strong password for your account.
          </p>
        </div>

        <form onSubmit={handleReset}>
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
              <label htmlFor="password" style={{ color: c.charcoal, fontSize: '13px', fontWeight: 500, fontFamily: c.dmSans }}>
                New password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                autoFocus
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
              <p style={{ fontSize: '12px', color: c.slate, fontFamily: c.dmSans, margin: 0 }}>
                Must be at least 12 characters.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="confirm" style={{ color: c.charcoal, fontSize: '13px', fontWeight: 500, fontFamily: c.dmSans }}>
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
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
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
