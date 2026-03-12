'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

type ThemeOption = 'light' | 'dark' | 'system';

function LightPreview() {
  return (
    <div className="relative h-[108px] w-full overflow-hidden rounded-lg" style={{ background: '#FAF9F6', border: '1px solid rgba(45,45,45,0.08)' }}>
      {/* Sidebar */}
      <div className="absolute left-0 top-0 h-full w-[44px]" style={{ background: '#F1EDEA', borderRight: '1px solid rgba(45,45,45,0.08)' }}>
        <div className="pt-3 pl-2.5">
          <div className="text-[7px] font-bold tracking-tight" style={{ color: '#2D2D2D', fontFamily: 'Georgia, serif' }}>D.</div>
          <div className="mt-2.5 space-y-1.5">
            {[0.7, 0.45, 0.45, 0.45].map((op, i) => (
              <div key={i} className="h-1.5 rounded-full" style={{ width: i === 0 ? 28 : 22, background: `rgba(45,45,45,${op})` }} />
            ))}
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="absolute left-[44px] top-0 h-full flex-1 p-3">
        <div className="h-2 w-20 rounded-full mb-2" style={{ background: 'rgba(45,45,45,0.15)' }} />
        <div className="space-y-1.5">
          <div className="h-[22px] w-full rounded-md" style={{ background: '#FFFFFF', border: '1px solid rgba(45,45,45,0.08)' }}>
            <div className="h-full flex items-center px-2">
              <div className="h-1 w-12 rounded-full" style={{ background: 'rgba(45,45,45,0.2)' }} />
            </div>
          </div>
          <div className="h-[22px] w-full rounded-md" style={{ background: '#FFFFFF', border: '1px solid rgba(45,45,45,0.08)' }}>
            <div className="h-full flex items-center px-2">
              <div className="h-1 w-8 rounded-full" style={{ background: 'rgba(45,45,45,0.12)' }} />
            </div>
          </div>
          <div className="h-[22px] w-full rounded-md" style={{ background: '#FFFFFF', border: '1px solid rgba(45,45,45,0.08)' }}>
            <div className="h-full flex items-center px-2">
              <div className="h-1 w-16 rounded-full" style={{ background: 'rgba(45,45,45,0.12)' }} />
            </div>
          </div>
        </div>
        {/* Dawn accent bar */}
        <div className="absolute bottom-3 left-[56px] right-3 h-1 rounded-full" style={{ background: '#E8845C', opacity: 0.35 }} />
      </div>
    </div>
  );
}

function DarkPreview() {
  return (
    <div className="relative h-[108px] w-full overflow-hidden rounded-lg" style={{ background: '#0E1225', border: '1px solid rgba(251,247,244,0.10)' }}>
      {/* Sidebar */}
      <div className="absolute left-0 top-0 h-full w-[44px]" style={{ background: '#111728', borderRight: '1px solid rgba(251,247,244,0.08)' }}>
        <div className="pt-3 pl-2.5">
          <div className="text-[7px] font-bold tracking-tight" style={{ color: '#FBF7F4', fontFamily: 'Georgia, serif' }}>D.</div>
          <div className="mt-2.5 space-y-1.5">
            {[0.7, 0.35, 0.35, 0.35].map((op, i) => (
              <div key={i} className="h-1.5 rounded-full" style={{ width: i === 0 ? 28 : 22, background: `rgba(251,247,244,${op})` }} />
            ))}
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="absolute left-[44px] top-0 h-full flex-1 p-3">
        <div className="h-2 w-20 rounded-full mb-2" style={{ background: 'rgba(251,247,244,0.15)' }} />
        <div className="space-y-1.5">
          <div className="h-[22px] w-full rounded-md" style={{ background: '#1B1F3A', border: '1px solid rgba(251,247,244,0.10)' }}>
            <div className="h-full flex items-center px-2">
              <div className="h-1 w-12 rounded-full" style={{ background: 'rgba(251,247,244,0.2)' }} />
            </div>
          </div>
          <div className="h-[22px] w-full rounded-md" style={{ background: '#1B1F3A', border: '1px solid rgba(251,247,244,0.08)' }}>
            <div className="h-full flex items-center px-2">
              <div className="h-1 w-8 rounded-full" style={{ background: 'rgba(251,247,244,0.12)' }} />
            </div>
          </div>
          <div className="h-[22px] w-full rounded-md" style={{ background: '#1B1F3A', border: '1px solid rgba(251,247,244,0.08)' }}>
            <div className="h-full flex items-center px-2">
              <div className="h-1 w-16 rounded-full" style={{ background: 'rgba(251,247,244,0.12)' }} />
            </div>
          </div>
        </div>
        {/* Dawn accent bar */}
        <div className="absolute bottom-3 left-[56px] right-3 h-1 rounded-full" style={{ background: '#E8845C', opacity: 0.45 }} />
      </div>
    </div>
  );
}

function SystemPreview() {
  return (
    <div className="relative h-[108px] w-full overflow-hidden rounded-lg" style={{ border: '1px solid rgba(155,175,196,0.2)' }}>
      {/* Left half — light */}
      <div className="absolute left-0 top-0 h-full w-1/2 overflow-hidden" style={{ background: '#FAF9F6' }}>
        <div className="absolute left-0 top-0 h-full w-[44px]" style={{ background: '#F1EDEA' }}>
          <div className="pt-3 pl-2.5">
            <div className="text-[7px] font-bold" style={{ color: '#2D2D2D', fontFamily: 'Georgia, serif' }}>D.</div>
            <div className="mt-2.5 space-y-1.5">
              {[0.7, 0.45].map((op, i) => (
                <div key={i} className="h-1.5 rounded-full" style={{ width: i === 0 ? 22 : 16, background: `rgba(45,45,45,${op})` }} />
              ))}
            </div>
          </div>
        </div>
        <div className="absolute left-[44px] top-3 right-0 space-y-1.5 px-2">
          <div className="h-1.5 rounded-full" style={{ background: 'rgba(45,45,45,0.15)', width: '70%' }} />
          <div className="h-[18px] w-full rounded-md" style={{ background: '#FFFFFF', border: '1px solid rgba(45,45,45,0.08)' }} />
          <div className="h-[18px] w-full rounded-md" style={{ background: '#FFFFFF', border: '1px solid rgba(45,45,45,0.06)' }} />
        </div>
      </div>
      {/* Diagonal clip / divider */}
      <div
        className="absolute top-0 h-full"
        style={{
          left: 'calc(50% - 8px)',
          width: 16,
          background: 'linear-gradient(to right, #FAF9F6, #0E1225)',
          zIndex: 1,
        }}
      />
      {/* Right half — dark */}
      <div className="absolute right-0 top-0 h-full w-1/2 overflow-hidden" style={{ background: '#0E1225' }}>
        <div className="absolute left-0 top-3 right-0 space-y-1.5 px-2">
          <div className="h-1.5 rounded-full" style={{ background: 'rgba(251,247,244,0.15)', width: '70%' }} />
          <div className="h-[18px] w-full rounded-md" style={{ background: '#1B1F3A', border: '1px solid rgba(251,247,244,0.10)' }} />
          <div className="h-[18px] w-full rounded-md" style={{ background: '#1B1F3A', border: '1px solid rgba(251,247,244,0.06)' }} />
        </div>
      </div>
      {/* macOS symbol overlay */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
        <div className="rounded-full flex items-center justify-center" style={{ width: 28, height: 28, background: 'rgba(155,175,196,0.15)', backdropFilter: 'blur(4px)', border: '1px solid rgba(155,175,196,0.25)' }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="6.5" cy="6.5" r="5.5" stroke="rgba(155,175,196,0.8)" strokeWidth="1"/>
            <path d="M6.5 1v5.5l3.5 2" stroke="rgba(155,175,196,0.8)" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

const THEMES: { value: ThemeOption; label: string; description: string; Preview: () => React.JSX.Element }[] = [
  { value: 'light', label: 'Light', description: 'Parchment & charcoal', Preview: LightPreview },
  { value: 'dark', label: 'Dark', description: 'Midnight navy', Preview: DarkPreview },
  { value: 'system', label: 'System', description: 'Follows macOS setting', Preview: SystemPreview },
];

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const current = mounted ? (theme as ThemeOption) ?? 'system' : 'system';

  return (
    <div className="p-6 max-w-2xl">

      <div className="mt-4">
        <h1 className="text-xl font-semibold tracking-tight">Appearance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how Donna looks on this device.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4">
        {THEMES.map(({ value, label, description, Preview }) => {
          const selected = current === value;
          return (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className="group flex flex-col gap-3 rounded-xl p-3 text-left transition-all duration-200 focus:outline-none"
              style={{
                border: selected ? '2px solid #E8845C' : '2px solid var(--border)',
                background: selected ? 'rgba(232,132,92,0.04)' : 'transparent',
              }}
            >
              <div className="relative w-full">
                <Preview />
                {selected && (
                  <div
                    className="absolute bottom-2 right-2 flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ background: '#E8845C' }}
                  >
                    <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
                  </div>
                )}
              </div>
              <div className="px-1">
                <p className="text-[13px] font-semibold" style={{ color: selected ? '#E8845C' : 'var(--foreground)' }}>
                  {label}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  {description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl p-4" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
        <p className="text-[13px] font-medium">About System mode</p>
        <p className="mt-1 text-[12px] leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
          When set to System, Donna automatically switches between light and dark based on your macOS appearance setting in System Settings &#x2192; Appearance.
        </p>
      </div>
    </div>
  );
}
