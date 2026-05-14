// Pure helpers that recompute category + composite scores on the client using
// the user's per-category sub-weights and master category weights. Server-stored
// values remain the fallback when the user collapses a category's sub-weights
// to zero or when no per-metric values are available.
//
// Formula (per CLAUDE.md Rule 1, Show Formula must reveal these):
//   normalized_i  = raw_i clipped/scaled to 0..100 via NORMALIZATION_RANGES
//   sub_share_i   = sub_i / Σ(sub enabled with usable values)
//   categoryScore = Σ_i (sub_share_i × normalized_i)
//   composite     = Σ_c (master_c / Σmaster) × categoryScore_c

import type { CategoryKey } from "@/stores/cityScoringStore";
import type { SowMetricEntry } from "@/lib/sowMetricRegistry";
import { normalizeSowMetric } from "@/lib/sowNormalize";

export type MetricContribution = {
  key: string;
  label: string;
  rawValue: number | null;
  normalized: number | null;
  subWeight: number;          // raw user input (0..N), pre-normalization
  subShare: number;           // 0..1, share within category
  contribution: number;       // normalized × subShare
  used: boolean;              // true iff included in the category sum
};

export type CategoryRecomputeResult = {
  score: number | null;       // null → caller should use serverFallback
  usedServerFallback: boolean;
  contributions: MetricContribution[];
  enabledSum: number;         // Σ raw sub-weights across enabled metrics
  usableSum: number;          // Σ raw sub-weights across metrics that contributed
};

export function recomputeCategoryScore(
  metricsInCategory: readonly SowMetricEntry[],
  rawValuesByKey: Record<string, number | null | undefined>,
  appliedSubByKey: Record<string, number>,
  serverFallback: number | null | undefined,
): CategoryRecomputeResult {
  const contributions: MetricContribution[] = [];
  let enabledSum = 0;
  let usableSum = 0;

  for (const m of metricsInCategory) {
    const sub = Math.max(0, Number(appliedSubByKey[m.key] ?? 0));
    const raw = m.enabled ? (rawValuesByKey[m.key] ?? null) : null;
    const normalized = m.enabled ? normalizeSowMetric(m.key, raw) : null;
    if (m.enabled) enabledSum += sub;
    const used = m.enabled && sub > 0 && normalized != null;
    if (used) usableSum += sub;
    contributions.push({
      key: m.key,
      label: m.label,
      rawValue: raw == null || !Number.isFinite(raw as number) ? null : Number(raw),
      normalized,
      subWeight: sub,
      subShare: 0, // filled below once usableSum is known
      contribution: 0,
      used,
    });
  }

  if (usableSum <= 0) {
    const fallback = typeof serverFallback === "number" ? serverFallback : null;
    return {
      score: fallback,
      usedServerFallback: fallback != null,
      contributions,
      enabledSum,
      usableSum,
    };
  }

  let sum = 0;
  for (const c of contributions) {
    if (!c.used || c.normalized == null) continue;
    c.subShare = c.subWeight / usableSum;
    c.contribution = c.normalized * c.subShare;
    sum += c.contribution;
  }
  const score = Math.max(0, Math.min(100, sum));
  return { score, usedServerFallback: false, contributions, enabledSum, usableSum };
}

export type CompositeRecomputeResult = {
  composite: number;
  perCategoryShares: Record<CategoryKey, number>; // master share, 0..1
};

export function recomputeComposite(
  categoryScores: Partial<Record<CategoryKey, number | null>>,
  masterWeights: Record<CategoryKey, number>,
): CompositeRecomputeResult {
  let masterTotal = 0;
  (Object.keys(masterWeights) as CategoryKey[]).forEach((k) => {
    if (typeof categoryScores[k] === "number") masterTotal += masterWeights[k];
  });

  const perCategoryShares = {} as Record<CategoryKey, number>;
  if (masterTotal <= 0) {
    (Object.keys(masterWeights) as CategoryKey[]).forEach((k) => (perCategoryShares[k] = 0));
    return { composite: 0, perCategoryShares };
  }

  let sum = 0;
  (Object.keys(masterWeights) as CategoryKey[]).forEach((k) => {
    const v = categoryScores[k];
    const share = masterWeights[k] / masterTotal;
    perCategoryShares[k] = share;
    if (typeof v === "number") sum += v * share;
  });

  return { composite: Math.round(sum), perCategoryShares };
}

// Plain-English summary of a category recompute. Drives the "human-readable"
// block above the math table in the Show Formula panel.
export function summarizeCategory(
  result: CategoryRecomputeResult,
  cityLabel: string | undefined,
  categoryLabel: string,
  masterWeightPct?: number,
  compositeContribution?: number,
): string {
  const cityPart = cityLabel ? `${cityLabel} scores` : "This city scores";
  if (result.score == null) {
    return `No usable data for ${categoryLabel} — falling back to the server-stored score.`;
  }
  const used = result.contributions.filter((c) => c.used);
  const unavailable = result.contributions.filter((c) => !c.used).length;
  const heaviest = [...used].sort((a, b) => b.contribution - a.contribution)[0];

  const sentences: string[] = [];
  sentences.push(`${cityPart} ${result.score.toFixed(1)} on ${categoryLabel}.`);
  if (heaviest) {
    sentences.push(
      `${heaviest.label} is your heaviest metric at ${(heaviest.subShare * 100).toFixed(1)}% weight, contributing ${heaviest.contribution.toFixed(1)} points.`,
    );
  }
  if (unavailable > 0) {
    sentences.push(
      `${unavailable} metric${unavailable === 1 ? " is" : "s are"} unavailable and excluded from scoring.`,
    );
  }
  if (result.usedServerFallback) {
    sentences.push(`Sub-weights collapsed to zero — using the server-stored category score as fallback.`);
  }
  if (masterWeightPct != null && compositeContribution != null) {
    const cityName = cityLabel ?? "this city";
    sentences.push(
      `${categoryLabel} counts for ${masterWeightPct.toFixed(1)}% of the overall composite, so it contributes ${compositeContribution.toFixed(1)} points to ${cityName}'s composite score today.`,
    );
  }
  return sentences.join(" ");
}
