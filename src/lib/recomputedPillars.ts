// Shared pillar recomputation for ANY market (selected or compare-listed).
//
// Background (May 26, 2026 incident, Brett-approved fix):
// The center "Selected Market" panel, drawer, and Market Report recompute
// each pillar (Demand / Operator & Venue Supply / Competitive Opportunity) on the fly
// from the underlying signal values + the user's applied sub-weights, then
// pass the result through buildPillarView() to calibrate for display.
//
// The Compare modal, however, was reading the DB-stored raw pillar scores
// (`row.score_demand`, etc.) and calibrating those. Because the recomputed
// pillar can differ from the stored one (different sub-weights, different
// signal coverage), the same Nashville showed two different sets of pillar
// numbers depending on where you looked — violating Brett's May-24
// "one calibrated number everywhere" rule.
//
// This module lifts the recomputation logic into one helper so the Compare
// modal can reuse the exact same pipeline as the selected-market surfaces.
// No new math — pure refactor of code already living in CityScoring.tsx.

import {
  buildSeededFallbackSignalsFromScored,
  type RankedMarket,
} from "@/lib/cityScoringLiveData";
import { competitiveOpportunityFromCsi } from "@/lib/marketView";
import { recomputeCategoryScore } from "@/lib/clientSubWeightScoring";
import {
  METRICS_BY_CATEGORY,
  type SowMetricEntry,
} from "@/lib/sowMetricRegistry";
import { parseSignalValue } from "@/lib/sowNormalize";
import type { CategoryKey } from "@/stores/cityScoringStore";

export type AppliedSubWeights = Partial<Record<CategoryKey, Record<string, number>>>;

const PILLAR_KEYS: CategoryKey[] = [
  "demand",
  "franchiseeSupply",
  "competitiveLandscape",
];

/**
 * Returns the recomputed pillar scores (RAW 0–100, pre-calibration) for a
 * single market, identical to what `CityScoring.tsx` produces for the
 * currently-selected market. Pass the result into `buildPillarView()` to get
 * the calibrated display number.
 */
export function buildRecomputedPillarScores(
  market: RankedMarket,
  appliedSubWeights: AppliedSubWeights,
  childrenPct?: number,
): Partial<Record<CategoryKey, number>> {
  const scoredRow = market.scoredRow;
  if (!scoredRow) return market.categoryScores ?? {};

  // 1. Build per-signal raw values from the seeded fallback (same pipeline
  //    the detail panel uses when no live legacy signals are present).
  const seededSignals = buildSeededFallbackSignalsFromScored(scoredRow, childrenPct);
  const rawValuesByKey: Record<string, number | null> = {};
  for (const s of seededSignals) {
    if (!s?.signal_key) continue;
    rawValuesByKey[s.signal_key] = parseSignalValue(s.value);
  }

  // 2. Stored DB pillar values act as the per-category fallback when the
  //    sub-weighted recompute can't produce a result (e.g., zero coverage).
  const dbFallback: Partial<Record<CategoryKey, number | null>> = {
    demand: scoredRow.score_demand == null ? null : Number(scoredRow.score_demand),
    franchiseeSupply: scoredRow.score_tam_teachers == null ? null : Number(scoredRow.score_tam_teachers),
    competitiveLandscape: competitiveOpportunityFromCsi(
      scoredRow.score_csi == null ? null : Number(scoredRow.score_csi),
    ),
  };

  // 3. Recompute each pillar using the user's applied sub-weights.
  const out: Partial<Record<CategoryKey, number>> = {};
  for (const k of PILLAR_KEYS) {
    const metrics: readonly SowMetricEntry[] = METRICS_BY_CATEGORY[k] ?? [];
    const r = recomputeCategoryScore(
      metrics,
      rawValuesByKey,
      appliedSubWeights[k] ?? {},
      dbFallback[k] ?? null,
    );
    if (r?.score != null && Number.isFinite(r.score)) {
      out[k] = Math.round(r.score);
    } else if (dbFallback[k] != null) {
      out[k] = Math.round(dbFallback[k] as number);
    }
  }
  return out;
}

// ─── Composite recomputation ───────────────────────────────────────────────
// Same pipeline `useCityRanking` uses for the re-ranked table SCORE column.
// Lifted here so the Compare modal + exports produce the SAME raw composite
// the table is sorted by — fixes the May-27 "table=100, modal=99" drift.
// Returns the RAW composite (pre-calibration). Pass through buildMarketView
// (or calibrateCompositeForDisplay) to get the displayed 0-100 value.
import { recomputeComposite } from "@/lib/clientSubWeightScoring";

export function buildRecomputedRawComposite(
  market: RankedMarket,
  appliedSubWeights: AppliedSubWeights,
  appliedWeights: Partial<Record<CategoryKey, number>>,
): number {
  if (!market.hasLiveData) return 0;
  const pillars = buildRecomputedPillarScores(market, appliedSubWeights);
  const cats: Partial<Record<CategoryKey, number | null>> = {
    demand: pillars.demand ?? null,
    franchiseeSupply: pillars.franchiseeSupply ?? null,
    competitiveLandscape: pillars.competitiveLandscape ?? null,
  };
  const { composite } = recomputeComposite(
    cats,
    appliedWeights as Record<CategoryKey, number>,
  );
  return composite;
}
