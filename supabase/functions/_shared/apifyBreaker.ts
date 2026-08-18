// Apify circuit breaker.
//
// Purpose: stop hammering Apify when it is degraded (429, 402 out-of-credits,
// 5xx, timeouts). One shared row `public.apify_breaker_state` is the source
// of truth. Any edge function that hits Apify should:
//
//   await checkBreaker();                 // throws BreakerOpenError if open
//   try {
//     const res = await fetch(apifyUrl, ...);
//     if (!res.ok) { await recordApifyFailure(res.status, actor); ... }
//     else         { await recordApifySuccess(); }
//   } catch (e) { await recordApifyFailure(e, actor); throw e; }
//
// Rules:
//   - 3 consecutive non-2xx → open
//   - Any 402 (billing) or 429 (rate limit) → open immediately
//   - Manual `paused_by_user` flag always blocks (until unpaused)
//   - Exponential back-off: 10m, 20m, 40m, capped at 60m
//   - Any success closes the breaker

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

let _client: SupabaseClient | null = null;
function admin(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

export class BreakerOpenError extends Error {
  status = 503;
  retryAt: string | null;
  paused: boolean;
  constructor(msg: string, retryAt: string | null, paused: boolean) {
    super(msg);
    this.name = "BreakerOpenError";
    this.retryAt = retryAt;
    this.paused = paused;
  }
}

type BreakerRow = {
  state: "closed" | "half_open" | "open";
  consecutive_failures: number;
  next_retry_at: string | null;
  paused_by_user: boolean;
  last_error: string | null;
};

async function readRow(): Promise<BreakerRow | null> {
  const { data, error } = await admin()
    .from("apify_breaker_state")
    .select("state, consecutive_failures, next_retry_at, paused_by_user, last_error")
    .eq("id", true)
    .maybeSingle();
  if (error) {
    console.warn("[apifyBreaker] read failed:", error.message);
    return null;
  }
  return data as BreakerRow | null;
}

/**
 * Throws BreakerOpenError if:
 *  - `paused_by_user = true`, OR
 *  - state is 'open' AND now < next_retry_at.
 *
 * Once next_retry_at has passed the breaker enters 'half_open' — one attempt
 * is allowed through. If it succeeds we close; if it fails we re-open with a
 * longer back-off.
 */
export async function checkBreaker(): Promise<void> {
  const row = await readRow();
  if (!row) return; // fail open — never block traffic on a read error

  if (row.paused_by_user) {
    throw new BreakerOpenError(
      "Apify pipeline is paused by an operator. Resume it from the Rollout panel to run again.",
      null,
      true,
    );
  }

  if (row.state === "open" && row.next_retry_at) {
    const retryAt = new Date(row.next_retry_at).getTime();
    if (Date.now() < retryAt) {
      const mins = Math.max(1, Math.ceil((retryAt - Date.now()) / 60000));
      throw new BreakerOpenError(
        `Apify circuit open — auto-retry in ~${mins} min. Last error: ${row.last_error ?? "unknown"}`,
        row.next_retry_at,
        false,
      );
    }
    // Passed retry window → let one call through as a probe.
    await admin()
      .from("apify_breaker_state")
      .update({ state: "half_open" })
      .eq("id", true);
  }
}

export async function recordApifySuccess(): Promise<void> {
  try {
    await admin()
      .from("apify_breaker_state")
      .update({
        state: "closed",
        consecutive_failures: 0,
        opened_at: null,
        next_retry_at: null,
        last_error: null,
      })
      .eq("id", true);
  } catch (e) {
    console.warn("[apifyBreaker] recordApifySuccess failed:", (e as Error).message);
  }
}

function backoffMinutes(failures: number): number {
  // 1st open → 10m, 2nd → 20m, 3rd → 40m, cap at 60m.
  const base = 10 * Math.pow(2, Math.max(0, failures - 3));
  return Math.min(60, Math.max(10, base));
}

/**
 * Record a failure. Opens the breaker after 3 in a row, or immediately on
 * 402 / 429 responses. Accepts either an HTTP status code or an Error/string.
 */
export async function recordApifyFailure(
  err: number | Error | string,
  actor?: string,
): Promise<void> {
  try {
    const row = await readRow();
    const current = row?.consecutive_failures ?? 0;
    const next = current + 1;

    const statusCode = typeof err === "number" ? err : null;
    const errText =
      typeof err === "number"
        ? `HTTP ${err}`
        : err instanceof Error
          ? err.message
          : String(err);

    const openImmediately = statusCode === 402 || statusCode === 429;
    const shouldOpen = openImmediately || next >= 3;

    const patch: Record<string, unknown> = {
      consecutive_failures: next,
      last_error: errText.slice(0, 500),
      last_actor: actor ?? null,
    };
    if (shouldOpen) {
      patch.state = "open";
      patch.opened_at = new Date().toISOString();
      patch.next_retry_at = new Date(
        Date.now() + backoffMinutes(next) * 60_000,
      ).toISOString();
    }

    await admin().from("apify_breaker_state").update(patch).eq("id", true);
  } catch (e) {
    console.warn("[apifyBreaker] recordApifyFailure failed:", (e as Error).message);
  }
}
