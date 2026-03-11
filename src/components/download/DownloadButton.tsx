'use client';

import { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Monitor } from 'lucide-react';

type Platform = 'macos' | 'other';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('mac') || ua.includes('macintosh')) return 'macos';
  return 'other';
}

// Cache the platform once detected so useSyncExternalStore has a stable value
let cachedPlatform: Platform | null = null;
function subscribePlatform() {
  // Platform doesn't change — return a no-op unsubscribe
  return () => {};
}
function getClientPlatform(): Platform {
  if (!cachedPlatform) cachedPlatform = detectPlatform();
  return cachedPlatform;
}
function getServerPlatform(): Platform {
  return 'other';
}

export function DownloadButton() {
  const platform = useSyncExternalStore(subscribePlatform, getClientPlatform, getServerPlatform);

  if (platform === 'macos') {
    return (
      <Button asChild size="lg" className="gap-2">
        <a href="/api/download/mac">
          <Download className="size-4" />
          Download for macOS
        </a>
      </Button>
    );
  }

  return (
    <Button variant="secondary" size="lg" disabled className="gap-2">
      <Monitor className="size-4" />
      macOS only — coming soon for other platforms
    </Button>
  );
}
