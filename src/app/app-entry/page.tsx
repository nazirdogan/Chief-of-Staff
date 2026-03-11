'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /app-entry — Tauri desktop app entry point.
 *
 * Loaded by the desktop app on every launch (tauri.conf.json `url` points here).
 * Sets the `donna_client=desktop` cookie so that all subsequent middleware checks
 * can identify this as a desktop session, then redirects to /login after a brief
 * branded splash screen.
 *
 * Web users who somehow land here will also be redirected to /login, where the
 * middleware will catch them and redirect to /download (no desktop cookie set).
 */

const c = {
  linen: '#F1EDEA',
  charcoal: '#2D2D2D',
  dawn: '#E8845C',
  slate: '#8D99AE',
  playfair: "var(--font-playfair), 'Playfair Display', Georgia, serif",
  dmSans: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
};

export default function AppEntryPage() {
  const router = useRouter();

  useEffect(() => {
    // Only set the desktop cookie when running inside Tauri
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      document.cookie = 'donna_client=desktop;path=/;max-age=31536000;samesite=lax';
    }

    const timer = setTimeout(() => {
      router.replace('/login');
    }, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <>
      <style>{`
        @keyframes donnaFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .donna-splash-wordmark {
          animation: donnaFadeIn 0.6s ease forwards;
        }
        .donna-splash-tagline {
          animation: donnaFadeIn 0.6s ease 0.2s forwards;
          opacity: 0;
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          background: c.linen,
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {/* Wordmark */}
        <div className="donna-splash-wordmark">
          <span
            style={{
              fontFamily: c.playfair,
              fontWeight: 700,
              fontStyle: 'italic',
              fontSize: '56px',
              letterSpacing: '-0.025em',
              color: c.charcoal,
              lineHeight: 1,
            }}
          >
            Donna<span style={{ color: c.dawn }}>.</span>
          </span>
        </div>

        {/* Tagline */}
        <p
          className="donna-splash-tagline"
          style={{
            fontFamily: c.dmSans,
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: c.slate,
            margin: '14px 0 0',
          }}
        >
          Personal Intelligence
        </p>
      </div>
    </>
  );
}
