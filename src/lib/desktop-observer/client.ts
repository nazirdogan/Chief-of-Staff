/**
 * Desktop Observer Client
 *
 * Bridges the Tauri native desktop observer with the Donna context pipeline.
 * Listens for real-time AX context changes from the Rust backend and
 * batches them into the context ingestion pipeline.
 */

import type { DesktopContext, ObserverStatus } from './types';

// Tauri API imports — only available when running in the Tauri shell
let invoke: ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null = null;
let listen: ((event: string, handler: (event: { payload: unknown }) => void) => Promise<() => void>) | null = null;

async function loadTauriApis() {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
    return false;
  }
  try {
    const tauriCore = await import('@tauri-apps/api/core');
    const tauriEvent = await import('@tauri-apps/api/event');
    invoke = tauriCore.invoke;
    listen = tauriEvent.listen;
    return true;
  } catch {
    return false;
  }
}

// ─── Context Buffer ───────────────────────────────────────────────────────────
// Buffers context changes and flushes to the API in batches to avoid
// overwhelming the pipeline with per-keystroke updates.

const FLUSH_INTERVAL_MS = 5_000; // flush every 5 seconds
const MAX_BUFFER_SIZE = 20;

const contextBuffer: DesktopContext[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let unlistenFn: (() => void) | null = null;

type ContextChangeHandler = (ctx: DesktopContext) => void;
const changeListeners: Set<ContextChangeHandler> = new Set();

// ─── Public API ───────────────────────────────────────────────────────────────

/** Check if accessibility permission is granted */
export async function checkAccessibility(): Promise<boolean> {
  if (!invoke) {
    const loaded = await loadTauriApis();
    if (!loaded) return false;
  }
  try {
    return (await invoke!('check_accessibility')) as boolean;
  } catch {
    return false;
  }
}

/** Prompt user for accessibility permission */
export async function requestAccessibility(): Promise<boolean> {
  if (!invoke) {
    const loaded = await loadTauriApis();
    if (!loaded) return false;
  }
  try {
    return (await invoke!('request_accessibility')) as boolean;
  } catch {
    return false;
  }
}

/** Get current observer status */
export async function getObserverStatus(): Promise<ObserverStatus | null> {
  if (!invoke) {
    const loaded = await loadTauriApis();
    if (!loaded) return null;
  }
  try {
    return (await invoke!('get_observer_status')) as ObserverStatus;
  } catch {
    return null;
  }
}

/** Get current desktop context snapshot */
export async function getCurrentContext(): Promise<DesktopContext | null> {
  if (!invoke) {
    const loaded = await loadTauriApis();
    if (!loaded) return null;
  }
  try {
    return (await invoke!('get_current_context')) as DesktopContext | null;
  } catch {
    return null;
  }
}

/** Capture a single context snapshot right now */
export async function captureNow(): Promise<DesktopContext | null> {
  if (!invoke) {
    const loaded = await loadTauriApis();
    if (!loaded) return null;
  }
  try {
    return (await invoke!('capture_context_now')) as DesktopContext | null;
  } catch {
    return null;
  }
}

/** Subscribe to real-time context changes */
export function onContextChange(handler: ContextChangeHandler): () => void {
  changeListeners.add(handler);
  return () => changeListeners.delete(handler);
}

/**
 * Start the desktop observer.
 * - Tells the Rust backend to begin the AX observation loop
 * - Listens for context-changed events
 * - Buffers and flushes context to the ingestion API
 */
export async function startObserver(): Promise<boolean> {
  if (!invoke || !listen) {
    const loaded = await loadTauriApis();
    if (!loaded) return false;
  }

  try {
    // Start native observer
    const started = (await invoke!('start_observing')) as boolean;
    if (!started) return false;

    // Listen for context change events from Rust
    unlistenFn?.();
    const unlisten = await listen!('desktop-context-changed', (event) => {
      const ctx = event.payload as DesktopContext;
      handleContextChange(ctx);
    });
    unlistenFn = unlisten;

    // Start flush timer
    if (flushTimer) clearInterval(flushTimer);
    flushTimer = setInterval(flushBuffer, FLUSH_INTERVAL_MS);

    return true;
  } catch (e) {
    console.error('[desktop-observer] Failed to start:', e);
    return false;
  }
}

/** Stop the desktop observer */
export async function stopObserver(): Promise<void> {
  if (!invoke) return;

  try {
    await invoke!('stop_observing');
  } catch {
    // ignore
  }

  unlistenFn?.();
  unlistenFn = null;

  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }

  // Flush remaining buffer
  await flushBuffer();
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function handleContextChange(ctx: DesktopContext) {
  // Notify UI listeners
  for (const handler of changeListeners) {
    try {
      handler(ctx);
    } catch {
      // ignore listener errors
    }
  }

  // Add to buffer
  contextBuffer.push(ctx);

  // Flush if buffer is full
  if (contextBuffer.length >= MAX_BUFFER_SIZE) {
    flushBuffer();
  }
}

async function flushBuffer() {
  if (contextBuffer.length === 0) return;

  const items = contextBuffer.splice(0); // take all items

  try {
    const response = await fetch('/api/desktop-observer/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contexts: items }),
    });

    if (!response.ok) {
      console.error('[desktop-observer] Ingest failed:', response.status);
      // Put items back if server is down (but limit to avoid memory leak)
      if (contextBuffer.length < MAX_BUFFER_SIZE * 5) {
        contextBuffer.unshift(...items);
      }
    }
  } catch (e) {
    console.error('[desktop-observer] Ingest error:', e);
  }
}
