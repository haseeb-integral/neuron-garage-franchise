import { describe, it, expect } from "vitest";
import {
  computeMvs,
  DEFAULT_WEIGHTS,
  ELIGIBLE_CATEGORIES,
  type MvsProviderInput,
  type MvsWeekInput,
  type MvsAcsInput,
  type MvsOperatorWatchlistEntry,
  type MvsCityOverlapOverride,
} from "./computeMvs";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeProvider(overrides: Partial<MvsProviderInput> = {}): MvsProviderInput {
  return {
    id: `p-${Math.random().toString(36).slice(2, 8)}`,
    name: "Test Provider",
    tier: "premium",
    price_max: 500,
    category_classified: "STEM",
    site_count: 1,
    ...overrides,
  };
}

function makeWeek(overrides: Partial<MvsWeekInput> = {}): MvsWeekInput {
  return {
    provider_id: "p-1",
    status: "open",
    ...overrides,
  };
}

const defaultAcs: MvsAcsInput = {
  affluent_dual_income_family_count: 10_000,
  children_5_12_count: 50_000,
};

const defaultWatchlist: MvsOperatorWatchlistEntry[] = [
  { name: "Galileo", default_overlap: "direct" },
  { name: "iD Tech", default_overlap: "direct" },
  { name: "Steve & Kate's", default_overlap: "adjacent" },
];

// ---------------------------------------------------------------------------
// Score 1 — Pricing Acceptance
// ---------------------------------------------------------------------------

describe("Score 1: Pricing Acceptance", () => {
  it("scores null when no premium providers", () => {
    const r = computeMvs(
      [makeProvider({ tier: "mid" })],
      [],
      defaultAcs,
    );
    expect(r.scores.pricingAcceptance).toBeNull();
  });

  it("normalizes median and p75 correctly for known inputs", () => {
    // 4 premium providers at $400, $500, $600, $700
    // median = 550 → normalize(550, 300, 700) = (250/400)*100 = 62.5
    // p75 = 625 → normalize(625, 400, 800) = (225/400)*100 = 56.25
    // % >= 500 = 3/4 = 75 → normalize(75, 0, 100) = 75
    // score = 0.40*62.5 + 0.40*56.25 + 0.20*75 = 25 + 22.5 + 15 = 62.5
    const providers = [
      makeProvider({ price_max: 400 }),
      makeProvider({ price_max: 500 }),
      makeProvider({ price_max: 600 }),
      makeProvider({ price_max: 700 }),
    ];
    const r = computeMvs(providers, [], defaultAcs);
    expect(r.scores.pricingAcceptance).toBeCloseTo(62.5, 1);
    expect(r.inputs.pricingAcceptance.medianPrice).toBeCloseTo(550, 1);
    expect(r.inputs.pricingAcceptance.p75Price).toBeCloseTo(625, 1);
    expect(r.inputs.pricingAcceptance.pctAtLeast500).toBeCloseTo(75, 1);
  });

  it("caps at 0 when all prices are below range", () => {
    const providers = [
      makeProvider({ price_max: 100 }),
      makeProvider({ price_max: 200 }),
    ];
    const r = computeMvs(providers, [], defaultAcs);
    expect(r.scores.pricingAcceptance).toBe(0);
  });

  it("caps at 100 when all prices are above range", () => {
    const providers = [
      makeProvider({ price_max: 900 }),
      makeProvider({ price_max: 1000 }),
    ];
    const r = computeMvs(providers, [], defaultAcs);
    expect(r.scores.pricingAcceptance).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Score 2 — Market Absorption
// ---------------------------------------------------------------------------

describe("Score 2: Market Absorption", () => {
  it("scores null when no weeks for premium providers", () => {
    const r = computeMvs([makeProvider()], [], defaultAcs);
    expect(r.scores.marketAbsorption).toBeNull();
  });

  it("returns year_2_signal flag in v1.0", () => {
    const r = computeMvs(
      [makeProvider()],
      [makeWeek({ status: "sold_out" })],
      defaultAcs,
    );
    expect(r.inputs.marketAbsorption.year2Signal).toBe(true);
    expect(r.inputs.marketAbsorption.timeToSellout).toBeNull();
    expect(r.inputs.marketAbsorption.yoyVelocity).toBeNull();
  });

  it("computes sellout rate = (sold_out + waitlist) / total", () => {
    const pid = "p-abc";
    const providers = [makeProvider({ id: pid })];
    const weeks = [
      makeWeek({ provider_id: pid, status: "sold_out" }),
      makeWeek({ provider_id: pid, status: "waitlist" }),
      makeWeek({ provider_id: pid, status: "open" }),
      makeWeek({ provider_id: pid, status: "unknown" }),
    ];
    // sellout rate = 2/4 = 50%
    // normalize(50, 0, 80) = (50/80)*100 = 62.5
    const r = computeMvs(providers, weeks, defaultAcs);
    expect(r.scores.marketAbsorption).toBeCloseTo(62.5, 1);
    expect(r.inputs.marketAbsorption.selloutRate).toBeCloseTo(50, 1);
  });

  it("counts low_availability / limited as NOT sold out", () => {
    const pid = "p-def";
    const providers = [makeProvider({ id: pid })];
    const weeks = [
      makeWeek({ provider_id: pid, status: "limited" }),
      makeWeek({ provider_id: pid, status: "low_availability" }),
      makeWeek({ provider_id: pid, status: "open" }),
    ];
    const r = computeMvs(providers, weeks, defaultAcs);
    expect(r.inputs.marketAbsorption.selloutRate).toBeCloseTo(0, 1);
    expect(r.scores.marketAbsorption).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Score 3 — Scaled Operator
// ---------------------------------------------------------------------------

describe("Score 3: Scaled Operator", () => {
  it("scores null when no premium providers", () => {
    const r = computeMvs(
      [makeProvider({ tier: "mid" })],
      [],
      defaultAcs,
      { watchlist: defaultWatchlist },
    );
    expect(r.scores.scaledOperator).toBeNull();
  });

  it("counts watchlist matches and direct competitor load", () => {
    // 2 Galileo providers (direct), 1 Steve & Kate's (adjacent)
    // operatorValidation = 2 (Galileo, Steve & Kate's) capped at 8
    // directSiteCount = 2 + 3 = 5
    // children_5_12 = 50,000 → per10k = 5
    // directCompetitorLoad = 5 / 5 = 1.0 per 10k
    // nValidation = normalize(2, 0, 8) = 25
    // nLoad = normalize(1, 0, 5) = 20
    // score = 0.65*25 + 0.35*(100-20) = 16.25 + 28 = 44.25
    const providers = [
      makeProvider({ name: "Galileo Austin", site_count: 2 }),
      makeProvider({ name: "Galileo Round Rock", site_count: 3 }),
      makeProvider({ name: "Steve & Kate's Austin", site_count: 1 }),
    ];
    const r = computeMvs(providers, [], defaultAcs, { watchlist: defaultWatchlist });
    expect(r.scores.scaledOperator).toBeCloseTo(44.25, 1);
    expect(r.inputs.scaledOperator.operatorValidation).toBe(2);
    expect(r.inputs.scaledOperator.directCompetitorLoad).toBeCloseTo(1.0, 1);
  });

  it("applies city overlap overrides", () => {
    // Galileo normally direct, override to adjacent
    const providers = [makeProvider({ name: "Galileo Austin", site_count: 4 })];
    const overrides: MvsCityOverlapOverride[] = [
      { operator_name: "Galileo", overlap: "adjacent" },
    ];
    const r = computeMvs(providers, [], defaultAcs, {
      watchlist: defaultWatchlist,
      overlapOverrides: overrides,
    });
    // operatorValidation = 1, directSiteCount = 0
    // nValidation = normalize(1, 0, 8) = 12.5
    // nLoad = normalize(0, 0, 5) = 0
    // score = 0.65*12.5 + 0.35*100 = 8.125 + 35 = 43.125
    expect(r.scores.scaledOperator).toBeCloseTo(43.125, 1);
    expect(r.inputs.scaledOperator.directCompetitorLoad).toBe(0);
  });

  it("defaults missing site_count to 1 for direct competitors", () => {
    const providers = [makeProvider({ name: "Galileo Austin", site_count: undefined })];
    const r = computeMvs(providers, [], defaultAcs, { watchlist: defaultWatchlist });
    expect(r.inputs.scaledOperator.directCompetitorLoad).toBeCloseTo(0.2, 1); // 1 / 5
  });
});

// ---------------------------------------------------------------------------
// Score 4 — Enrichment Diversity
// ---------------------------------------------------------------------------

describe("Score 4: Enrichment Diversity", () => {
  it("scores null when no premium providers", () => {
    const r = computeMvs([makeProvider({ tier: "budget" })], [], defaultAcs);
    expect(r.scores.enrichmentDiversity).toBeNull();
  });

  it("scores by category count only (breadth), ignoring provider count", () => {
    // 5 providers, 3 distinct categories
    // clamp(3, 2, 10) = 3 → normalize(3, 2, 10) = (1/8)*100 = 12.5
    const providers = [
      makeProvider({ category_classified: "STEM" }),
      makeProvider({ category_classified: "Art" }),
      makeProvider({ category_classified: "Music" }),
      makeProvider({ category_classified: "STEM" }),
      makeProvider({ category_classified: "Art" }),
    ];
    const r = computeMvs(providers, [], defaultAcs);
    expect(r.scores.enrichmentDiversity).toBeCloseTo(12.5, 1);
    expect(r.inputs.enrichmentDiversity.categoryCount).toBe(3);
    expect(r.inputs.enrichmentDiversity.premiumProviderCount).toBe(5);
  });

  it("does not penalize large healthy markets (many providers, ~9 categories)", () => {
    // 20 providers spanning 9 categories → clamp(9, 2, 10) = 9
    // normalize(9, 2, 10) = (7/8)*100 = 87.5
    const cats = ["stem", "art", "music", "coding", "robotics", "dance", "theater", "sports", "chess"];
    const providers = [
      ...cats.map((c) => makeProvider({ category_classified: c })),
      ...Array.from({ length: 11 }, () => makeProvider({ category_classified: "stem" })),
    ];
    const r = computeMvs(providers, [], defaultAcs);
    expect(r.inputs.enrichmentDiversity.categoryCount).toBe(9);
    expect(r.scores.enrichmentDiversity).toBeCloseTo(87.5, 1);
  });

  it("floors at 0 when only 1 category is present (clamped to min=2)", () => {
    const providers = [
      makeProvider({ category_classified: "STEM" }),
      makeProvider({ category_classified: "STEM" }),
    ];
    const r = computeMvs(providers, [], defaultAcs);
    expect(r.inputs.enrichmentDiversity.categoryCount).toBe(1);
    expect(r.scores.enrichmentDiversity).toBe(0);
    // Thin-market flag data available to UI
    expect(r.inputs.enrichmentDiversity.premiumProviderCount).toBe(2);
  });

  it("caps at 100 when category count exceeds max (10)", () => {
    const cats = ["stem", "art", "music", "coding", "robotics", "dance", "theater", "sports", "chess", "cooking", "language", "swim"];
    const providers = cats.map((c) => makeProvider({ category_classified: c }));
    const r = computeMvs(providers, [], defaultAcs);
    expect(r.inputs.enrichmentDiversity.categoryCount).toBe(12);
    expect(r.scores.enrichmentDiversity).toBe(100);
  });

  it("normalizes fuzzy category matching", () => {
    const providers = [
      makeProvider({ category_classified: "Robotics & Engineering" }),
      makeProvider({ category_classified: "Visual Art" }),
    ];
    const r = computeMvs(providers, [], defaultAcs);
    expect(r.inputs.enrichmentDiversity.categoryCount).toBe(2); // robotics, art
  });
});

// ---------------------------------------------------------------------------
// Score 5 — Market Depth
// ---------------------------------------------------------------------------

describe("Score 5: Market Depth", () => {
  it("scores null when no premium providers", () => {
    const r = computeMvs([makeProvider({ tier: "community" })], [], defaultAcs);
    expect(r.scores.marketDepth).toBeNull();
  });

  it("normalizes provider count 4–15 (tightened 2026-07-14)", () => {
    // 10 providers → normalize(10, 4, 15) = (6/11)*100 ≈ 54.545
    const providers = Array.from({ length: 10 }, () => makeProvider());
    const r = computeMvs(providers, [], defaultAcs);
    expect(r.scores.marketDepth).toBeCloseTo(54.55, 1);
    expect(r.inputs.marketDepth.premiumProviderCount).toBe(10);
  });

  it("saturates at 100 by 15 providers (proof-point threshold)", () => {
    const providers = Array.from({ length: 15 }, () => makeProvider());
    const r = computeMvs(providers, [], defaultAcs);
    expect(r.scores.marketDepth).toBe(100);
  });

  it("keeps 100 at 20 providers (past the threshold)", () => {
    const providers = Array.from({ length: 20 }, () => makeProvider());
    const r = computeMvs(providers, [], defaultAcs);
    expect(r.scores.marketDepth).toBe(100);
  });

  it("caps at 0 for count below range", () => {
    const providers = Array.from({ length: 2 }, () => makeProvider());
    const r = computeMvs(providers, [], defaultAcs);
    expect(r.scores.marketDepth).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Score 6 — Market Balance (2026-07-14 rebuild: flag, not score)
// ---------------------------------------------------------------------------

describe("Score 6: Market Balance Index (review flag)", () => {
  it("returns score:null in all cases — MBI no longer contributes points", () => {
    const providers = Array.from({ length: 10 }, () => makeProvider());
    const r = computeMvs(providers, [], defaultAcs);
    expect(r.scores.marketBalance).toBeNull();
  });

  it("emits 'healthy' status for a ratio in the healthy band", () => {
    // 10 premium providers, 10_000 affluent families → ratio = 1000
    // 1000 is between LOW=200 and HIGH=8000 → healthy.
    const providers = Array.from({ length: 10 }, () => makeProvider());
    const r = computeMvs(providers, [], defaultAcs);
    expect(r.inputs.marketBalance.marketBalanceRatio).toBe(1000);
    expect(r.inputs.marketBalance.status).toBe("healthy");
    // Legacy coverageRatio still mirrored for older readers.
    expect(r.inputs.marketBalance.coverageRatio).toBe(1000);
  });

  it("flags 'saturated' when ratio is very low (dense supply)", () => {
    // 200 premium providers, 10_000 affluent families → ratio = 50 → saturated
    const providers = Array.from({ length: 200 }, () => makeProvider());
    const r = computeMvs(providers, [], defaultAcs);
    expect(r.inputs.marketBalance.marketBalanceRatio).toBe(50);
    expect(r.inputs.marketBalance.status).toBe("saturated");
  });

  it("flags 'unproven' when ratio is very high (near-empty market)", () => {
    // 1 premium provider, 10_000 affluent families → ratio = 10_000 → unproven
    const providers = [makeProvider()];
    const r = computeMvs(providers, [], defaultAcs);
    expect(r.inputs.marketBalance.marketBalanceRatio).toBe(10_000);
    expect(r.inputs.marketBalance.status).toBe("unproven");
  });

  it("flags 'unproven' when zero premium providers were found", () => {
    const r = computeMvs([makeProvider({ tier: "budget" })], [], defaultAcs);
    expect(r.inputs.marketBalance.premiumProviderCount).toBe(0);
    expect(r.inputs.marketBalance.status).toBe("unproven");
    expect(r.inputs.marketBalance.marketBalanceRatio).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Composite MVS
// ---------------------------------------------------------------------------

describe("Composite MVS", () => {
  it("is null when any contributing sub-score is null", () => {
    // No premium providers → pricingAcceptance null → MVS null.
    // (Market Absorption was removed from the composite June 24, 2026, so
    // a null MA no longer forces MVS null on its own.)
    const r = computeMvs([makeProvider({ tier: "mid" })], [], defaultAcs, {
      watchlist: defaultWatchlist,
    });
    expect(r.mvs).toBeNull();
  });

  it("weights sum to 1.0 (default)", () => {
    const w = DEFAULT_WEIGHTS;
    const sum =
      w.pricingAcceptance +
      w.marketAbsorption +
      w.scaledOperator +
      w.enrichmentDiversity +
      w.marketDepth +
      w.marketBalance;
    expect(sum).toBeCloseTo(1.0, 3);
  });

  it("excludes Market Absorption from the composite", () => {
    // Composite should equal weighted sum of the 5 remaining pillars only.
    // Build a city where MA is null (no weeks) — composite must still compute.
    const providers = [
      makeProvider({ id: "p-1", price_max: 500, category_classified: "STEM" }),
      makeProvider({ id: "p-2", price_max: 600, category_classified: "Art" }),
      makeProvider({ id: "p-3", price_max: 700, category_classified: "Music" }),
      makeProvider({ id: "p-4", price_max: 550, category_classified: "Coding" }),
      makeProvider({ id: "p-5", price_max: 650, category_classified: "Robotics" }),
    ];
    const r = computeMvs(providers, [], defaultAcs, { watchlist: defaultWatchlist });
    expect(r.scores.marketAbsorption).toBeNull();
    expect(r.mvs).not.toBeNull();
    expect(r.mvs!).toBeGreaterThanOrEqual(0);
    expect(r.mvs!).toBeLessThanOrEqual(100);
  });

  it("computes a full composite with all scores present", () => {
    const pid = "p-full";
    const providers = [
      makeProvider({ id: pid, price_max: 500, category_classified: "STEM" }),
      makeProvider({ id: "p-2", price_max: 550, category_classified: "Art" }),
      makeProvider({ id: "p-3", price_max: 600, category_classified: "Coding" }),
      makeProvider({ id: "p-4", price_max: 650, category_classified: "Music" }),
      makeProvider({ id: "p-5", price_max: 700, category_classified: "Robotics" }),
    ];
    const weeks = [
      makeWeek({ provider_id: pid, status: "sold_out" }),
      makeWeek({ provider_id: "p-2", status: "waitlist" }),
      makeWeek({ provider_id: "p-3", status: "open" }),
      makeWeek({ provider_id: "p-4", status: "open" }),
      makeWeek({ provider_id: "p-5", status: "sold_out" }),
    ];
    const r = computeMvs(providers, weeks, defaultAcs, {
      watchlist: defaultWatchlist,
    });
    expect(r.mvs).not.toBeNull();
    expect(typeof r.mvs).toBe("number");
    expect(r.mvs).toBeGreaterThanOrEqual(0);
    expect(r.mvs).toBeLessThanOrEqual(100);
    expect(r.normalizationVersion).toBe("1.1-mbi-flag");
  });

  it("ignores marketBalance in the composite even if callers pass a weight", () => {
    // MBI's `score` is always null now, so any weight on it is effectively 0.
    const pid = "p-w";
    const providers = [makeProvider({ id: pid })];
    const weeks = [makeWeek({ provider_id: pid, status: "sold_out" })];
    const r = computeMvs(providers, weeks, defaultAcs, {
      weights: {
        pricingAcceptance: 0,
        marketAbsorption: 0,
        scaledOperator: 0,
        enrichmentDiversity: 0,
        marketDepth: 0,
        marketBalance: 1.0,
      },
    });
    // With all real weights at 0, the composite math sums to 0.
    expect(r.mvs).toBe(0);
    expect(r.scores.marketBalance).toBeNull();
  });

  it("caps composite at 0/100 even with extreme inputs", () => {
    const providers = Array.from({ length: 200 }, () =>
      makeProvider({ price_max: 50 }),
    );
    const weeks = providers.flatMap((p) => [
      makeWeek({ provider_id: p.id, status: "open" }),
    ]);
    const r = computeMvs(providers, weeks, defaultAcs);
    expect(r.scores.pricingAcceptance).toBe(0);
    expect(r.scores.marketAbsorption).toBe(0);
    expect(r.scores.marketDepth).toBe(100); // 200 > 15, capped at 100
    expect(r.scores.marketBalance).toBeNull(); // MBI is a flag, not a score
    expect(r.inputs.marketBalance.status).toBe("saturated"); // ratio = 50
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("Edge cases", () => {
  it("handles empty providers array", () => {
    const r = computeMvs([], [], defaultAcs);
    expect(r.mvs).toBeNull();
    expect(r.scores.pricingAcceptance).toBeNull();
    expect(r.scores.marketAbsorption).toBeNull();
  });

  it("handles non-premium weeks gracefully (ignores them)", () => {
    const premium = makeProvider({ id: "prem", tier: "premium" });
    const mid = makeProvider({ id: "mid", tier: "mid" });
    const weeks = [
      makeWeek({ provider_id: "prem", status: "sold_out" }),
      makeWeek({ provider_id: "mid", status: "sold_out" }),
    ];
    const r = computeMvs([premium, mid], weeks, defaultAcs);
    // Only 1 premium week, sold out → selloutRate = 100%
    expect(r.inputs.marketAbsorption.selloutRate).toBeCloseTo(100, 1);
  });

  it("falls back to price_max when price_min is null", () => {
    const providers = [
      makeProvider({ price_max: 500, price_min: null }),
    ];
    const r = computeMvs(providers, [], defaultAcs);
    expect(r.inputs.pricingAcceptance.medianPrice).toBe(500);
  });

  it("prefers price_min over price_max as the weekly proxy", () => {
    const providers = [
      makeProvider({ price_min: 600, price_max: 3000 }),
    ];
    const r = computeMvs(providers, [], defaultAcs);
    expect(r.inputs.pricingAcceptance.medianPrice).toBe(600);
  });

  it("does not double-count the same operator name", () => {
    // Two providers matching "Galileo" — should count as 1 distinct operator
    const providers = [
      makeProvider({ name: "Galileo Austin" }),
      makeProvider({ name: "Galileo Round Rock" }),
    ];
    const r = computeMvs(providers, [], defaultAcs, { watchlist: defaultWatchlist });
    expect(r.inputs.scaledOperator.operatorValidation).toBe(1);
  });
});
