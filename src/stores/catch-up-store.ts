/**
 * Zustand store for catch-up UI state.
 * Bridges the worker system to React components.
 */

import { create } from 'zustand';
import type { CatchUpState } from '@/lib/worker/catch-up-queue';

export interface StaleWarning {
  jobId: string;
  label: string;
  priority: number;
  lastSuccessAt: string | null;
  expectedIntervalMs: number;
  overdueMs: number;
  circuitOpen: boolean;
}

interface CatchUpStore {
  state: CatchUpState | null;
  staleWarnings: StaleWarning[];
  setState: (state: CatchUpState) => void;
  setStaleWarnings: (warnings: StaleWarning[]) => void;
  reset: () => void;
}

export const useCatchUpStore = create<CatchUpStore>((set) => ({
  state: null,
  staleWarnings: [],
  setState: (state) => set({ state }),
  setStaleWarnings: (staleWarnings) => set({ staleWarnings }),
  reset: () => set({ state: null, staleWarnings: [] }),
}));
