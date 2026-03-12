'use client';

/**
 * /quick-chat — Donna's floating quick-chat overlay
 *
 * This page is shown in a transparent, decoration-free Tauri window.
 * It is never rendered in the normal browser; it's only used by the desktop app.
 *
 * Summoned via double-tap D (global shortcut handled in quick_chat.rs).
 *
 * On send: invokes the Rust `send_to_main_chat` command which hides this window,
 * focuses the main window, and emits a `donna-quick-message` event that the main
 * window picks up to open /chat and send the message.
 */

import { useCallback } from 'react';
import QuickChatWindow from '@/components/chat/QuickChatWindow';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

async function tauriInvoke(cmd: string, args?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__) return;
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke(cmd, args);
}

export default function QuickChatPage() {
  const handleSend = useCallback(async (message: string) => {
    await tauriInvoke('send_to_main_chat', { message });
  }, []);

  const handleDismiss = useCallback(async () => {
    await tauriInvoke('hide_quick_chat');
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#121218',
        overflow: 'hidden',
      }}
    >
      <QuickChatWindow onSend={handleSend} onDismiss={handleDismiss} />
    </div>
  );
}
