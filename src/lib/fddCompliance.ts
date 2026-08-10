// ============================================================================
// FDD 16-day compliance math — ONE place, used by the compliance panel, the
// stage-move gate, and (mirrored) the database trigger.
//
// Rule: the FTC minimum is 14 full days. We use 16 calendar days to stay
// conservative. Day 1 = the day the FDD was sent, so the earliest allowed
// signing date is the FDD date + 16 days.
// ============================================================================

export const FDD_WAIT_DAYS = 16;

/** Parse an ISO timestamp into a local calendar date (midnight), or null. */
function toDay(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function dayDiff(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

/** The date the clock starts from: the later of sent / received. */
export function fddEffectiveDate(
  sentAt: string | null | undefined,
  receivedAt: string | null | undefined,
): Date | null {
  const s = toDay(sentAt);
  const r = toDay(receivedAt);
  if (s && r) return s.getTime() >= r.getTime() ? s : r;
  return s ?? r;
}

/** Earliest date a franchise agreement may be signed. */
export function earliestSigningDate(
  sentAt: string | null | undefined,
  receivedAt: string | null | undefined,
): Date | null {
  const base = fddEffectiveDate(sentAt, receivedAt);
  return base ? addDays(base, FDD_WAIT_DAYS) : null;
}

/**
 * How many days are still left in the waiting period as of `now`.
 * 0 means the wait is over. null means no FDD date on file.
 */
export function daysRemaining(
  sentAt: string | null | undefined,
  receivedAt: string | null | undefined,
  now: Date = new Date(),
): number | null {
  const earliest = earliestSigningDate(sentAt, receivedAt);
  if (!earliest) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, dayDiff(earliest, today));
}

/** True when the given signing date breaks the 16-day rule. */
export function signingTooEarly(
  sentAt: string | null | undefined,
  receivedAt: string | null | undefined,
  signedAt: string | null | undefined,
): boolean {
  const signed = toDay(signedAt);
  const earliest = earliestSigningDate(sentAt, receivedAt);
  if (!signed || !earliest) return false;
  return signed.getTime() < earliest.getTime();
}

export function formatDay(d: Date | null): string {
  return d ? d.toLocaleDateString() : "—";
}
