"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSnapshot = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const getServerSnapshot = () => false;

export function useIsTauri(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
