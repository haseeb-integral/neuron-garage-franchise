/**
 * Lightweight in-memory cache for page data so that re-mounting a route
 * (after navigating away and back) shows previously loaded data instantly
 * while a fresh fetch runs in the background.
 *
 * NOT persisted across hard refresh — that's intentional. Hard refresh = fresh data.
 * Cleared on logout if you call `clearPageCaches()`.
 */

type Cache = Map<string, unknown>;
const cache: Cache = new Map();

export function getCached<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function setCached<T>(key: string, value: T): void {
  cache.set(key, value);
}

export function updateCached<T>(key: string, updater: (prev: T | undefined) => T): void {
  const prev = cache.get(key) as T | undefined;
  cache.set(key, updater(prev));
}

export function clearPageCaches(): void {
  cache.clear();
}
