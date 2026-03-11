'use client';

import { useEffect } from 'react';
import { useIsTauri } from '@/lib/utils/is-tauri';

const c = {
  linen: '#F1EDEA',
  parchment: '#FAF9F6',
  charcoal: '#2D2D2D',
  dawn: '#E8845C',
  slate: '#8D99AE',
  playfair: "var(--font-playfair), 'Playfair Display', Georgia, serif",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isTauri = useIsTauri();

  // Set the donna_client cookie as early as possible so middleware
  // can distinguish desktop from web on all subsequent navigations
  useEffect(() => {
    if (isTauri) {
      document.cookie = 'donna_client=desktop;path=/;max-age=31536000;samesite=lax';
    }
  }, [isTauri]);

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: c.parchment,
      }}
    >
      {/* Brand panel — Linen background, editorial. Always visible (desktop-only app). */}
      <div
        style={{
          width: '45%',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '40px',
          background: c.linen,
        }}
      >
        {/* Wordmark */}
        <div>
          <span
            style={{
              fontFamily: c.playfair,
              fontWeight: 700,
              fontSize: '22px',
              color: c.charcoal,
              letterSpacing: '-0.01em',
            }}
          >
            Donna<span style={{ color: c.dawn }}>.</span>
          </span>
        </div>

        {/* Editorial headline */}
        <div style={{ maxWidth: '360px' }}>
          <h2
            style={{
              fontFamily: c.playfair,
              fontWeight: 700,
              fontSize: '42px',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: c.charcoal,
              margin: 0,
              marginBottom: '16px',
            }}
          >
            Before you ask.
            <br />
            <em style={{ color: c.dawn, fontStyle: 'italic' }}>Donna already knows.</em>
          </h2>
          <p
            style={{
              fontSize: '15px',
              lineHeight: 1.65,
              color: c.slate,
              margin: 0,
            }}
          >
            One proactive daily briefing across your entire digital life.
            Know what matters, what you promised, and what to do first.
          </p>
        </div>

        {/* Footnote */}
        <p
          style={{
            fontSize: '12px',
            color: 'rgba(141,153,174,0.6)',
            margin: 0,
          }}
        >
          Secure by default. Your data never leaves your control.
        </p>
      </div>

      {/* Form panel — Parchment background */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          background: c.parchment,
        }}
      >
        {children}
      </div>
    </div>
  );
}
