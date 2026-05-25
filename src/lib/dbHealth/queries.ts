// ============================================================================
// DB Health metric definitions. Each metric carries:
//   - a human label
//   - the SQL the user can see ("Show query")
//   - a run() that fetches the value via the Supabase client
//   - a status() that classifies the value against thresholds
//
// Note: we use the regular supabase-js client which respects RLS. The "SQL"
// shown to the user is the logical equivalent of what we send.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import {
  checkPct,
  checkRowCount,
  checkStaleness,
  DOMAIN_THRESHOLDS,
  HealthStatus,
  rollup,
} from "./thresholds";

export type MetricValue = {
  /** Display string, e.g. "62,431 rows" or "3 days ago". */
  display: string;
  /** Raw value used by status() — number, string, or null. */
  raw: number | string | null;
  status: HealthStatus;
  /** Optional explanatory note. */
  note?: string;
};

export type MetricRunResult = MetricValue & {
  ms: number;
  error?: string | null;
};

export interface MetricDef {
  key: string;
  label: string;
  /** SQL string shown in the "Show query" disclosure. */
  sql: string;
  run: () => Promise<MetricRunResult>;
}

export interface DomainDef {
  key: string;
  label: string;
  description: string;
  metrics: MetricDef[];
}

// ---------- helpers ---------------------------------------------------------

async function timed<T>(fn: () => PromiseLike<T>): Promise<{ value: T; ms: number }> {
  const t0 = performance.now();
  const value = await fn();
  return { value, ms: Math.round(performance.now() - t0) };
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US");
}

function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

function fmtAge(iso: string | null | undefined): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const days = ms / (1000 * 60 * 60 * 24);
  if (days < 1) return `${Math.round(days * 24)}h ago`;
  if (days < 30) return `${Math.round(days)}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}

// ---------- metric builders -------------------------------------------------

function metricRowCount(table: string, friendly: string): MetricDef {
  return {
    key: `${table}.row_count`,
    label: "Row count",
    sql: `SELECT count(*) FROM public.${table};`,
    run: async () => {
      const { value, ms } = await timed(() =>
        supabase.from(table as any).select("*", { count: "exact", head: true }),
      );
      const count = value.count ?? null;
      const t = DOMAIN_THRESHOLDS[table];
      const err = value.error?.message ?? null;
      return {
        raw: count,
        display: err ? "—" : `${fmtNum(count)} rows`,
        status: err ? "unknown" : t ? checkRowCount(count, t) : count != null && count > 0 ? "green" : "red",
        error: err,
        ms,
        note: friendly,
      };
    },
  };
}

function metricColumnNonNullPct(
  table: string,
  column: string,
  minPct: number,
): MetricDef {
  return {
    key: `${table}.${column}.non_null_pct`,
    label: `% with ${column}`,
    sql: `SELECT 100.0 * count(${column})::float / nullif(count(*), 0) AS pct
FROM public.${table};`,
    run: async () => {
      const { value: totalRes, ms: ms1 } = await timed(() =>
        supabase.from(table as any).select("*", { count: "exact", head: true }),
      );
      const { value: nonNullRes, ms: ms2 } = await timed(() =>
        supabase.from(table as any).select("*", { count: "exact", head: true }).not(column, "is", null),
      );
      const total = totalRes.count ?? 0;
      const nonNull = nonNullRes.count ?? 0;
      const pct = total > 0 ? (nonNull / total) * 100 : null;
      const err = totalRes.error?.message ?? nonNullRes.error?.message ?? null;
      return {
        raw: pct,
        display: err ? "—" : `${fmtPct(pct)} (${fmtNum(nonNull)} / ${fmtNum(total)})`,
        status: err ? "unknown" : checkPct(pct, minPct),
        error: err,
        ms: ms1 + ms2,
      };
    },
  };
}

function metricFreshness(table: string, column: string, maxDays: number): MetricDef {
  return {
    key: `${table}.${column}.fresh`,
    label: `Oldest ${column}`,
    sql: `SELECT min(${column}) FROM public.${table} WHERE ${column} IS NOT NULL;`,
    run: async () => {
      const { value, ms } = await timed(() =>
        supabase
          .from(table as any)
          .select(column)
          .not(column, "is", null)
          .order(column, { ascending: true })
          .limit(1)
          .maybeSingle(),
      );
      const iso = (value.data as any)?.[column] ?? null;
      return {
        raw: iso,
        display: fmtAge(iso),
        status: checkStaleness(iso, { minRows: 0, maxStalenessDays: maxDays }),
        error: value.error?.message ?? null,
        ms,
      };
    },
  };
}

function metricNumericRange(
  table: string,
  column: string,
  expectedMin: number,
  expectedMax: number,
): MetricDef {
  return {
    key: `${table}.${column}.range`,
    label: `${column} range`,
    sql: `SELECT min(${column}), max(${column}), avg(${column}) FROM public.${table};`,
    run: async () => {
      const { value: minRes, ms: m1 } = await timed(() =>
        supabase
          .from(table as any)
          .select(column)
          .not(column, "is", null)
          .order(column, { ascending: true })
          .limit(1)
          .maybeSingle(),
      );
      const { value: maxRes, ms: m2 } = await timed(() =>
        supabase
          .from(table as any)
          .select(column)
          .not(column, "is", null)
          .order(column, { ascending: false })
          .limit(1)
          .maybeSingle(),
      );
      const lo = (minRes.data as any)?.[column] ?? null;
      const hi = (maxRes.data as any)?.[column] ?? null;
      const inRange =
        lo != null && hi != null && lo >= expectedMin && hi <= expectedMax;
      return {
        raw: lo,
        display: `min ${lo ?? "—"} · max ${hi ?? "—"} (expected ${expectedMin}–${expectedMax})`,
        status: inRange ? "green" : "yellow",
        error: minRes.error?.message ?? maxRes.error?.message ?? null,
        ms: m1 + m2,
      };
    },
  };
}

// ---------- domain definitions ----------------------------------------------

export const DOMAINS: DomainDef[] = [
  {
    key: "us_cities_scored",
    label: "City scoring",
    description: "The market-scoring table that powers City Search.",
    metrics: [
      metricRowCount("us_cities_scored", "Total scored cities."),
      metricColumnNonNullPct("us_cities_scored", "composite_score_default", 90),
      metricColumnNonNullPct("us_cities_scored", "median_household_income", 80),
      metricColumnNonNullPct("us_cities_scored", "cost_of_living_index", 70),
      metricColumnNonNullPct("us_cities_scored", "population", 95),
      metricNumericRange("us_cities_scored", "composite_score_default", 0, 100),
      metricFreshness("us_cities_scored", "scored_at", 30),
    ],
  },
  {
    key: "us_cities_geo",
    label: "City geography",
    description: "Reference data: every US city with coordinates and population.",
    metrics: [
      metricRowCount("us_cities_geo", "Census-derived city catalog."),
      metricColumnNonNullPct("us_cities_geo", "lat", 99),
      metricColumnNonNullPct("us_cities_geo", "population", 90),
    ],
  },
  {
    key: "teacher_prospects",
    label: "Teacher prospects",
    description: "Imported teachers in the outreach funnel.",
    metrics: [
      metricRowCount("teacher_prospects", "Total prospects."),
      metricColumnNonNullPct("teacher_prospects", "email", 3),
      metricFreshness("teacher_prospects", "updated_at", 14),
    ],
  },
  {
    key: "public_schools",
    label: "Public schools",
    description: "NCES public school catalog for matching teachers to cities.",
    metrics: [
      metricRowCount("public_schools", "Schools loaded from NCES."),
      metricColumnNonNullPct("public_schools", "city_name", 95),
      metricColumnNonNullPct("public_schools", "us_cities_scored_id", 30),
    ],
  },
  {
    key: "candidates",
    label: "Candidates",
    description: "Active candidates in the franchisee pipeline.",
    metrics: [
      metricRowCount("candidates", "Pipeline records."),
      metricColumnNonNullPct("candidates", "email", 80),
    ],
  },
  {
    key: "city_seed_runs",
    label: "Seeding runs",
    description: "Background imports that refresh city data.",
    metrics: [
      metricRowCount("city_seed_runs", "Seed-run history."),
      metricFreshness("city_seed_runs", "started_at", 60),
    ],
  },
];

export function getDomainStatus(values: Record<string, MetricRunResult | undefined>): HealthStatus {
  return rollup(Object.values(values).map((v) => v?.status ?? "unknown"));
}
