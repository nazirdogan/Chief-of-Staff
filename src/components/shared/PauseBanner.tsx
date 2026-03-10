'use client';

import { useEffect, useState } from 'react';
import { onTrayStateChange, type TrayState } from '@/lib/desktop-observer/client';

export function PauseBanner() {
  const [trayState, setTrayState] = useState<TrayState | null>(null);

  useEffect(() => {
    const unsubscribe = onTrayStateChange((state) => {
      setTrayState(state);
    });
    return unsubscribe;
  }, []);

  if (!trayState?.paused) return null;

  const resumesAt = trayState.resumes_at_ms;
  let label = 'Context collection paused';

  if (resumesAt) {
    const diffMs = resumesAt - Date.now();
    if (diffMs > 0) {
      const mins = Math.ceil(diffMs / 60_000);
      if (mins > 60) {
        label = 'Context collection paused until next launch';
      } else {
        label = `Context collection paused — resumes in ${mins} min`;
      }
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-sm text-amber-400">
      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
      {label}
    </div>
  );
}
