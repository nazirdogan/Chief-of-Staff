'use client';

import { useIsTauri } from '@/lib/utils/is-tauri';
import { DotGlobeHero } from '@/components/ui/globe-hero';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isTauri = useIsTauri();

  if (isTauri) {
    return (
      <DotGlobeHero
        className="min-h-screen"
        rotationSpeed={0.003}
        globeRadius={1.2}
      >
        <div className="flex flex-col items-center gap-6">
          {/* Brand lockup — Meridian mark + italic wordmark */}
          <div className="flex items-center gap-3">
            <svg width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" rx="18" fill="#1B1F3A"/>
              <path d="M26 18 L26 82 L44 82 C76 82 80 66 80 50 C80 34 76 18 44 18 Z"
                    fill="none" stroke="#FBF7F4" strokeWidth="4.5" strokeLinejoin="round"/>
              <line x1="26" y1="50" x2="72" y2="50" stroke="#E8845C" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="26" cy="50" r="5" fill="#E8845C"/>
            </svg>
            <span
              className="text-[22px]"
              style={{
                fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
                fontWeight: 300,
                fontStyle: 'italic',
                color: '#FBF7F4',
              }}
            >
              donna
            </span>
          </div>
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </DotGlobeHero>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel — Midnight background */}
      <div
        className="hidden w-1/2 flex-col justify-between p-10 lg:flex"
        style={{ background: '#1B1F3A', color: '#FBF7F4' }}
      >
        {/* Logo lockup */}
        <div className="flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="18" fill="#0E1225"/>
            <path d="M26 18 L26 82 L44 82 C76 82 80 66 80 50 C80 34 76 18 44 18 Z"
                  fill="none" stroke="#FBF7F4" strokeWidth="4.5" strokeLinejoin="round"/>
            <line x1="26" y1="50" x2="72" y2="50" stroke="#E8845C" strokeWidth="3" strokeLinecap="round"/>
            <circle cx="26" cy="50" r="5" fill="#E8845C"/>
          </svg>
          <span
            className="text-[20px]"
            style={{
              fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
              fontWeight: 300,
              fontStyle: 'italic',
              color: '#FBF7F4',
            }}
          >
            donna
          </span>
        </div>

        <div className="max-w-md space-y-4">
          <h2
            className="text-[42px] leading-[1.05] tracking-[-0.02em]"
            style={{
              fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
              fontWeight: 300,
              color: '#FBF7F4',
            }}
          >
            See everything.
            <br />
            <em style={{ color: '#E8845C' }}>Miss nothing.</em>
          </h2>
          <p className="text-[15px] leading-relaxed" style={{ color: '#9BAFC4' }}>
            One proactive daily briefing across your entire digital life.
            Know what matters, what you promised, and what to do first.
          </p>
        </div>

        <p className="text-xs" style={{ color: 'rgba(155,175,196,0.4)' }}>
          Secure by default. Your data never leaves your control.
        </p>
      </div>

      {/* Form panel — Deep background */}
      <div
        className="flex w-full flex-1 items-center justify-center px-4 lg:w-1/2"
        style={{ background: '#0E1225' }}
      >
        {children}
      </div>
    </div>
  );
}
