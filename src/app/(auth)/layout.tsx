'use client';

import { useEffect } from 'react';
import { useIsTauri } from '@/lib/utils/is-tauri';

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
    <div className="flex min-h-screen">
      {/* Brand panel — Linen background, editorial */}
      <div
        className="hidden w-1/2 flex-col justify-between p-10 lg:flex"
        style={{ background: '#F1EDEA', color: '#2D2D2D' }}
      >
        {/* Logo lockup */}
        <div className="flex items-center gap-2">
          <span
            className="text-[22px]"
            style={{
              fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
              fontWeight: 700,
              color: '#2D2D2D',
            }}
          >
            Donna<span style={{ color: '#E8845C' }}>.</span>
          </span>
        </div>

        <div className="max-w-md space-y-4">
          <h2
            className="text-[42px] leading-[1.05] tracking-[-0.02em]"
            style={{
              fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
              fontWeight: 700,
              color: '#2D2D2D',
            }}
          >
            Before you ask.
            <br />
            <em style={{ color: '#E8845C', fontStyle: 'italic' }}>Donna already knows.</em>
          </h2>
          <p className="text-[15px] leading-relaxed" style={{ color: '#8D99AE' }}>
            One proactive daily briefing across your entire digital life.
            Know what matters, what you promised, and what to do first.
          </p>
        </div>

        <p className="text-xs" style={{ color: 'rgba(141,153,174,0.6)' }}>
          Secure by default. Your data never leaves your control.
        </p>
      </div>

      {/* Form panel — Parchment background */}
      <div
        className="flex w-full flex-1 items-center justify-center px-4 lg:w-1/2"
        style={{ background: '#FAF9F6' }}
      >
        {children}
      </div>
    </div>
  );
}
