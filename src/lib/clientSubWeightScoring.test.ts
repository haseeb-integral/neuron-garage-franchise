// Fixtures for the client-side scoring engine.
// Bug bait covered:
//   - null metric values must drop OUT of the denominator (not contribute 0)
//   - disabled metrics must drop out
//   - all-null / all-disabled → fall back to server score
//   - non-finite math (NaN custom weight) must not poison the UI
//   - composite respects master shares and skips null categories
import { describe, it, expect } from "vitest";
import {
  recomputeCategoryScore,
  recomputeComposite,
  CUSTOM_METRIC_NEUTRAL_NORM,
} from "./clientSubWeightScoring";
import { METRICS_BY_CATEGORY } from "./sowMetricRegistry";

const DEMAND = METRICS_BY_CATEGORY.demand;
// keys: children_5_12_count, median_household_income, dual_income_household_pct, education_bachelors_plus_pct

describe("recomputeCategoryScore", () => {
  it("normalizes raw values and returns a 0-100 score using sub-weight shares", () => {
    const res = recomputeCategoryScore(
      DEMAND,
      {
        children_5_12_count: 56500,     // mid of 3000..110000 -> ~50
        median_household_income: 97500, // mid of 45000..150000 -> ~50
        dual_income_household_pct: 91.5,// mid of 85..98 -> ~50
        education_bachelors_plus_pct: 42.5, // mid of 15..70 -> ~50
      },
      { children_5_12_count: 30, median_household_income: 25, dual_income_household_pct: 20, education_bachelors_plus_pct: 25 },
      null,
    );
    expect(res.usedServerFallback).toBe(false);
    expect(res.score).not.toBeNull();
    expect(res.score!).toBeGreaterThan(45);
    expect(res.score!).toBeLessThan(55);
    expect(res.contributions.every((c) => c.used)).toBe(true);
  });

  it("drops null metrics from the denominator instead of zeroing them", () => {
    // Two metrics live at the top of range (→ 100), two are null. Weighted
    // score should be 100, not 50 — null must NOT count as a zero.
    const res = recomputeCategoryScore(
      DEMAND,
      {
        children_5_12_count: 110000,
        median_household_income: 150000,
        dual_income_household_pct: null,
        education_bachelors_plus_pct: null,
      },
      { children_5_12_count: 30, median_household_income: 25, dual_income_household_pct: 20, education_bachelors_plus_pct: 25 },
      null,
    );
    expect(res.score).toBe(100);
    expect(res.usableSum).toBe(55); // only the two non-null sub-weights
  });

  it("falls back to the server score when no metric can contribute", () => {
    const res = recomputeCategoryScore(
      DEMAND,
      { children_5_12_count: null, median_household_income: null, dual_income_household_pct: null, education_bachelors_plus_pct: null },
      { children_5_12_count: 30, median_household_income: 25, dual_income_household_pct: 20, education_bachelors_plus_pct: 25 },
      72,
    );
    expect(res.usedServerFallback).toBe(true);
    expect(res.score).toBe(72);
  });

  it("falls back when every sub-weight is zero (user collapsed the drawer)", () => {
    const res = recomputeCategoryScore(
      DEMAND,
      { children_5_12_count: 56500, median_household_income: 97500, dual_income_household_pct: 91.5, education_bachelors_plus_pct: 42.5 },
      { children_5_12_count: 0, median_household_income: 0, dual_income_household_pct: 0, education_bachelors_plus_pct: 0 },
      48,
    );
    expect(res.usedServerFallback).toBe(true);
    expect(res.score).toBe(48);
  });

  it("includes custom metrics with the neutral normalized value", () => {
    const res = recomputeCategoryScore(
      [], // no built-ins, just custom
      {},
      {},
      null,
      [{ id: "cust-1", label: "Brand fit", weight: 50 }],
    );
    expect(res.score).toBe(CUSTOM_METRIC_NEUTRAL_NORM);
    expect(res.contributions[0].isCustom).toBe(true);
  });

  it("recovers from a NaN custom weight instead of returning NaN", () => {
    const res = recomputeCategoryScore(
      [],
      {},
      {},
      55,
      [{ id: "cust-bad", label: "Broken", weight: Number.NaN }],
    );
    // NaN weight coerces to 0, no usable contributions → server fallback.
    expect(res.usedServerFallback).toBe(true);
    expect(res.score).toBe(55);
  });
});

describe("recomputeComposite", () => {
  // Phase 2 (Sam+Brett 2026-07-07): composite = Demand + TAM (franchiseeSupply) only.
  // The CSI-derived `competitiveLandscape` pillar is force-dropped regardless
  // of its stored weight or score.
  it("uses only demand + franchiseeSupply and rescales their shares to 1", () => {
    const { composite } = recomputeComposite(
      { demand: 80, competitiveLandscape: 60, franchiseeSupply: 40 },
      { demand: 50, competitiveLandscape: 25, franchiseeSupply: 25 },
    );
    // Effective shares: demand 50/(50+25) = 2/3, supply 25/(50+25) = 1/3
    // → 80 * 2/3 + 40 * 1/3 = 53.33 + 13.33 = 66.67 → 67
    expect(composite).toBe(67);
  });

  it("ignores competitiveLandscape even when its weight is heavy", () => {
    const { composite } = recomputeComposite(
      { demand: 80, competitiveLandscape: 100, franchiseeSupply: 40 },
      { demand: 40, competitiveLandscape: 90, franchiseeSupply: 30 },
    );
    // CSI dropped. demand 40/(40+30), supply 30/(40+30) → 80*0.571 + 40*0.429 = 62.86 → 63
    expect(composite).toBe(63);
  });

  it("skips null category scores instead of treating them as zero", () => {
    const { composite } = recomputeComposite(
      { demand: 80, competitiveLandscape: null, franchiseeSupply: null },
      { demand: 50, competitiveLandscape: 25, franchiseeSupply: 25 },
    );
    // Only demand has a score, so composite = demand = 80
    expect(composite).toBe(80);
  });

  it("returns composite 0 when no eligible category has a score", () => {
    const { composite } = recomputeComposite(
      { demand: null, competitiveLandscape: 90, franchiseeSupply: null },
      { demand: 50, competitiveLandscape: 25, franchiseeSupply: 25 },
    );
    // competitiveLandscape is force-dropped even though it has a score.
    expect(composite).toBe(0);
  });
});

