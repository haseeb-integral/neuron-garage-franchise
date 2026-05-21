// Pure-function port of normalizeSowMetric from supabase/functions/_shared/scoring.ts.
// Lets the client recompute per-metric normalized scores (0..100) from raw signal
// values without an extra DB column or edge-function round-trip. Keep in sync if
// the backend ranges change.

function lin(v: number, lo: number, hi: number, invert = false): number {
  if (hi === lo) return 50;
  let t = (v - lo) / (hi - lo);
  if (invert) t = 1 - t;
  return Math.max(0, Math.min(100, t * 100));
}

export type NormalizationRange = {
  lo: number;
  hi: number;
  invert: boolean;
};

// Single source of truth for client-side normalization. Mirrors the backend
// `normalizeSowMetric` switch in supabase/functions/_shared/scoring.ts.
export const NORMALIZATION_RANGES: Record<string, NormalizationRange> = {
  // Demand
  children_5_12_count:                 { lo: 0, hi: 50000, invert: false },
  children_5_12_pct:                   { lo: 5, hi: 18, invert: false },
  households_with_children_under_13:   { lo: 0, hi: 40000, invert: false },
  median_household_income:             { lo: 60000, hi: 180000, invert: false },
  income_100k_plus_pct:                { lo: 20, hi: 70, invert: false },
  income_150k_plus_pct:                { lo: 10, hi: 50, invert: false },
  education_bachelors_plus_pct:        { lo: 25, hi: 70, invert: false },
  // Pricing power
  childcare_nanny_hourly_rate_proxy:   { lo: 25000, hi: 60000, invert: false },
  household_discretionary_income_proxy:{ lo: 20000, hi: 150000, invert: false },
  avg_weekly_camp_tuition:             { lo: 200, hi: 600, invert: false },
  avg_hourly_camp_pricing:             { lo: 8, hi: 20, invert: false },
  premium_stem_camp_pricing:           { lo: 300, hi: 800, invert: false },
  private_school_tuition_proxy:        { lo: 8000, hi: 35000, invert: false },
  // Competitive landscape
  summer_camps_per_10k_children:       { lo: 0, hi: 15, invert: true },
  stem_robotics_maker_camp_count:      { lo: 0, hi: 20, invert: false },
  national_brand_presence:             { lo: 0, hi: 5, invert: false },
  waitlist_sold_out_signal_count:      { lo: 0, hi: 10, invert: false },
  competitor_count:                    { lo: 0, hi: 35, invert: true },
  // TAM Teachers (5-metric lock 2026-05-21) — ranges MUST match backend
  // supabase/functions/_shared/scoring.ts:normalizeSowMetric exactly so the
  // "Show Formula" drawer reproduces the same score the backend stored.
  elementary_school_count:             { lo: 0, hi: 80, invert: false },
  public_elementary_school_count:      { lo: 0, hi: 80, invert: false },
  teacher_salary_proxy:                { lo: 45000, hi: 90000, invert: true },
  public_elementary_teacher_count:     { lo: 0, hi: 2000, invert: false },
  public_elementary_enrollment:        { lo: 0, hi: 30000, invert: false },
  private_charter_montessori_teacher_count: { lo: 0, hi: 800, invert: false },
  private_charter_school_count:        { lo: 0, hi: 40, invert: false },
  cost_of_living_index:                { lo: 80, hi: 180, invert: true },
  // col_salary_index is normalized adaptively in normalizeSowMetric() —
  // when the value is a salary×COL composite (large dollar number) it uses
  // (30000, 120000, invert); when it's a bare COL Index fallback (< 1000)
  // it uses (80, 180, invert). Range below is the salary-composite case.
  col_salary_index:                    { lo: 30000, hi: 120000, invert: true },
  summer_income_need_ratio:            { lo: 0, hi: 1, invert: false },
  // Ease of operations
  rental_venue_count:                  { lo: 0, hi: 25, invert: false },
  guide_wage_proxy:                    { lo: 25000, hi: 60000, invert: true },
  classroom_rental_cost_weekly:        { lo: 250, hi: 2000, invert: true },
  commute_sprawl_index:                { lo: 10, hi: 60, invert: true },
  state_camp_regulation_complexity:    { lo: 1, hi: 5, invert: true },
  // Parent mindset
  montessori_school_density:           { lo: 0, hi: 10, invert: false },
  robotics_maker_space_count:          { lo: 0, hi: 20, invert: false },
  childrens_museum_signal:             { lo: 0, hi: 10, invert: false },
  library_children_program_signal:     { lo: 0, hi: 20, invert: false },
  homeschool_population_proxy:         { lo: 0, hi: 10000, invert: false },
  parenting_facebook_group_activity:   { lo: 0, hi: 100, invert: false },
  parent_community_activity_proxy:     { lo: 0, hi: 100, invert: false },
};

export function normalizeSowMetric(
  signalKey: string,
  value: number | null | undefined,
): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const n = Number(value);
  // col_salary_index can arrive as either a real salary×COL composite
  // (tens of thousands of dollars) or as a bare COL Index fallback
  // (typically 70–200). Pick the matching range so the drawer reproduces
  // the same value the backend stored.
  if (signalKey === "col_salary_index" && n < 1000) {
    return lin(n, 80, 180, true);
  }
  const r = NORMALIZATION_RANGES[signalKey];
  if (!r) return null;
  return lin(n, r.lo, r.hi, r.invert);
}

// Best-effort numeric extraction from a city_market_signals.value text field.
// Strips $, commas, %, and trailing units. Returns null if no usable number.
export function parseSignalValue(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const cleaned = String(raw).replace(/[,$\s]/g, "").replace(/%$/, "");
  const m = cleaned.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}
