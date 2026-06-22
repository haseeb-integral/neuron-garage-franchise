// Single source of truth for SAS value formatting.
//
// Brett's "one calibrated number everywhere" rule applies to display too —
// the same raw value must render to the same text on every surface (the
// Site Analysis page, the Site Pack PDF, any future export). Until now there
// were two near-duplicate formatters (one in `SiteAnalysis.tsx`, one in
// `sitePack/copy.ts`) and they had drifted: `$1200k` vs `$1.2M`, `5.3k` vs
// `5k`, `undefined` vs `—`. All callers should now import from here.

const EMPTY = "—";

/** $1.2M / $120k / $1,250 / "—" for null. */
export function fmtMoney(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return EMPTY;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${Math.round(v).toLocaleString()}`;
}

/** "12%" / "—". Accepts 0–1 fraction or 0–100 percent. */
export function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return EMPTY;
  const pct = v > 1 ? v : v * 100;
  return `${Math.round(pct)}%`;
}

/**
 * "5.3k children" / "850 people" / "—".
 * Optional `unit` word is appended after the number, separated by a space.
 * 1k–9.9k keeps one decimal place; 10k+ is rounded.
 */
export function fmtCount(
  v: number | null | undefined,
  unit?: string,
): string {
  if (v == null || !Number.isFinite(v)) return EMPTY;
  let num: string;
  if (v >= 1_000_000) num = `${(v / 1_000_000).toFixed(1)}M`;
  else if (v >= 10_000) num = `${Math.round(v / 1_000).toLocaleString()}k`;
  else if (v >= 1_000) num = `${(v / 1_000).toFixed(1)}k`;
  else num = Math.round(v).toLocaleString();
  return unit ? `${num} ${unit}` : num;
}

/** "1.2 mi" / "—". */
export function fmtMi(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return EMPTY;
  return `${v.toFixed(1)} mi`;
}

/** "73/100" / "—/100". */
export function fmtScore(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return `${EMPTY}/100`;
  return `${Math.round(v)}/100`;
}
