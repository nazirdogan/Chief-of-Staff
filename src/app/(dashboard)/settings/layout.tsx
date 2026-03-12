'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sun,
  User,
  Shield,
  MessageCircle,
  CreditCard,
  Receipt,
  Plug,
  Zap,
  Lock,
  Database,
  Bell,
} from 'lucide-react';

const navItems = [
  { href: '/settings/general', label: 'General', icon: User },
  { href: '/settings/appearance', label: 'Appearance', icon: Sun },
  { href: '/settings/chat', label: 'Chat', icon: MessageCircle },
  { href: '/settings/autonomy', label: 'Autonomy', icon: Zap },
  { href: '/settings/privacy', label: 'Privacy Controls', icon: Shield },
  { href: '/settings/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings/integrations', label: 'Integrations', icon: Plug },
  { href: '/settings/pricing', label: 'Pricing', icon: CreditCard },
  { href: '/settings/billing', label: 'Billing', icon: Receipt },
  { href: '/settings/security', label: 'Security', icon: Lock },
  { href: '/settings/data', label: 'Data', icon: Database },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="-mx-8 -my-8 flex" style={{ minHeight: 'calc(100vh - 64px)' }}>

      {/* ── Settings sidebar — sticky, never scrolls ── */}
      <aside
        className="sticky top-0 self-start shrink-0"
        style={{
          width: 200,
          height: '100vh',
          borderRight: '1px solid var(--border)',
          background: 'transparent',
        }}
      >
        <div className="px-4 pt-7 pb-6">
          <p
            className="px-3 mb-3 text-[13px] font-semibold tracking-tight"
            style={{ color: 'var(--foreground)' }}
          >
            Settings
          </p>

          <div className="space-y-0.5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-[6px] text-[13px] transition-all duration-150"
                  style={{
                    background: active ? 'rgba(232,132,92,0.10)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(232,132,92,0.20)' : 'transparent'}`,
                    color: active ? '#E8845C' : 'var(--foreground-tertiary)',
                    fontWeight: active ? 500 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'var(--surface-hover)';
                      e.currentTarget.style.color = 'var(--foreground-secondary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--foreground-tertiary)';
                    }
                  }}
                >
                  <Icon size={14} style={{ opacity: active ? 1 : 0.6, flexShrink: 0 }} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ── Content — scrolls independently ── */}
      <div className="flex-1 min-w-0 overflow-y-auto px-10 py-8" style={{ height: '100vh' }}>
        {children}
      </div>
    </div>
  );
}
