'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/db/browser-client';
import type { OneTapAction } from '@/components/shared/OneTapConfirmToast';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useOneTapQueue(): {
  current: OneTapAction | null;
  resolve: (actionId: string) => void;
} {
  const [queue, setQueue] = useState<OneTapAction[]>([]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let channel: RealtimeChannel | null = null;

    async function init() {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch existing Tier 2 actions awaiting confirmation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from('pending_actions')
        .select('id, action_type, payload, created_at, expires_at')
        .eq('user_id', user.id)
        .eq('autonomy_tier', 2)
        .eq('status', 'awaiting_confirmation')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (existing && existing.length > 0) {
        setQueue((prev) => {
          const existingIds = new Set(prev.map((a) => a.id));
          const newActions = (existing as OneTapAction[]).filter((a) => !existingIds.has(a.id));
          return [...prev, ...newActions];
        });
      }

      // Subscribe to new Tier 2 inserts via Realtime
      // Falls back silently if WebSocket is unavailable (e.g. HTTP in local dev)
      try {
        channel = supabase
          .channel('tier2-actions')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'pending_actions',
              filter: 'autonomy_tier=eq.2',
            },
            (payload) => {
              const row = payload.new as Record<string, unknown>;
              // Only add if it belongs to this user and isn't expired
              if (row.user_id !== user.id) return;
              if (new Date(row.expires_at as string) < new Date()) return;

              const action: OneTapAction = {
                id: row.id as string,
                action_type: row.action_type as OneTapAction['action_type'],
                payload: (row.payload as Record<string, unknown>) ?? {},
                created_at: row.created_at as string,
                expires_at: row.expires_at as string,
              };

              setQueue((prev) => {
                if (prev.some((a) => a.id === action.id)) return prev;
                return [...prev, action];
              });
            }
          )
          .subscribe((status, err) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn('Supabase Realtime unavailable — one-tap actions will load on mount only', err);
            }
          });
      } catch (err) {
        console.warn('Supabase Realtime unavailable — one-tap actions will load on mount only', err);
        channel = null;
      }
    }

    init();

    return () => {
      if (channel) {
        const supabase = getSupabaseBrowserClient();
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const resolve = useCallback((actionId: string) => {
    setQueue((prev) => prev.filter((a) => a.id !== actionId));
  }, []);

  // Filter out expired actions from queue head
  const now = new Date();
  const current = queue.find((a) => new Date(a.expires_at) > now) ?? null;

  return { current, resolve };
}
