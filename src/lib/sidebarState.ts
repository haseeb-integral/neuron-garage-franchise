import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const KEY = "ng:sidebar-collapsed";
const USER_SET_KEY = "ng:sidebar-user-set";
const EVT = "ng:sidebar-toggle";

export function getInitialCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function isUserSet(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(USER_SET_KEY) === "1";
  } catch {
    return false;
  }
}

/** Set collapsed and remember that the user expressed a preference. */
export function setCollapsed(v: boolean, fromUser = true) {
  try {
    window.localStorage.setItem(KEY, v ? "1" : "0");
    if (fromUser) window.localStorage.setItem(USER_SET_KEY, "1");
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

  return [collapsed, (v: boolean) => setCollapsed(v, true)];
}

/**
 * On routes listed in `routes`, default the sidebar to collapsed
 * the first time the user lands there — but only if they haven't
 * explicitly set a preference yet. Honors user choice afterward.
 */
export function useDefaultCollapsedForRoute(routes: string[]) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (isUserSet()) return;
    if (routes.some((r) => pathname.startsWith(r))) {
      if (!getInitialCollapsed()) setCollapsed(true, false);
    }
  }, [pathname, routes]);
}
