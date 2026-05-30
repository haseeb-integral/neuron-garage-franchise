// Registry of route path -> preload fn. Populated from App.tsx.
const registry = new Map<string, () => Promise<unknown>>();

export function registerRoutePrefetch(path: string, preload: () => Promise<unknown>) {
  registry.set(path, preload);
}

export function prefetchRoute(path: string) {
  // Match exact, then longest prefix (handles nested paths like /docs/...).
  const exact = registry.get(path);
  if (exact) {
    void exact().catch(() => {});
    return;
  }
  let best: ((...args: unknown[]) => Promise<unknown>) | null = null;
  let bestLen = -1;
  for (const [p, fn] of registry) {
    if (path.startsWith(p) && p.length > bestLen) {
      best = fn as () => Promise<unknown>;
      bestLen = p.length;
    }
  }
  if (best) void best().catch(() => {});
}

let prefetchedAll = false;
export function prefetchAllRoutes() {
  if (prefetchedAll) return;
  prefetchedAll = true;
  const run = () => {
    for (const fn of registry.values()) {
      try { void fn().catch(() => {}); } catch { /* noop */ }
    }
  };
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
  if (typeof ric === "function") ric(run, { timeout: 2500 });
  else setTimeout(run, 1500);
}
