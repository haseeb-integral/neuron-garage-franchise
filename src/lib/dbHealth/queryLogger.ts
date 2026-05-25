// ============================================================================
// Tiny query log buffer that powers <DbDebugFooter />. Any hook can call
// logDbQuery({...}) when it finishes a Supabase call to surface it in the
// debug widget. This is intentionally a global singleton — debug only.
// ============================================================================

export interface DbQueryLogEntry {
  id: string;
  ts: number;
  /** Logical name, e.g. "loadLiveRankedMarkets" or "us_cities_scored.select" */
  label: string;
  /** Table touched, if known. */
  table?: string;
  /** Row count returned (or affected). null = unknown. */
  rowCount: number | null;
  /** Duration in ms. */
  ms: number;
  /** Error message, if any. */
  error?: string | null;
  /** Page/route that initiated the query. */
  route?: string;
}

const MAX = 25;
const listeners = new Set<(entries: DbQueryLogEntry[]) => void>();
let buffer: DbQueryLogEntry[] = [];

export function logDbQuery(entry: Omit<DbQueryLogEntry, "id" | "ts">) {
  const full: DbQueryLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ts: Date.now(),
    ...entry,
  };
  buffer = [full, ...buffer].slice(0, MAX);
  listeners.forEach((l) => l(buffer));
}

export function subscribeDbQueryLog(listener: (entries: DbQueryLogEntry[]) => void) {
  listeners.add(listener);
  listener(buffer);
  return () => {
    listeners.delete(listener);
  };
}

export function getDbQueryLog(): DbQueryLogEntry[] {
  return buffer;
}

export function clearDbQueryLog() {
  buffer = [];
  listeners.forEach((l) => l(buffer));
}

/**
 * Convenience wrapper: time a promise and log the result. The original
 * promise is returned unchanged so callers can keep awaiting it.
 */
export async function withQueryLog<T>(
  label: string,
  table: string | undefined,
  fn: () => Promise<{ data: T | null; error: { message: string } | null; count?: number | null }>,
): Promise<{ data: T | null; error: { message: string } | null; count?: number | null }> {
  const t0 = performance.now();
  let result: Awaited<ReturnType<typeof fn>>;
  try {
    result = await fn();
  } catch (e: any) {
    logDbQuery({
      label,
      table,
      rowCount: null,
      ms: Math.round(performance.now() - t0),
      error: String(e?.message ?? e),
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
    throw e;
  }
  const rowCount = Array.isArray(result?.data)
    ? result.data.length
    : result?.count ?? (result?.data ? 1 : 0);
  logDbQuery({
    label,
    table,
    rowCount,
    ms: Math.round(performance.now() - t0),
    error: result?.error?.message ?? null,
    route: typeof window !== "undefined" ? window.location.pathname : undefined,
  });
  return result;
}
