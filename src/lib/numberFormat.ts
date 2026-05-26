// Centralized number formatter for City Search display surfaces.
// Display-only: do NOT use for CSV/PDF exports or for score/formula math.

export type MetricUnit = "currency" | "percent" | "integer" | "decimal";

export interface FormatOptions {
  unit?: MetricUnit;
  maxFractionDigits?: number;
}

// Explicit overrides for metric keys whose name doesn't clearly indicate a unit.
// Keys are matched case-insensitively, exact match against the registry key
// (or the signal_key). Add entries here as new metrics surface.
const UNIT_OVERRIDES: Record<string, MetricUnit> = {
  disposable_household_income: "currency",
  median_household_income: "currency",
  median_home_price: "currency",
  median_home_value: "currency",
  avg_rent: "currency",
  median_rent: "currency",
  per_capita_income: "currency",
  household_spend: "currency",

  under_18_population: "integer",
  children_population: "integer",
  population: "integer",
  households: "integer",
  businesses: "integer",
  vehicle_registrations: "integer",
  registered_vehicles: "integer",

  unemployment: "percent",
  homeownership: "percent",
  owner_occupied: "percent",
  poverty_rate: "percent",
};

function inferUnit(key: string | undefined): MetricUnit | null {
  if (!key) return null;
  const k = key.toLowerCase();
  if (UNIT_OVERRIDES[k]) return UNIT_OVERRIDES[k];
  if (/(pct|percent|rate)\b|_pct$|_percent$|_rate$/.test(k)) return "percent";
  if (/(income|spend|capital|price|revenue|cost|earnings|wage|rent|value|salary)/.test(k)) {
    return "currency";
  }
  if (/(population|households?|businesses|count|registrations?|vehicles?|children)/.test(k)) {
    return "integer";
  }
  return null;
}

function formatNumberByUnit(num: number, unit: MetricUnit, maxFractionDigits = 1): string {
  switch (unit) {
    case "percent": {
      const pct = Math.abs(num) <= 1 ? num * 100 : num;
      return `${pct.toLocaleString(undefined, { maximumFractionDigits: maxFractionDigits })}%`;
    }
    case "currency":
      return `$${Math.round(num).toLocaleString()}`;
    case "integer":
      return Math.round(num).toLocaleString();
    case "decimal":
    default:
      return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
}

/**
 * Format a metric value for display in City Search.
 * Returns "—" for null/empty/non-finite values.
 * Falls back to the original string when the value is non-numeric (e.g. labels).
 */
export function formatMetric(
  value: unknown,
  key?: string,
  opts: FormatOptions = {},
): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return String(value);

  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || String(value).trim() === "") {
    return String(value);
  }

  const unit =
    opts.unit ??
    inferUnit(key) ??
    (Number.isInteger(num) ? "integer" : "decimal");

  return formatNumberByUnit(num, unit, opts.maxFractionDigits);
}
