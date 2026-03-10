'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/db/browser-client';
import { useChatStore } from '@/stores/chat-store';
import {
  LayoutDashboard,
  Inbox,
  CheckCircle2,
  Users,
  Settings,
  LogOut,
  MessageCircle,
  Plus,
  Trash2,
  BookOpen,
} from 'lucide-react';
import { FeedbackWidget } from '@/components/shared/FeedbackWidget';
import { CommandPalette } from '@/components/search/CommandPalette';
import { OneTapConfirmToast } from '@/components/shared/OneTapConfirmToast';
import { useOneTapQueue } from '@/hooks/useOneTapQueue';
import { CatchUpBanner } from '@/components/catch-up/CatchUpBanner';
import { useCatchUpStore } from '@/stores/catch-up-store';

/* ── Navigation structure ── */
const navItems = [
  { href: '/chat', label: 'Ask Donna', icon: MessageCircle },
  { href: '/dashboard', label: 'Today', icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/commitments', label: 'Commitments', icon: CheckCircle2 },
  { href: '/people', label: 'People', icon: Users },
  { href: '/reflections', label: 'Reflections', icon: BookOpen },
];

/* Donna brand tokens — The Editor */
const t = {
  bg: '#FAF9F6',         // parchment — main content background
  deep: '#F1EDEA',       // linen — sidebar background
  surface: 'rgba(45,45,45,0.04)',
  border: 'rgba(45,45,45,0.08)',
  borderHover: 'rgba(45,45,45,0.16)',
  text: '#2D2D2D',       // charcoal
  textSecondary: 'rgba(45,45,45,0.8)',
  textTertiary: 'rgba(141,153,174,0.85)',   // slate
  textQuaternary: 'rgba(141,153,174,0.5)',
  dawn: '#E8845C',
  activeAccent: 'rgba(232,132,92,0.1)',
  activeBorder: 'rgba(232,132,92,0.25)',
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
          e.currentTarget.style.background = 'rgba(45,45,45,0.05)';
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
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const conversations = useChatStore((s) => s.conversations);
  const loadConversations = useChatStore((s) => s.loadConversations);

  const { current: currentToast, resolve: resolveToast } = useOneTapQueue();
  const setCatchUpState = useCatchUpStore((s) => s.setState);
  const setStaleWarnings = useCatchUpStore((s) => s.setStaleWarnings);

  const supabase = getSupabaseBrowserClient();

  // Load chat history for sidebar
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Boot the local worker system (catch-up + scheduler) via API
  useEffect(() => {
    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | null = null;

    async function boot() {
      try {
        // Read app_closed_at from localStorage for gap calculation
        const APP_CLOSED_KEY = 'donna_app_closed_at';
        const stored = localStorage.getItem(APP_CLOSED_KEY);
        const appClosedAt = stored ? parseInt(stored, 10) : undefined;

        // Boot worker server-side
        const res = await fetch('/api/worker/boot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appClosedAt: isNaN(appClosedAt as number) ? undefined : appClosedAt }),
        });

        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.state && !cancelled) {
          setCatchUpState(data.state);
        }

        // Poll for state updates (fast during catch-up, slow for ongoing health)
        let pollInterval = 2000;
        const startPoll = () => {
          pollId = setInterval(async () => {
            try {
              const statusRes = await fetch('/api/worker/status');
              if (!statusRes.ok || cancelled) return;
              const statusData = await statusRes.json();
              if (statusData.state && !cancelled) {
                const prev = useCatchUpStore.getState().state;
                if (JSON.stringify(prev) !== JSON.stringify(statusData.state)) {
                  setCatchUpState(statusData.state);
                }
              }
              if (statusData.staleWarnings && !cancelled) {
                setStaleWarnings(statusData.staleWarnings);
              }
              // Switch to slower polling once catch-up is done
              if (pollInterval === 2000 && statusData.state?.status !== 'running') {
                if (pollId) clearInterval(pollId);
                pollInterval = 30_000;
                startPoll();
              }
            } catch {
              // Polling failure is non-fatal
            }
          }, pollInterval);
        };
        startPoll();
      } catch {
        // Worker boot failure is non-fatal
      }
    }
    boot();

    // Save close timestamp and stop worker on unmount
    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
      localStorage.setItem('donna_app_closed_at', String(Date.now()));
      fetch('/api/worker/stop', { method: 'POST' }).catch(() => {});
    };
  }, [setCatchUpState, setStaleWarnings]);

  // Start desktop observer frontend listener + heartbeat (Tauri only)
  // The Rust backend auto-starts the AX loop, but the JS event listener
  // must be registered to receive events and flush context to the API.
  useEffect(() => {
    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) return;

    // Ensure the donna_client cookie is set for middleware platform detection
    document.cookie = 'donna_client=desktop;path=/;max-age=31536000;samesite=lax';

    let stopFn: (() => Promise<void>) | null = null;
    let stopHeartbeatFn: (() => void) | null = null;
    let observerRunning = false;
    let observationCount = 0;

    async function boot() {
      try {
        const { startObserver, stopObserver, getObserverStatus } = await import('@/lib/desktop-observer/client');
        const started = await startObserver();
        if (started) {
          stopFn = stopObserver;
          observerRunning = true;
          console.log('[DashboardShell] Desktop observer listener started');

          // Get initial observation count
          try {
            const status = await getObserverStatus();
            if (status) observationCount = status.context_changes_emitted ?? 0;
          } catch {
            // Non-fatal
          }
        }
      } catch {
        // Desktop observer not available — non-fatal
      }

      // Start heartbeat regardless of observer status
      try {
        const { startHeartbeat } = await import('@/lib/desktop/heartbeat');
        stopHeartbeatFn = startHeartbeat(() => ({
          observer_running: observerRunning,
          observation_count: observationCount,
        }));
        console.log('[DashboardShell] Desktop heartbeat started');
      } catch {
        // Heartbeat not available — non-fatal
      }
    }
    boot();

    return () => {
      stopFn?.().catch(() => {});
      stopHeartbeatFn?.();
    };
  }, []);

  // Check if a Tier 3 dialog is open — defer toast rendering
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDialogOpen(!!document.querySelector('[role=dialog]'));
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
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
          fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
          background: t.bg,
          color: t.text,
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
          <div className="flex h-14 items-center px-5">
            <span
              className="text-[20px] tracking-[-0.01em]"
              style={{
                color: t.text,
                fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                fontWeight: 700,
                fontStyle: 'italic',
              }}
            >
              Donna<span style={{ color: t.dawn }}>.</span>
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
                            e.currentTarget.style.background = 'rgba(45,45,45,0.05)';
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
                  style={{ background: 'rgba(45,45,45,0.06)', color: t.textTertiary }}
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

            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-[9px] text-[13px] font-medium transition-all duration-150"
              style={{ color: t.textQuaternary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = t.textSecondary;
                e.currentTarget.style.background = 'rgba(45,45,45,0.05)';
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
            <CatchUpBanner />
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
