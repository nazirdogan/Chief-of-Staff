'use client'

import * as React from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Inbox,
  CheckCircle2,
  Users,
  MessageCircle,
  Brain,
  BarChart3,
  Zap,
  Mail,
  CalendarDays,
  MessageSquare,
  FileText,
  CheckCircle,
  SearchIcon,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Clock,
  BookOpen,
  Settings,
  SlidersHorizontal,
} from 'lucide-react'
import {
  Dialog,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Command } from 'cmdk'
import type { NavHistoryEntry } from '@/hooks/useNavigationHistory'
import { searchSettings, type SettingsSearchItem } from '@/lib/search/settings-index'

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const t = {
  bg: '#FFFFFF',
  surface: 'rgba(45,45,45,0.04)',
  border: 'rgba(45,45,45,0.08)',
  dawn: '#E8845C',
  text: '#2D2D2D',
  textSecondary: 'rgba(45,45,45,0.8)',
  textTertiary: 'rgba(45,45,45,0.6)',
  textMuted: 'rgba(45,45,45,0.5)',
  textGhost: 'rgba(45,45,45,0.4)',
} as const

// ---------------------------------------------------------------------------
// Page registry
// ---------------------------------------------------------------------------
const pages = [
  { label: 'Today', path: '/today', icon: LayoutDashboard, shortcut: 'T' },
  { label: 'Inbox', path: '/inbox', icon: Inbox, shortcut: 'I' },
  { label: 'Tasks', path: '/tasks', icon: CheckCircle2, shortcut: 'M' },
  { label: 'People', path: '/people', icon: Users, shortcut: 'P' },
  { label: 'Chat', path: '/chat', icon: MessageCircle, shortcut: 'C' },
  { label: 'Reflections', path: '/reflections', icon: BookOpen, shortcut: 'R' },
  { label: 'Patterns', path: '/patterns', icon: BarChart3, shortcut: 'A' },
  { label: 'Settings', path: '/settings', icon: Settings, shortcut: 'S' },
] as const

const pathIconMap: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  '/today': LayoutDashboard,
  '/inbox': Inbox,
  '/tasks': CheckCircle2,
  '/people': Users,
  '/chat': MessageCircle,
  '/reflections': BookOpen,
  '/settings': Settings,
  '/patterns': BarChart3,
  '/memory': Brain,
}

function getIconForPath(path: string) {
  for (const [prefix, icon] of Object.entries(pathIconMap)) {
    if (path === prefix || path.startsWith(prefix + '/')) return icon
  }
  return LayoutDashboard
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MemoryResult {
  id: string
  title: string
  subtitle?: string
  type?: 'email' | 'calendar' | 'slack' | 'document' | 'task'
}

const memoryIconMap: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  email: Mail,
  calendar: CalendarDays,
  slack: MessageSquare,
  document: FileText,
  task: CheckCircle,
}

interface MessageResult {
  messageId: string
  conversationId: string
  conversationTitle: string
  snippet: string
  role: string
  createdAt: string
}

export interface RecentChat {
  id: string
  title: string | null
  updated_at: string
}

export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recentPages?: NavHistoryEntry[]
  recentChats?: RecentChat[]
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------
function ItemIcon({
  children,
  accent = false,
}: {
  children: React.ReactNode
  accent?: boolean
}) {
  return (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        background: accent ? 'rgba(232,132,92,0.08)' : t.surface,
        border: `1px solid ${accent ? 'rgba(232,132,92,0.15)' : t.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  )
}

function GroupLabel({
  icon: Icon,
  children,
}: {
  icon?: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  children: React.ReactNode
}) {
  return (
    <span
      style={{
        fontSize: 10,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: t.textGhost,
        padding: '8px 18px 3px',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
      }}
    >
      {Icon && <Icon size={9} style={{ opacity: 0.7 }} />}
      {children}
    </span>
  )
}

// Highlights the matched query term inside a string
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark
        style={{
          background: 'rgba(232,132,92,0.18)',
          color: 'inherit',
          borderRadius: 2,
          padding: '0 1px',
        }}
      >
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function CommandPalette({
  open,
  onOpenChange,
  recentPages = [],
  recentChats = [],
}: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [memoryResults, setMemoryResults] = useState<MemoryResult[]>([])
  const [messageResults, setMessageResults] = useState<MessageResult[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trimmed = query.trim()

  // Client-side filtering when query is present
  const filteredPages = trimmed
    ? pages.filter((p) => p.label.toLowerCase().includes(trimmed.toLowerCase()))
    : []

  const filteredChats = trimmed
    ? recentChats
        .filter((c) =>
          (c.title ?? 'New conversation').toLowerCase().includes(trimmed.toLowerCase()),
        )
        .slice(0, 4)
    : []

  const settingsResults: SettingsSearchItem[] = trimmed ? searchSettings(trimmed) : []

  // Debounced search: memory API + messages API
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!trimmed) {
      const id = setTimeout(() => {
        setMemoryResults([])
        setMessageResults([])
        setLoadingMessages(false)
      }, 0)
      return () => clearTimeout(id)
    }

    const loadingId = setTimeout(() => setLoadingMessages(true), 0)
    const controller = new AbortController()

    debounceRef.current = setTimeout(async () => {
      await Promise.allSettled([
        // Memory / context chunks
        fetch(`/api/context/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        })
          .then((r) => r.json())
          .then((data) => setMemoryResults(Array.isArray(data) ? data : (data.results ?? [])))
          .catch(() => {}),

        // Chat message content search
        fetch(`/api/search/messages?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        })
          .then((r) => r.json())
          .then((data) => setMessageResults(Array.isArray(data) ? data : []))
          .catch(() => {}),
      ])

      setLoadingMessages(false)
    }, 320)

    return () => {
      clearTimeout(loadingId)
      controller.abort()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [trimmed])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setQuery('')
        setMemoryResults([])
        setMessageResults([])
      }
      onOpenChange(nextOpen)
    },
    [onOpenChange],
  )

  const navigate = useCallback(
    (path: string) => {
      handleOpenChange(false)
      router.push(path)
    },
    [handleOpenChange, router],
  )

  // Pre-populate: skip the very first entry (current page) for recent pages
  const recentPagesToShow = recentPages.slice(1, 5)
  const recentChatsToShow = recentChats.slice(0, 4)

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 13.5,
    color: t.textSecondary,
    borderRadius: 8,
    margin: '1px 6px',
  }

  const hasResults = trimmed
    ? filteredPages.length > 0 ||
      filteredChats.length > 0 ||
      settingsResults.length > 0 ||
      messageResults.length > 0 ||
      memoryResults.length > 0 ||
      loadingMessages
    : recentPagesToShow.length > 0 || recentChatsToShow.length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogOverlay
        style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'none' }}
        className="!bg-transparent"
      />

      <DialogContent
        showCloseButton={false}
        className="!translate-x-[-50%] !translate-y-[-50%] !p-0 !gap-0 !border-0 !bg-transparent !shadow-none sm:!max-w-none !max-w-none"
        style={{ width: 620, background: 'transparent', border: 'none' }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>Search pages, settings, chats, and your memory</DialogDescription>
        </DialogHeader>

        <Command
          label="Search"
          shouldFilter={false}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Escape') handleOpenChange(false)
          }}
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 12px 48px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          {/* ── Search input ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '13px 16px',
              borderBottom: `1px solid ${t.border}`,
            }}
          >
            <SearchIcon size={16} style={{ color: t.textMuted, flexShrink: 0 }} />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search anything in Donna..."
              style={{
                flex: 1,
                fontSize: 15,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: t.text,
                caretColor: t.dawn,
              }}
            />
            {trimmed && loadingMessages && (
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  border: `2px solid ${t.border}`,
                  borderTopColor: t.dawn,
                  flexShrink: 0,
                  animation: 'cmd-spin 0.6s linear infinite',
                }}
              />
            )}
            {trimmed && (
              <button
                onClick={() => setQuery('')}
                style={{
                  fontSize: 10,
                  color: t.textGhost,
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 4,
                  padding: '2px 7px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                clear
              </button>
            )}
          </div>

          {/* ── Results list ── */}
          <Command.List style={{ maxHeight: 460, overflowY: 'auto', padding: '6px 0 4px' }}>
            {/* No results */}
            {!hasResults && trimmed && !loadingMessages && (
              <Command.Empty
                style={{
                  padding: '36px 16px',
                  textAlign: 'center',
                  fontSize: 13,
                  color: t.textMuted,
                }}
              >
                No results for &ldquo;{query}&rdquo;
              </Command.Empty>
            )}

            {/* ════════════════ EMPTY STATE ════════════════ */}

            {/* Recent pages */}
            {!trimmed && recentPagesToShow.length > 0 && (
              <Command.Group heading={<GroupLabel icon={Clock}>Recently visited</GroupLabel>}>
                {recentPagesToShow.map((entry) => {
                  const Icon = getIconForPath(entry.path)
                  return (
                    <Command.Item
                      key={entry.path + entry.visitedAt}
                      value={entry.path}
                      onSelect={() => navigate(entry.path)}
                      className="command-palette-item"
                      style={itemStyle}
                    >
                      <ItemIcon>
                        <Icon size={14} style={{ color: t.textTertiary }} />
                      </ItemIcon>
                      <span style={{ flex: 1 }}>{entry.label}</span>
                      <span style={{ fontSize: 11, color: t.textGhost }}>
                        {formatRelativeTime(entry.visitedAt)}
                      </span>
                    </Command.Item>
                  )
                })}
              </Command.Group>
            )}

            {/* Recent chats */}
            {!trimmed && recentChatsToShow.length > 0 && (
              <Command.Group heading={<GroupLabel icon={MessageCircle}>Recent chats</GroupLabel>}>
                {recentChatsToShow.map((chat) => (
                  <Command.Item
                    key={chat.id}
                    value={chat.id}
                    onSelect={() => navigate(`/chat/${chat.id}`)}
                    className="command-palette-item"
                    style={itemStyle}
                  >
                    <ItemIcon>
                      <MessageCircle size={14} style={{ color: t.textTertiary }} />
                    </ItemIcon>
                    <span
                      style={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {chat.title ?? 'New conversation'}
                    </span>
                    <span style={{ fontSize: 11, color: t.textGhost }}>
                      {formatRelativeTime(new Date(chat.updated_at).getTime())}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Quick actions */}
            {!trimmed && (
              <Command.Group heading={<GroupLabel icon={Zap}>Quick actions</GroupLabel>}>
                {[
                  { label: 'Prep for next meeting', query: 'Prep for next meeting' },
                  { label: "Who's waiting on me?", query: "Who's waiting on me?" },
                  { label: 'Summarize this week', query: 'Summarize this week' },
                ].map((action) => (
                  <Command.Item
                    key={action.query}
                    value={action.query}
                    onSelect={() =>
                      navigate(`/chat?q=${encodeURIComponent(action.query)}`)
                    }
                    className="command-palette-item"
                    style={itemStyle}
                  >
                    <ItemIcon accent>
                      <Zap size={13} style={{ color: t.dawn }} />
                    </ItemIcon>
                    <span style={{ flex: 1 }}>{action.label}</span>
                    <span style={{ fontSize: 11, color: t.textGhost }}>Ask Donna</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* ════════════════ SEARCH STATE ════════════════ */}

            {/* Pages */}
            {trimmed && filteredPages.length > 0 && (
              <Command.Group heading={<GroupLabel>Pages</GroupLabel>}>
                {filteredPages.map((page) => {
                  const Icon = page.icon
                  return (
                    <Command.Item
                      key={page.path}
                      value={page.path}
                      onSelect={() => navigate(page.path)}
                      className="command-palette-item"
                      style={itemStyle}
                    >
                      <ItemIcon>
                        <Icon size={14} style={{ color: t.textTertiary }} />
                      </ItemIcon>
                      <span style={{ flex: 1 }}>
                        <Highlight text={page.label} query={trimmed} />
                      </span>
                      <kbd
                        style={{
                          fontSize: 10,
                          color: t.textGhost,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: t.surface,
                          border: `1px solid ${t.border}`,
                        }}
                      >
                        {page.shortcut}
                      </kbd>
                    </Command.Item>
                  )
                })}
              </Command.Group>
            )}

            {/* Settings */}
            {trimmed && settingsResults.length > 0 && (
              <Command.Group heading={<GroupLabel icon={SlidersHorizontal}>Settings</GroupLabel>}>
                {settingsResults.map((item) => (
                  <Command.Item
                    key={`${item.path}::${item.label}`}
                    value={`settings::${item.label}`}
                    onSelect={() => navigate(item.path)}
                    className="command-palette-item"
                    style={itemStyle}
                  >
                    <ItemIcon>
                      <Settings size={14} style={{ color: t.textTertiary }} />
                    </ItemIcon>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Highlight text={item.label} query={trimmed} />
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: t.textTertiary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.section}
                      </div>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Chat title matches */}
            {trimmed && filteredChats.length > 0 && (
              <Command.Group heading={<GroupLabel icon={MessageCircle}>Chats</GroupLabel>}>
                {filteredChats.map((chat) => (
                  <Command.Item
                    key={chat.id}
                    value={`chat::${chat.id}`}
                    onSelect={() => navigate(`/chat/${chat.id}`)}
                    className="command-palette-item"
                    style={itemStyle}
                  >
                    <ItemIcon>
                      <MessageCircle size={14} style={{ color: t.textTertiary }} />
                    </ItemIcon>
                    <span
                      style={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Highlight text={chat.title ?? 'New conversation'} query={trimmed} />
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* In-conversation message matches */}
            {trimmed && messageResults.length > 0 && (
              <Command.Group heading={<GroupLabel icon={MessageCircle}>In conversations</GroupLabel>}>
                {messageResults.map((result) => (
                  <Command.Item
                    key={result.messageId}
                    value={`msg::${result.messageId}`}
                    onSelect={() => navigate(`/chat/${result.conversationId}`)}
                    className="command-palette-item"
                    style={{ ...itemStyle, alignItems: 'flex-start' }}
                  >
                    <ItemIcon>
                      <MessageCircle size={14} style={{ color: t.textTertiary }} />
                    </ItemIcon>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: t.textSecondary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginBottom: 2,
                        }}
                      >
                        {result.conversationTitle}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: t.textMuted,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          lineHeight: 1.4,
                        }}
                      >
                        <Highlight text={result.snippet} query={trimmed} />
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        color: t.textGhost,
                        flexShrink: 0,
                        paddingTop: 2,
                      }}
                    >
                      {formatRelativeTime(new Date(result.createdAt).getTime())}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Memory / context chunks */}
            {trimmed && memoryResults.length > 0 && (
              <Command.Group heading={<GroupLabel icon={Brain}>Memory</GroupLabel>}>
                {memoryResults.map((item) => {
                  const Icon = memoryIconMap[item.type ?? ''] ?? Brain
                  return (
                    <Command.Item
                      key={item.id}
                      value={`memory::${item.id}`}
                      onSelect={() => navigate('/memory')}
                      className="command-palette-item"
                      style={itemStyle}
                    >
                      <ItemIcon>
                        <Icon size={14} style={{ color: t.textTertiary }} />
                      </ItemIcon>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Highlight text={item.title} query={trimmed} />
                        </div>
                        {item.subtitle && (
                          <div
                            style={{
                              fontSize: 11.5,
                              color: t.textTertiary,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </Command.Item>
                  )
                })}
              </Command.Group>
            )}
          </Command.List>

          {/* ── Bottom keyboard hints ── */}
          <div
            style={{
              borderTop: `1px solid ${t.border}`,
              padding: '7px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontSize: 11,
              color: t.textGhost,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <CornerDownLeft size={11} /> Select
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <ArrowUp size={11} />
              <ArrowDown size={11} /> Navigate
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <kbd
                style={{
                  fontSize: 10,
                  padding: '1px 4px',
                  borderRadius: 3,
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                }}
              >
                Esc
              </kbd>{' '}
              Close
            </span>
          </div>
        </Command>
      </DialogContent>

      <style>{`
        .command-palette-item[data-selected="true"] {
          background: rgba(232,132,92,0.07) !important;
        }
        .command-palette-item[data-selected="true"] > div:first-child {
          border-color: rgba(232,132,92,0.2) !important;
        }
        @keyframes cmd-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default CommandPalette
