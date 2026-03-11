'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const STORAGE_KEY = 'donna_nav_history'
const MAX_ENTRIES = 12

export interface NavHistoryEntry {
  path: string
  label: string
  visitedAt: number
}

const pathToLabel: Record<string, string> = {
  '/dashboard': 'Today',
  '/inbox': 'Inbox',
  '/commitments': 'Commitments',
  '/people': 'People',
  '/chat': 'Chat',
  '/reflections': 'Reflections',
  '/settings': 'Settings',
  '/patterns': 'Patterns',
  '/memory': 'Memory',
}

function labelForPath(path: string): string {
  if (pathToLabel[path]) return pathToLabel[path]
  for (const [prefix, label] of Object.entries(pathToLabel)) {
    if (path.startsWith(prefix + '/')) return label
  }
  return path
}

export function useNavigationHistory() {
  const pathname = usePathname()
  const [history, setHistory] = useState<NavHistoryEntry[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setHistory(JSON.parse(stored))
    } catch {
      // ignore
    }
  }, [])

  // Record current page visit whenever pathname changes
  useEffect(() => {
    if (!pathname) return
    const entry: NavHistoryEntry = {
      path: pathname,
      label: labelForPath(pathname),
      visitedAt: Date.now(),
    }
    setHistory((prev) => {
      const filtered = prev.filter((e) => e.path !== pathname)
      const next = [entry, ...filtered].slice(0, MAX_ENTRIES)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }, [pathname])

  return history
}
