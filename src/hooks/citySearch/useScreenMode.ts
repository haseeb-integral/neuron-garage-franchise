// useScreenMode — small localStorage-backed toggle for the City Search page's
// dashboard ↔ spreadsheet view. Extracted from CityScoring.tsx so the page
// doesn't carry the SSR-safe initializer + write-back boilerplate.

import { useCallback, useState } from "react";

export type ScreenMode = "dashboard" | "spreadsheet";
const STORAGE_KEY = "citySearch.screenMode";

export function useScreenMode(): [ScreenMode, (m: ScreenMode) => void] {
  const [mode, setMode] = useState<ScreenMode>(() => {
    if (typeof window === "undefined") return "dashboard";
    return window.localStorage.getItem(STORAGE_KEY) === "spreadsheet"
      ? "spreadsheet"
      : "dashboard";
  });

  const update = useCallback((m: ScreenMode) => {
    setMode(m);
    try { window.localStorage.setItem(STORAGE_KEY, m); } catch { /* ignore */ }
  }, []);

  return [mode, update];
}
