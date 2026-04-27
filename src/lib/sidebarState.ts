import { useEffect, useState } from "react";

const KEY = "ng:sidebar-collapsed";
const EVT = "ng:sidebar-toggle";

export function getInitialCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setCollapsed(v: boolean) {
  try {
    window.localStorage.setItem(KEY, v ? "1" : "0");
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(EVT, { detail: v }));
}

export function useSidebarCollapsed(): [boolean, (v: boolean) => void] {
  const [collapsed, setLocal] = useState<boolean>(() => getInitialCollapsed());

  useEffect(() => {
    const onToggle = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setLocal(!!detail);
    };
    window.addEventListener(EVT, onToggle);
    return () => window.removeEventListener(EVT, onToggle);
  }, []);

  return [collapsed, setCollapsed];
}
