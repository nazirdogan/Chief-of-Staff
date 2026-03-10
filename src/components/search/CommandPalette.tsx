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
} from 'lucide-react'
import { Dialog, DialogOverlay, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Command } from 'cmdk'

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const t = {
  bg: '#1B1F3A',
  surface: 'rgba(45,45,45,0.04)',
  border: 'rgba(45,45,45,0.08)',
  dawn: '#E8845C',
  dawnMuted: 'rgba(232,132,92,0.15)',
  text: '#2D2D2D',
  textSecondary: 'rgba(45,45,45,0.8)',
  textTertiary: 'rgba(45,45,45,0.6)',
  textMuted: 'rgba(45,45,45,0.5)',
  textGhost: 'rgba(45,45,45,0.4)',
} as const

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------
const pages = [
  { label: 'Briefing', path: '/', icon: LayoutDashboard, shortcut: 'B' },
  { label: 'Inbox', path: '/inbox', icon: Inbox, shortcut: 'I' },
  { label: 'Commitments', path: '/commitments', icon: CheckCircle2, shortcut: 'M' },
  { label: 'People', path: '/people', icon: Users, shortcut: 'P' },
  { label: 'Chat', path: '/chat', icon: MessageCircle, shortcut: 'T' },
  { label: 'Memory', path: '/memory', icon: Brain, shortcut: 'Y' },
  { label: 'Patterns', path: '/patterns', icon: BarChart3, shortcut: 'A' },
] as const

const actions = [
  { label: 'Prep for next meeting', query: 'Prep for next meeting' },
  { label: 'Summarize this week', query: 'Summarize this week' },
  { label: "Who's waiting on me?", query: "Who's waiting on me?" },
] as const

// ---------------------------------------------------------------------------
// Memory result type
// ---------------------------------------------------------------------------
interface MemoryResult {
  id: string
  title: string
  subtitle?: string
  type?: 'email' | 'calendar' | 'slack' | 'document' | 'task'
}

const memoryIconMap: Record<string, typeof Mail> = {
  email: Mail,
  calendar: CalendarDays,
  slack: MessageSquare,
  document: FileText,
  task: CheckCircle,
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [memoryResults, setMemoryResults] = useState<MemoryResult[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced memory search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()

    const controller = new AbortController()
    debounceRef.current = setTimeout(async () => {
      if (!trimmed) {
        setMemoryResults([])
        return
      }
      try {
        const res = await fetch(
          `/api/context/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        )
        if (res.ok) {
          const data = await res.json()
          setMemoryResults(Array.isArray(data) ? data : data.results ?? [])
        }
      } catch {
        // Silently fail — memory results are supplemental
      }
    }, trimmed ? 300 : 0)

    return () => {
      controller.abort()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Reset state when dialog closes — handled via onOpenChange wrapper
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setQuery('')
        setMemoryResults([])
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Overlay */}
      <DialogOverlay
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'none' }}
        className="!bg-transparent"
      />

      <DialogContent
        showCloseButton={false}
        className="!translate-x-[-50%] !translate-y-[-50%] !p-0 !gap-0 !border-0 !bg-transparent !shadow-none sm:!max-w-none !max-w-none"
        style={{
          width: 580,
          background: 'transparent',
          border: 'none',
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
          <DialogDescription>Search for pages, actions, or memory</DialogDescription>
        </DialogHeader>

        <Command
          label="Command Palette"
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
              handleOpenChange(false)
            }
          }}
          style={{
            background: '#111110',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          {/* Search input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 16px',
              borderBottom: `1px solid ${t.border}`,
            }}
          >
            <SearchIcon size={18} style={{ color: t.textMuted, flexShrink: 0 }} />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search Donna..."
              style={{
                flex: 1,
                fontSize: 16,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: t.text,
                caretColor: t.dawn,
              }}
            />
          </div>

          {/* Results */}
          <Command.List
            style={{
              maxHeight: 380,
              overflowY: 'auto',
              padding: '8px 0',
            }}
          >
            <Command.Empty
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                fontSize: 13,
                color: t.textMuted,
              }}
            >
              No results found.
            </Command.Empty>

            {/* Pages group */}
            <Command.Group
              heading={
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: t.textMuted,
                    padding: '4px 16px 4px 16px',
                    display: 'block',
                  }}
                >
                  Pages
                </span>
              }
            >
              {pages.map((page) => {
                const Icon = page.icon
                return (
                  <Command.Item
                    key={page.path}
                    value={page.label}
                    onSelect={() => navigate(page.path)}
                    className="command-palette-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 16px',
                      cursor: 'pointer',
                      fontSize: 14,
                      color: t.textSecondary,
                      borderLeft: '2px solid transparent',
                      margin: '0 8px',
                      borderRadius: 8,
                    }}
                  >
                    <Icon size={16} style={{ color: t.textTertiary, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{page.label}</span>
                    <kbd
                      style={{
                        fontSize: 11,
                        color: t.textGhost,
                        fontFamily: 'inherit',
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

            {/* Actions group */}
            <Command.Group
              heading={
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: t.textMuted,
                    padding: '4px 16px 4px 16px',
                    display: 'block',
                  }}
                >
                  Actions
                </span>
              }
            >
              {actions.map((action) => (
                <Command.Item
                  key={action.query}
                  value={action.label}
                  onSelect={() =>
                    navigate(`/chat?q=${encodeURIComponent(action.query)}`)
                  }
                  className="command-palette-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 16px',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: t.textSecondary,
                    borderLeft: '2px solid transparent',
                    margin: '0 8px',
                    borderRadius: 8,
                  }}
                >
                  <Zap size={16} style={{ color: t.textTertiary, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{action.label}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Memory group — only shown when there are results */}
            {memoryResults.length > 0 && (
              <Command.Group
                heading={
                  <span
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: t.textMuted,
                      padding: '4px 16px 4px 16px',
                      display: 'block',
                    }}
                  >
                    Memory
                  </span>
                }
              >
                {memoryResults.map((item) => {
                  const Icon: typeof Mail = memoryIconMap[item.type ?? ''] ?? Brain
                  return (
                    <Command.Item
                      key={item.id}
                      value={item.title}
                      onSelect={() => navigate('/memory')}
                      className="command-palette-item"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 16px',
                        cursor: 'pointer',
                        fontSize: 14,
                        color: t.textSecondary,
                        borderLeft: '2px solid transparent',
                        margin: '0 8px',
                        borderRadius: 8,
                      }}
                    >
                      <Icon size={16} style={{ color: t.textTertiary, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div
                            style={{
                              fontSize: 12,
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

          {/* Bottom bar with keyboard hints */}
          <div
            style={{
              borderTop: `1px solid ${t.border}`,
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 11,
              color: t.textGhost,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <CornerDownLeft size={12} />
              Select
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowUp size={12} />
              <ArrowDown size={12} />
              Navigate
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
              </kbd>
              Close
            </span>
          </div>
        </Command>
      </DialogContent>

      {/* Scoped styles for active/selected item */}
      <style>{`
        .command-palette-item[data-selected="true"] {
          background: rgba(232,132,92,0.12) !important;
          border-left-color: #E8845C !important;
        }
      `}</style>
    </Dialog>
  )
}

export default CommandPalette
