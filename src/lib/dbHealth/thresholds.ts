// ============================================================================
// DB Health thresholds — single source of truth for green / yellow / red.
// Change these here, not in components.
// ============================================================================

export type HealthStatus = "green" | "yellow" | "red" | "unknown";

export interface MetricCheck {
  /** Numeric value being checked (row count, %, age in days, etc.). */
  value: number | null;
  /** Was there an error fetching this value? */
  errored?: boolean;
}

export interface DomainThresholds {
  /** Minimum acceptable row count. Below = red. */
  minRows: number;
  /** Maximum allowed staleness in days for "last updated" fields. */
  maxStalenessDays?: number;
  /** Minimum % of rows that must have the required column populated. */
  minRequiredPct?: number;
}

/**
 * Roll up a set of metric checks into a single status. Any errored or red
 * metric pushes the whole domain to red. A single yellow keeps the domain
 * yellow. Otherwise green.
 */
export function rollup(statuses: HealthStatus[]): HealthStatus {
  if (statuses.length === 0) return "unknown";
  if (statuses.some((s) => s === "red")) return "red";
  if (statuses.some((s) => s === "yellow")) return "yellow";
  if (statuses.every((s) => s === "green")) return "green";
  return "unknown";
}

export function checkRowCount(rows: number | null, t: DomainThresholds): HealthStatus {
  if (rows == null) return "unknown";
  if (rows <= 0) return "red";
  if (rows < t.minRows) return "yellow";
  return "green";
}

export function checkStaleness(lastIso: string | null, t: DomainThresholds): HealthStatus {
  if (!t.maxStalenessDays) return "green";
  if (!lastIso) return "yellow";
  const ageDays = (Date.now() - new Date(lastIso).getTime()) / (1000 * 60 * 60 * 24);
  if (Number.isNaN(ageDays)) return "unknown";
  if (ageDays > t.maxStalenessDays * 2) return "red";
  if (ageDays > t.maxStalenessDays) return "yellow";
  return "green";
}

export function checkPct(pct: number | null, minPct: number): HealthStatus {
  if (pct == null) return "unknown";
  if (pct <= 0) return "red";
  if (pct < minPct) return "yellow";
  return "green";
}

/** Per-domain expected baselines. Tune to your data, not to defaults. */
export const DOMAIN_THRESHOLDS: Record<string, DomainThresholds> = {
  us_cities_scored: { minRows: 500, maxStalenessDays: 30, minRequiredPct: 95 },
  us_cities_geo: { minRows: 25000 },
  teacher_prospects: { minRows: 100, maxStalenessDays: 14 },
  public_schools: { minRows: 50000 },
  candidates: { minRows: 1 },
  city_seed_runs: { minRows: 1, maxStalenessDays: 60 },
};

export function statusColor(s: HealthStatus): string {
  switch (s) {
    case "green":
      return "#16a34a";
    case "yellow":
      return "#d97706";
    case "red":
      return "#dc2626";
    default:
      return "#94a3b8";
  }
}

export function statusLabel(s: HealthStatus): string {
  switch (s) {
    case "green":
      return "Healthy";
    case "yellow":
      return "Degraded";
    case "red":
      return "Failing";
    default:
      return "Unknown";
  }
}
