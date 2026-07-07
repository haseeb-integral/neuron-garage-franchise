// Source provenance types + small helpers used by the SAS page and PDF.
//
// Goal: every number on the SAS surfaces should be traceable. The engine
// (compute-sas) emits a `signals.provenance` object that follows the shapes
// below; the UI just renders it. Status words are deliberately plain so a
// non-technical user can read them: Fresh / From cache / Backup source /
// Missing / You typed it / Heuristic.

export type SourceStatus =
  | "fresh"          // fetched live from upstream on this run
  | "cached"         // pulled from our DB cache
  | "backup_source"  // upstream failed, used a fallback provider
  | "missing"        // no data; engine refused or fell to defaults
  | "user_input"     // you typed it
  | "heuristic";     // formula/estimate, not a measurement

export interface VerifyLink {
  label: string;
  url: string;
}

export interface SourceMeta {
  /** Short name of where the number comes from. */
  label: string;
  status: SourceStatus;
  /** ISO timestamp the data was fetched / entered. */
  fetchedAt?: string | null;
  /** Year of the underlying dataset, e.g. 2022 for ACS 5-year. */
  year?: number | string | null;
  /** Provider key — useful for grouping in chips. */
  provider?: string | null;
  /** Free-text note — methodology callout, heuristic explanation, etc. */
  note?: string | null;
  /** True if this number is an estimate/formula, not a measurement. */
  heuristic?: boolean;
  /** Age of cached row in days, when status is "cached". */
  cacheAgeDays?: number | null;
  /** Upstream error message, when status is "backup_source" or "missing". */
  error?: string | null;
  /** Click-through links a human can open in a new tab to verify. */
  verifyLinks?: VerifyLink[];
}

export interface SasProvenance {
  schoolProfile?: SourceMeta;
  affluence?: SourceMeta;
  familyDensity?: SourceMeta;
  ecosystem?: SourceMeta;
  accessibility?: SourceMeta;
  /** Optional accessibility detail per leg if engine emits them. */
  accessibilityHwy?: SourceMeta;
  accessibilityRoad?: SourceMeta;
  /** Population reachable extrapolation note. */
  popReachable?: SourceMeta;
}

// -- UI helpers ---------------------------------------------------------------

export const STATUS_LABEL: Record<SourceStatus, string> = {
  fresh: "Fresh",
  cached: "From cache",
  backup_source: "Backup source",
  missing: "Missing",
  user_input: "You typed it",
  heuristic: "Heuristic",
};

export const STATUS_COLOR: Record<SourceStatus, { bg: string; fg: string; dot: string }> = {
  fresh:         { bg: "#e3f3e7", fg: "#1d6b32", dot: "#1d6b32" },
  cached:        { bg: "#dbe5ff", fg: "#174be8", dot: "#174be8" },
  backup_source: { bg: "#fff3cd", fg: "#7a5800", dot: "#a87b00" },
  missing:       { bg: "#fce7ec", fg: "#a3142b", dot: "#a3142b" },
  user_input:    { bg: "#eef2f7", fg: "#526078", dot: "#526078" },
  heuristic:     { bg: "#fff3cd", fg: "#7a5800", dot: "#a87b00" },
};

export function statusLabel(s: SourceStatus): string {
  return STATUS_LABEL[s] ?? s;
}

/** Returns "2 days ago" / "just now" / "" style age string. */
export function relativeAge(iso?: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diffMs = Date.now() - t;
  const day = 24 * 3600 * 1000;
  if (diffMs < 60_000) return "just now";
  if (diffMs < 3600_000) return `${Math.round(diffMs / 60_000)} min ago`;
  if (diffMs < day) return `${Math.round(diffMs / 3600_000)} h ago`;
  const days = Math.round(diffMs / day);
  if (days < 30) return `${days} d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} mo ago`;
  return `${Math.round(months / 12)} y ago`;
}

/** Returns true when ANY pillar source ran on a backup / is missing. */
export function hasDegradedSource(prov?: SasProvenance | null): boolean {
  if (!prov) return false;
  return Object.values(prov).some(
    (s) => s && (s.status === "backup_source" || s.status === "missing"),
  );
}

/** Plain-English degraded-run sentences for the warning banner. */
export function degradedReasons(prov?: SasProvenance | null): string[] {
  if (!prov) return [];
  const out: string[] = [];
  for (const [key, src] of Object.entries(prov)) {
    if (!src) continue;
    if (src.status === "backup_source") {
      out.push(
        `${prettyKey(key)}: backup source used (${src.label}). ${src.error ?? ""}`.trim(),
      );
    } else if (src.status === "missing") {
      out.push(`${prettyKey(key)}: data missing (${src.label}). ${src.error ?? ""}`.trim());
    }
  }
  return out;
}

function prettyKey(k: string): string {
  switch (k) {
    case "schoolProfile": return "School Profile";
    case "affluence": return "Affluence";
    case "familyDensity": return "Family Density";
    case "ecosystem": return "Ecosystem";
    case "accessibility":
    case "accessibilityHwy":
    case "accessibilityRoad": return "Accessibility";
    case "popReachable": return "Population reachable";
    default: return k;
  }
}

/** Maps each tile label on the SAS page to its provenance source key. */
export type ProvKey = keyof SasProvenance;

export const TILE_SOURCE_KEY: Record<string, ProvKey> = {
  "Median HHI · 10m": "affluence",
  "Median HHI · 15m": "affluence",
  "HH >$150k · 10m": "affluence",
  "HH >$200k · 10m": "affluence",
  "HH >$200k · 10m (count)": "affluence",
  "Kids 5-12 · 10m": "familyDensity",
  "Pop · 15m": "popReachable",
  "Drive to hwy": "accessibilityHwy",
  "Drive to road": "accessibilityRoad",
};
