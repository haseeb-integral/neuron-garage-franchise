// ============================================================================
// Accuracy queries — wrappers around the SECURITY DEFINER RPCs added in the
// Tier 2 migration. Manager-only on the server; we still gate the UI.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";

export interface HealthRule {
  name: string;
  description: string;
  sql: string;
  expected_zero: boolean;
  severity: "info" | "warning" | "critical" | string;
}

export interface RuleResult {
  rule: string;
  count: number;
  rows: Record<string, unknown>[];
}

export const OUTLIER_COLUMNS = [
  "composite_score_default",
  "population",
  "median_household_income",
  "cost_of_living_index",
  "col_salary_index",
  "population_density",
  "public_elementary_teacher_count",
  "csi_score",
] as const;
export type OutlierColumn = (typeof OUTLIER_COLUMNS)[number];

export async function fetchRules(): Promise<HealthRule[]> {
  const { data, error } = await supabase
    .from("db_health_rules" as any)
    .select("*")
    .order("severity", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as HealthRule[];
}

export async function runRule(name: string): Promise<RuleResult> {
  const { data, error } = await supabase.rpc("db_health_run_rule" as any, { _name: name });
  if (error) throw error;
  return data as RuleResult;
}

export async function fetchRandomCity(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc("db_health_random_city" as any);
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}

export async function fetchOutliers(column: OutlierColumn, n = 10) {
  const { data, error } = await supabase.rpc("db_health_outliers" as any, {
    _column: column,
    _n: n,
  });
  if (error) throw error;
  return data as { column: string; rows: Record<string, unknown>[] };
}
