// ============================================================================
// Translates raw Postgres / Supabase error strings into something a non-data
// person can read. Used by every widget on /observability so we never expose
// raw stack traces or "canceling statement due to statement timeout".
// ============================================================================

export type FriendlyError = {
  /** One short sentence the user actually sees. */
  message: string;
  /** Optional follow-up hint, e.g. "Try again in a moment." */
  hint?: string;
  /** True when the underlying cause is a query timeout — UI may downgrade to a soft warning. */
  isTimeout: boolean;
  /** True when the underlying cause is auth / RLS — UI may suggest signing back in. */
  isAuth: boolean;
};

export function friendlyError(raw: unknown): FriendlyError {
  const msg = String((raw as any)?.message ?? raw ?? "").trim();
  const lower = msg.toLowerCase();

  if (
    lower.includes("statement timeout") ||
    lower.includes("canceling statement") ||
    lower.includes("57014")
  ) {
    return {
      message: "This check is too heavy to finish in time right now.",
      hint: "It runs automatically every 6 hours in the background — see Alerts & History for the latest snapshot.",
      isTimeout: true,
      isAuth: false,
    };
  }
  if (lower.includes("jwt") || lower.includes("not authenticated") || lower.includes("permission denied")) {
    return {
      message: "Couldn't reach the database with your current session.",
      hint: "Try refreshing the page or signing in again.",
      isTimeout: false,
      isAuth: true,
    };
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return {
      message: "Couldn't reach the database — your connection may have blinked.",
      hint: "Press the button again in a moment.",
      isTimeout: false,
      isAuth: false,
    };
  }
  if (!msg) {
    return {
      message: "Something went wrong running this check.",
      hint: "Press the button again — if it keeps happening, ping Haseeb.",
      isTimeout: false,
      isAuth: false,
    };
  }
  // Unknown error — keep the original short, drop SQL-ish prefixes.
  const cleaned = msg.replace(/^error:\s*/i, "").slice(0, 180);
  return {
    message: "We couldn't finish this check.",
    hint: cleaned,
    isTimeout: false,
    isAuth: false,
  };
}
