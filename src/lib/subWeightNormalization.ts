// Pure, unit-testable helpers for the sub-metric weights drawer.
// Extracted from SubMetricWeightsDrawer.tsx so the drawer can stay UI-only.

import type { SowMetricEntry } from "@/lib/sowMetricRegistry";

/** Sum of enabled built-in + custom weights (drives "effective %" preview). */
export function sumEnabledWeights(
  metrics: SowMetricEntry[],
  cur: Record<string, number>,
  customs: Array<{ weight: number }>,
): number {
  const builtIn = metrics.reduce(
    (s, m) => s + (m.enabled ? (cur[m.key] ?? 0) : 0),
    0,
  );
  const custom = customs.reduce((s, c) => s + (c.weight || 0), 0);
  return builtIn + custom;
}

/**
 * Normalize typed weights so enabled metrics sum to 100%. Disabled metrics
 * stay at 0. If everything is zero, the result is all zeros — the scoring
 * helper falls back to the server category score.
 */
export function normalizeToHundred(
  metrics: SowMetricEntry[],
  cur: Record<string, number>,
  enabledSum: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  metrics.forEach((m) => {
    const v = m.enabled ? (cur[m.key] ?? 0) : 0;
    out[m.key] = enabledSum > 0 ? (v / enabledSum) * 100 : 0;
  });
  return out;
}

/** Equal split (integer-rounded) across enabled metrics. */
export function equalSplit(metrics: SowMetricEntry[]): Record<string, number> {
  const enabled = metrics.filter((m) => m.enabled);
  const each = enabled.length > 0 ? Math.round(100 / enabled.length) : 0;
  const out: Record<string, number> = {};
  metrics.forEach((m) => {
    out[m.key] = m.enabled ? each : 0;
  });
  return out;
}

/** True iff normalized typed weights differ from last applied (>0.05% tol). */
export function hasPendingEdits(
  metrics: SowMetricEntry[],
  cur: Record<string, number>,
  enabledSum: number,
  applied: Record<string, number>,
): boolean {
  const norm = normalizeToHundred(metrics, cur, enabledSum);
  return metrics.some(
    (m) => Math.abs((norm[m.key] ?? 0) - (applied[m.key] ?? 0)) > 0.05,
  );
}

/** Effective % of a single weight within the enabled sum. */
export function effectivePct(
  weight: number,
  isEnabled: boolean,
  enabledSum: number,
): number | null {
  if (!isEnabled || enabledSum <= 0) return null;
  return (weight / enabledSum) * 100;
}
