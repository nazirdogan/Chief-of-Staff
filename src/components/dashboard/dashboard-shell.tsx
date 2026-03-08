'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/db/browser-client';
import { useChatStore } from '@/stores/chat-store';
import {
  LayoutDashboard,
  Inbox,
  Calendar,
  CheckCircle2,
  Users,
  Settings,
  LogOut,
  ShieldCheck,
  MessageCircle,
  Zap,
  Plus,
  Trash2,
  BookOpen,
} from 'lucide-react';
import { FeedbackWidget } from '@/components/shared/FeedbackWidget';
import { CommandPalette } from '@/components/search/CommandPalette';
import { OneTapConfirmToast } from '@/components/shared/OneTapConfirmToast';
import { useOneTapQueue } from '@/hooks/useOneTapQueue';

/* ── Navigation structure ── */
const navItems = [
  { href: '/chat', label: 'Ask Donna', icon: MessageCircle },
  { href: '/operations', label: 'Operations', icon: Zap },
  { href: '/dashboard', label: 'Briefing', icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/commitments', label: 'Commitments', icon: CheckCircle2 },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/people', label: 'People', icon: Users },
  { href: '/reflections', label: 'Reflections', icon: BookOpen },
];

/* Donna brand tokens */
const t = {
  bg: '#1B1F3A',
  deep: '#0E1225',
  surface: 'rgba(255,255,255,0.05)',
  border: 'rgba(251,247,244,0.08)',
  borderHover: 'rgba(251,247,244,0.16)',
  text: '#FBF7F4',
  textSecondary: 'rgba(251,247,244,0.85)',
  textTertiary: 'rgba(155,175,196,0.85)',
  textQuaternary: 'rgba(155,175,196,0.45)',
  dawn: '#E8845C',
  activeAccent: 'rgba(232,132,92,0.12)',
  activeBorder: 'rgba(232,132,92,0.30)',
};

function NavItem({ href, label, icon: Icon, pathname }: { href: string; label: string; icon: typeof LayoutDashboard; pathname: string }) {
  const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className="group flex items-center gap-2.5 rounded-lg px-3 py-[9px] text-[13px] font-medium transition-all duration-150"
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
      <Icon size={16} style={{ opacity: active ? 1 : 0.55, color: active ? t.dawn : undefined }} />
      {label}
    </Link>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const conversations = useChatStore((s) => s.conversations);
  const loadConversations = useChatStore((s) => s.loadConversations);

  const { current: currentToast, resolve: resolveToast } = useOneTapQueue();

  const supabase = getSupabaseBrowserClient();

  // Load chat history for sidebar
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Check if a Tier 3 dialog is open — defer toast rendering
  useEffect(() => {
    const check = setInterval(() => {
      setDialogOpen(!!document.querySelector('[role=dialog]'));
    }, 500);
    return () => clearInterval(check);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdkOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  return (
    <>
      <div
        className="flex min-h-screen"
        style={{
          fontFamily: "'Inter', sans-serif",
          background: t.bg,
          color: t.text,
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      >
        {/* ── Sidebar ── */}
        <aside
          className="fixed top-0 left-0 flex h-screen w-[220px] shrink-0 flex-col overflow-y-auto z-30"
          style={{
            background: t.deep,
            borderRight: `1px solid ${t.border}`,
          }}
        >
          {/* Brand lockup */}
          <div className="flex h-14 items-center gap-3 px-5">
            <svg width="26" height="26" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" rx="18" fill="#1B1F3A"/>
              <path d="M26 18 L26 82 L44 82 C76 82 80 66 80 50 C80 34 76 18 44 18 Z"
                    fill="none" stroke="#FBF7F4" strokeWidth="4.5" strokeLinejoin="round"/>
              <line x1="26" y1="50" x2="72" y2="50" stroke="#E8845C" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="26" cy="50" r="5" fill="#E8845C"/>
            </svg>
            <span
              className="text-[17px] tracking-[0.01em]"
              style={{
                color: t.text,
                fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
                fontWeight: 300,
                fontStyle: 'italic',
              }}
            >
              donna
            </span>
          </div>

          {/* Divider — dawn gradient */}
          <div
            className="mx-4"
            style={{
              height: 1,
              background: `linear-gradient(90deg, ${t.dawn}, transparent)`,
              opacity: 0.25,
            }}
          />

          {/* Nav */}
          <nav className="flex flex-1 flex-col px-3 pt-3 overflow-hidden">
            <div className="space-y-0.5">
              {navItems.map((item) => (
                <NavItem key={item.href} {...item} pathname={pathname} />
              ))}
            </div>

            {/* Chat history */}
            {conversations.length > 0 && (
              <div className="mt-4 flex flex-col overflow-hidden min-h-0">
                <div className="flex items-center justify-between px-3 mb-1.5">
                  <span
                    className="text-[10px] font-semibold tracking-[0.10em] uppercase"
                    style={{ color: t.textQuaternary }}
                  >
                    Recent chats
                  </span>
                  <Link
                    href="/chat"
                    className="rounded p-0.5 transition-colors duration-150"
                    style={{ color: t.textQuaternary }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = t.textTertiary; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = t.textQuaternary; }}
                    title="New chat"
                  >
                    <Plus size={12} />
                  </Link>
                </div>
                <div className="flex-1 overflow-y-auto space-y-px min-h-0">
                  {conversations.slice(0, 15).map((conv) => {
                    const href = `/chat/${conv.id}`;
                    const active = pathname === href;
                    return (
                      <Link
                        key={conv.id}
                        href={href}
                        className="group flex items-center gap-2 rounded-lg px-3 py-[7px] text-[12px] transition-all duration-150"
                        style={{
                          background: active ? t.activeAccent : 'transparent',
                          border: `1px solid ${active ? t.activeBorder : 'transparent'}`,
                          color: active ? t.text : t.textQuaternary,
                        }}
                        onMouseEnter={(e) => {
                          if (!active) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                            e.currentTarget.style.color = t.textTertiary;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!active) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = t.textQuaternary;
                          }
                        }}
                      >
                        <MessageCircle size={12} style={{ opacity: 0.4, flexShrink: 0 }} />
                        <span className="truncate">
                          {conv.title || 'New conversation'}
                        </span>
                        {active && (
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              await fetch(`/api/chat/conversations/${conv.id}`, { method: 'DELETE' });
                              loadConversations();
                              router.push('/chat');
                            }}
                            className="ml-auto opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-0.5 rounded"
                            style={{ color: t.textQuaternary }}
                            title="Delete conversation"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1 min-h-4" />

            {/* Keyboard shortcut hint */}
            <div
              className="mx-2 mb-3 rounded-lg px-3 py-2 text-center shrink-0"
              style={{ background: t.surface }}
            >
              <p className="text-[11px]" style={{ color: t.textQuaternary }}>
                <kbd
                  className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ background: 'rgba(255,255,255,0.06)', color: t.textTertiary }}
                >
                  ⌘K
                </kbd>
                {' '}to search anything
              </p>
            </div>
          </nav>

          {/* Bottom section */}
          <div className="px-3 pb-3">
            <div
              className="mb-2 mx-2"
              style={{ height: 1, background: t.border }}
            />

            <NavItem href="/settings" label="Settings" icon={Settings} pathname={pathname} />

            {isAdmin && (
              <NavItem href="/admin" label="Admin" icon={ShieldCheck} pathname={pathname} />
            )}

            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-[9px] text-[13px] font-medium transition-all duration-150"
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
        <main className="flex-1 ml-[220px] overflow-y-auto">
          <div className="mx-auto max-w-[1200px] px-8 py-8 animate-fade-in">
            {children}
          </div>
        </main>

        <FeedbackWidget />
        <CommandPalette open={cmdkOpen} onOpenChange={setCmdkOpen} />

        {/* Tier 2 one-tap confirm toast — hidden when Tier 3 dialog is open */}
        {currentToast && !dialogOpen && (
          <OneTapConfirmToast action={currentToast} onResolve={resolveToast} />
        )}
      </div>
    </>
  );
}
