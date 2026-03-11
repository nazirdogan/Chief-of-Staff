'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Guard hook for website-only pages.
 *
 * If this page is rendered inside the Tauri desktop app (detectable via
 * `window.__TAURI__`, which is injected by Tauri when `withGlobalTauri: true`),
 * we immediately redirect to the login screen. This is a client-side fallback
 * for cases where the server-side middleware cookie check fails (e.g. the
 * `donna_client` cookie has expired or was cleared).
 */
export function useWebsiteOnly() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      router.replace('/login');
    }
  }, [router]);
}
