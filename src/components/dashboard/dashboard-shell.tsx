'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/db/browser-client';
import {
  LayoutDashboard,
  Inbox,
  Calendar,
  CheckCircle2,
  Users,
  Activity,
  Zap,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { FeedbackWidget } from '@/components/shared/FeedbackWidget';

const navItems = [
  { href: '/dashboard', label: 'Briefing', icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/commitments', label: 'Commitments', icon: CheckCircle2 },
  { href: '/people', label: 'People', icon: Users },
  { href: '/heartbeat', label: 'Heartbeat', icon: Activity },
  { href: '/operations', label: 'Operations', icon: Zap },
];

const bottomItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
];

/* Color tokens — dark theme matching landing page */
const t = {
  bg: '#0A0A0B',
  surface: 'rgba(255,255,255,0.04)',
  surfaceSubtle: 'rgba(255,255,255,0.02)',
  border: 'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.14)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.85)',
  textTertiary: 'rgba(255,255,255,0.55)',
  textQuaternary: 'rgba(255,255,255,0.35)',
  activeAccent: 'rgba(168,153,104,0.12)',
  activeBorder: 'rgba(168,153,104,0.25)',
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);

  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect -- intentional hydration guard
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()
          .then(({ data }: { data: { is_admin: boolean } | null }) => {
            if (data?.is_admin) setIsAdmin(true);
          });
      }
    });
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <>
      <link
        href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,600,700&display=swap"
        rel="stylesheet"
      />
      <div
        className="flex min-h-screen"
        style={{
          fontFamily: "'Satoshi', sans-serif",
          background: t.bg,
          color: t.text,
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      >
        {/* ── Sidebar ── */}
        <aside
          className="fixed top-0 left-0 flex h-screen w-[240px] shrink-0 flex-col overflow-y-auto z-30"
          style={{
            background: t.surface,
            borderRight: `1px solid ${t.border}`,
          }}
        >
          {/* Brand */}
          <div className="flex h-16 items-center gap-3 px-6">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-black tracking-tight"
              style={{ background: t.text, color: t.bg }}
            >
              CS
            </div>
            <span
              className="text-[14px] font-bold tracking-[-0.02em]"
              style={{ color: t.text }}
            >
              Donna
            </span>
          </div>

          {/* Divider */}
          <div className="mx-5" style={{ height: 1, background: t.border }} />

          {/* Nav */}
          <nav className="flex flex-1 flex-col gap-0.5 px-3 pt-4">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center gap-2.5 rounded-lg px-3 py-[9px] text-[13px] font-medium transition-all duration-200"
                  style={{
                    background: active ? t.activeAccent : 'transparent',
                    border: `1px solid ${active ? t.activeBorder : 'transparent'}`,
                    color: active ? t.text : t.textTertiary,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.color = t.textSecondary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = t.textTertiary;
                    }
                  }}
                >
                  <Icon size={16} style={{ opacity: active ? 1 : 0.55 }} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className="px-3 pb-4">
            <div className="mb-2 mx-2" style={{ height: 1, background: t.border }} />

            {bottomItems.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-[9px] text-[13px] font-medium transition-all duration-200"
                  style={{
                    background: active ? t.activeAccent : 'transparent',
                    border: `1px solid ${active ? t.activeBorder : 'transparent'}`,
                    color: active ? t.text : t.textTertiary,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.color = t.textSecondary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = t.textTertiary;
                    }
                  }}
                >
                  <Icon size={16} style={{ opacity: active ? 1 : 0.55 }} />
                  {label}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-2.5 rounded-lg px-3 py-[9px] text-[13px] font-medium transition-all duration-200"
                style={{
                  background: isActive('/admin') ? t.activeAccent : 'transparent',
                  border: `1px solid ${isActive('/admin') ? t.activeBorder : 'transparent'}`,
                  color: isActive('/admin') ? t.text : t.textTertiary,
                }}
              >
                <ShieldCheck size={16} style={{ opacity: isActive('/admin') ? 1 : 0.55 }} />
                Admin
              </Link>
            )}

            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-[9px] text-[13px] font-medium transition-all duration-200"
              style={{ color: t.textQuaternary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = t.textSecondary;
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = t.textQuaternary;
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <LogOut size={16} style={{ opacity: 0.5 }} />
              Sign out
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 ml-[240px] overflow-y-auto">
          <div className="mx-auto max-w-[1400px] px-8 py-10 animate-fade-in">
            {children}
          </div>
        </main>

        <FeedbackWidget />
      </div>
    </>
  );
}
