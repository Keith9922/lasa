import type { AppState } from "@/lib/types";
import { createInitialState } from "@/lib/initial-state";

const STORAGE_KEY = "stori-state-v1";

export function loadState(): AppState {
  if (typeof window === "undefined") return createInitialState();
  const value = window.localStorage.getItem(STORAGE_KEY);
  if (!value) return createInitialState();
  try {
    const parsed = JSON.parse(value) as AppState;
    if (parsed.schemaVersion !== 1) return createInitialState();
    return parsed;
  } catch {
    return createInitialState();
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
