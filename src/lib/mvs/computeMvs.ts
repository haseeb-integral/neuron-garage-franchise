// Pure helper: computes MVS + 6 sub-scores from live pipeline data.
// Brett's rule — "one calibrated number everywhere". No DB writes.

// Enrichment Diversity clamp bounds — see score4EnrichmentDiversity.
export const MVS_ENRICHMENT_MIN_CATEGORIES = 2;
export const MVS_ENRICHMENT_MAX_CATEGORIES = 10;
// Below this premium-provider count, UI should show a "Thin market — low
// confidence" pill next to the Enrichment Diversity score. Display-only;
// the math does not change.
export const MVS_ENRICHMENT_THIN_MARKET_THRESHOLD = 4;

export const MVS_NORMALIZATION_VERSION = "1.0-fixed";

// Market Absorption (formerly 0.25) was removed June 24, 2026. Remaining
// weights re-normalized proportionally so the 5 cards still sum to 1.0:
//   PA  0.20 / 0.75 = 0.2667
//   SO  0.20 / 0.75 = 0.2667
//   ED  0.10 / 0.75 = 0.1333
//   MD  0.10 / 0.75 = 0.1333
//   MB  0.15 / 0.75 = 0.2000
// `marketAbsorption: 0` is kept as a legacy key so callers that still pass it
// in `options.weights` don't crash; it is ignored in the composite below.
export const DEFAULT_WEIGHTS: Record<string, number> = {
  pricingAcceptance: 0.2667,
  marketAbsorption: 0,
  scaledOperator: 0.2667,
  enrichmentDiversity: 0.1333,
  marketDepth: 0.1333,
  marketBalance: 0.2000,
};

export const ELIGIBLE_CATEGORIES = new Set([
  "stem",
  "robotics",
  "coding",
  "science",
  "maker",
  "art",
  "theater",
  "music",
  "dance",
  "language",
  "sports",
  "swim",
  "gymnastics",
  "cooking",
  "outdoor",
  "academic enrichment",
  "debate",
  "chess",
  "entrepreneurship",
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MvsTier = "premium" | "mid" | "budget" | "community";

export type MvsWeekStatus =
  | "sold_out"
  | "waitlist"
  | "low_availability"
  | "limited"
  | "open"
  | "unknown";

export type MvsOverlap = "direct" | "adjacent" | "distant";

export type MvsProviderInput = {
  id: string;
  name: string;
  tier: MvsTier | null;
  price_min?: number | null;
  price_max?: number | null;
  category_classified?: string | null;
  site_count?: number | null;
  url?: string | null;
  website_url?: string | null;
  source_listing_url?: string | null;
  sources?: string[] | null;
};

export type MvsWeekInput = {
  provider_id: string;
  status: MvsWeekStatus;
  confidence?: number | null;
  source_url?: string | null;
};

export type MvsAcsInput = {
  affluent_dual_income_family_count: number;
  children_5_12_count: number;
};

export type MvsOperatorWatchlistEntry = {
  name: string;
  default_overlap: MvsOverlap;
};

export type MvsCityOverlapOverride = {
  operator_name: string;
  overlap: MvsOverlap;
};

export type MvsScoreInputs = {
  pricingAcceptance: {
    medianPrice: number | null;
    p75Price: number | null;
    pctAtLeast500: number | null;
  };
  marketAbsorption: {
    selloutRate: number | null;
    timeToSellout: null;
    yoyVelocity: null;
    year2Signal: true;
  };
  scaledOperator: {
    operatorValidation: number | null;
    directCompetitorLoad: number | null;
    children5to12: number | null;
  };
  enrichmentDiversity: {
    categoryCount: number | null;
    diversityRatio: number | null;
    premiumProviderCount: number | null;
  };
  marketDepth: {
    premiumProviderCount: number | null;
  };
  marketBalance: {
    coverageRatio: number | null;
    affluentDualIncomeFamilyCount: number | null;
    premiumProviderCount: number | null;
  };
};

export type MvsSubScores = {
  pricingAcceptance: number | null;
  marketAbsorption: number | null;
  scaledOperator: number | null;
  enrichmentDiversity: number | null;
  marketDepth: number | null;
  marketBalance: number | null;
};

export type MvsResult = {
  mvs: number | null;
  scores: MvsSubScores;
  inputs: MvsScoreInputs;
  normalizationVersion: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalize(v: number | null | undefined, lo: number, hi: number): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  if (hi === lo) return 50;
  const t = ((v - lo) / (hi - lo)) * 100;
  return Math.max(0, Math.min(100, t));
}

function percentile(sortedAsc: number[], p: number): number | null {
  if (sortedAsc.length === 0) return null;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const idx = (sortedAsc.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  const w = idx - lo;
  return sortedAsc[lo] * (1 - w) + sortedAsc[hi] * w;
}

function pctAtLeast(values: number[], threshold: number): number | null {
  if (values.length === 0) return null;
  const count = values.filter((v) => v >= threshold).length;
  return (count / values.length) * 100;
}

function resolveOverlap(
  providerName: string,
  watchlist: MvsOperatorWatchlistEntry[],
  overrides: MvsCityOverlapOverride[],
): MvsOverlap | null {
  const lowerName = providerName.toLowerCase();
  const match = watchlist.find((w) => lowerName.includes(w.name.toLowerCase()));
  if (!match) return null;
  const override = overrides.find(
    (o) => o.operator_name.toLowerCase() === match.name.toLowerCase(),
  );
  return override ? override.overlap : match.default_overlap;
}

function cleanCategory(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const c = raw.trim().toLowerCase();
  if (ELIGIBLE_CATEGORIES.has(c)) return c;
  // Fuzzy: if the raw contains an eligible word, accept it
  for (const ec of ELIGIBLE_CATEGORIES) {
    if (c.includes(ec)) return ec;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Score calculators
// ---------------------------------------------------------------------------

function score1PricingAcceptance(
  providers: MvsProviderInput[],
): { score: number | null; inputs: MvsScoreInputs["pricingAcceptance"] } {
  const premium = providers.filter((p) => p.tier === "premium");
  // Use price_min as the per-week proxy. Sawyer/Google list price_max as the
  // top of the provider's price range — that's almost always a multi-week or
  // full-season bundle (e.g. $13,595 for a country day camp full summer),
  // which would blow past the $300–$700 weekly normalization band and
  // produce a meaningless median. price_min reliably tracks single-week /
  // single-session pricing; we fall back to price_max only when min is null.
  const prices = premium
    .map((p) => (p.price_min != null ? p.price_min : p.price_max))
    .filter((v): v is number => v != null && Number.isFinite(v));

  if (prices.length === 0) {
    return {
      score: null,
      inputs: { medianPrice: null, p75Price: null, pctAtLeast500: null },
    };
  }

  const sorted = [...prices].sort((a, b) => a - b);
  const median = percentile(sorted, 0.5);
  const p75 = percentile(sorted, 0.75);
  const pct500 = pctAtLeast(prices, 500);

  const nMedian = normalize(median, 300, 700);
  const nP75 = normalize(p75, 400, 800);
  const nPct = normalize(pct500, 0, 100);

  if (nMedian == null || nP75 == null || nPct == null) {
    return {
      score: null,
      inputs: { medianPrice: median, p75Price: p75, pctAtLeast500: pct500 },
    };
  }

  const score = 0.40 * nMedian + 0.40 * nP75 + 0.20 * nPct;
  return {
    score: Math.max(0, Math.min(100, score)),
    inputs: { medianPrice: median, p75Price: p75, pctAtLeast500: pct500 },
  };
}

function score2MarketAbsorption(
  providers: MvsProviderInput[],
  weeks: MvsWeekInput[],
): { score: number | null; inputs: MvsScoreInputs["marketAbsorption"] } {
  const premiumIds = new Set(providers.filter((p) => p.tier === "premium").map((p) => p.id));
  const premiumWeeks = weeks.filter((w) => premiumIds.has(w.provider_id));

  if (premiumWeeks.length === 0) {
    return {
      score: null,
      inputs: { selloutRate: null, timeToSellout: null, yoyVelocity: null, year2Signal: true },
    };
  }

  const soldOutOrWaitlist = premiumWeeks.filter(
    (w) => w.status === "sold_out" || w.status === "waitlist",
  ).length;

  const selloutRate = (soldOutOrWaitlist / premiumWeeks.length) * 100;
  const nSellout = normalize(selloutRate, 0, 80);

  if (nSellout == null) {
    return {
      score: null,
      inputs: { selloutRate, timeToSellout: null, yoyVelocity: null, year2Signal: true },
    };
  }

  // v1.0: Sellout Rate carries full weight (25% of composite)
  return {
    score: Math.max(0, Math.min(100, nSellout)),
    inputs: { selloutRate, timeToSellout: null, yoyVelocity: null, year2Signal: true },
  };
}

function score3ScaledOperator(
  providers: MvsProviderInput[],
  watchlist: MvsOperatorWatchlistEntry[],
  overrides: MvsCityOverlapOverride[],
  children5to12: number,
): { score: number | null; inputs: MvsScoreInputs["scaledOperator"] } {
  const premium = providers.filter((p) => p.tier === "premium");
  if (premium.length === 0 || !Number.isFinite(children5to12) || children5to12 <= 0) {
    return {
      score: null,
      inputs: { operatorValidation: null, directCompetitorLoad: null, children5to12 },
    };
  }

  const seenOperators = new Set<string>();
  let operatorValidation = 0;
  let directSiteCount = 0;

  for (const p of premium) {
    const overlap = resolveOverlap(p.name, watchlist, overrides);
    if (overlap) {
      const match = watchlist.find((w) =>
        p.name.toLowerCase().includes(w.name.toLowerCase()),
      );
      if (match) {
        if (!seenOperators.has(match.name.toLowerCase())) {
          seenOperators.add(match.name.toLowerCase());
          operatorValidation = Math.min(8, operatorValidation + 1);
        }
        if (overlap === "direct") {
          directSiteCount += p.site_count ?? 1;
        }
      }
    }
  }

  const per10k = children5to12 / 10000;
  const directCompetitorLoad = per10k > 0 ? directSiteCount / per10k : 0;

  const nValidation = normalize(operatorValidation, 0, 8);
  const nLoad = normalize(directCompetitorLoad, 0, 5);

  if (nValidation == null || nLoad == null) {
    return {
      score: null,
      inputs: { operatorValidation, directCompetitorLoad, children5to12 },
    };
  }

  const score = 0.65 * nValidation + 0.35 * (100 - nLoad);
  return {
    score: Math.max(0, Math.min(100, score)),
    inputs: { operatorValidation, directCompetitorLoad, children5to12 },
  };
}

function score4EnrichmentDiversity(
  providers: MvsProviderInput[],
): { score: number | null; inputs: MvsScoreInputs["enrichmentDiversity"] } {
  const premium = providers.filter((p) => p.tier === "premium");
  if (premium.length === 0) {
    return {
      score: null,
      inputs: { categoryCount: null, diversityRatio: null, premiumProviderCount: null },
    };
  }

  const categories = new Set<string>();
  for (const p of premium) {
    const cat = cleanCategory(p.category_classified);
    if (cat) categories.add(cat);
  }

  const categoryCount = categories.size;
  const diversityRatio = categoryCount / premium.length;

  const nCount = normalize(categoryCount, 2, 10);
  const nRatio = normalize(diversityRatio, 0.1, 0.6);

  if (nCount == null || nRatio == null) {
    return {
      score: null,
      inputs: { categoryCount, diversityRatio, premiumProviderCount: premium.length },
    };
  }

  const score = 0.70 * nCount + 0.30 * nRatio;
  return {
    score: Math.max(0, Math.min(100, score)),
    inputs: { categoryCount, diversityRatio, premiumProviderCount: premium.length },
  };
}

function score5MarketDepth(
  providers: MvsProviderInput[],
): { score: number | null; inputs: MvsScoreInputs["marketDepth"] } {
  const premiumCount = providers.filter((p) => p.tier === "premium").length;
  if (premiumCount === 0) {
    return {
      score: null,
      inputs: { premiumProviderCount: null },
    };
  }

  const n = normalize(premiumCount, 4, 40);
  return {
    score: n != null ? Math.max(0, Math.min(100, n)) : null,
    inputs: { premiumProviderCount: premiumCount },
  };
}

function score6MarketBalance(
  providers: MvsProviderInput[],
  acs: MvsAcsInput,
): { score: number | null; inputs: MvsScoreInputs["marketBalance"] } {
  const premiumCount = providers.filter((p) => p.tier === "premium").length;
  if (premiumCount === 0) {
    return {
      score: null,
      inputs: {
        coverageRatio: null,
        affluentDualIncomeFamilyCount: null,
        premiumProviderCount: null,
      },
    };
  }

  const affluentCount = acs.affluent_dual_income_family_count;
  if (!Number.isFinite(affluentCount) || affluentCount <= 0) {
    return {
      score: null,
      inputs: {
        coverageRatio: null,
        affluentDualIncomeFamilyCount: affluentCount,
        premiumProviderCount: premiumCount,
      },
    };
  }

  const coverageRatio = affluentCount / premiumCount;
  const n = normalize(coverageRatio, 50, 500);

  return {
    score: n != null ? Math.max(0, Math.min(100, n)) : null,
    inputs: {
      coverageRatio,
      affluentDualIncomeFamilyCount: affluentCount,
      premiumProviderCount: premiumCount,
    },
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function computeMvs(
  providers: MvsProviderInput[],
  weeks: MvsWeekInput[],
  acs: MvsAcsInput,
  options?: {
    weights?: Partial<typeof DEFAULT_WEIGHTS>;
    watchlist?: MvsOperatorWatchlistEntry[];
    overlapOverrides?: MvsCityOverlapOverride[];
  },
): MvsResult {
  const weights = { ...DEFAULT_WEIGHTS, ...options?.weights };
  const watchlist = options?.watchlist ?? [];
  const overrides = options?.overlapOverrides ?? [];

  const s1 = score1PricingAcceptance(providers);
  const s2 = score2MarketAbsorption(providers, weeks);
  const s3 = score3ScaledOperator(providers, watchlist, overrides, acs.children_5_12_count);
  const s4 = score4EnrichmentDiversity(providers);
  const s5 = score5MarketDepth(providers);
  const s6 = score6MarketBalance(providers, acs);

  const scores: MvsSubScores = {
    pricingAcceptance: s1.score,
    marketAbsorption: s2.score,
    scaledOperator: s3.score,
    enrichmentDiversity: s4.score,
    marketDepth: s5.score,
    marketBalance: s6.score,
  };

  const inputs: MvsScoreInputs = {
    pricingAcceptance: s1.inputs,
    marketAbsorption: s2.inputs,
    scaledOperator: s3.inputs,
    enrichmentDiversity: s4.inputs,
    marketDepth: s5.inputs,
    marketBalance: s6.inputs,
  };

  // Market Absorption (allScores index 1) is intentionally excluded from the
  // composite as of June 24, 2026 — the card was removed and its 25% weight
  // was proportionally redistributed across the 5 remaining pillars.
  const compositeScores = [
    scores.pricingAcceptance,
    scores.scaledOperator,
    scores.enrichmentDiversity,
    scores.marketDepth,
    scores.marketBalance,
  ];

  // If any contributing score is null, the composite is null (incomplete data)
  if (compositeScores.some((s) => s == null)) {
    return { mvs: null, scores, inputs, normalizationVersion: MVS_NORMALIZATION_VERSION };
  }

  const mvs =
    weights.pricingAcceptance * compositeScores[0]! +
    weights.scaledOperator * compositeScores[1]! +
    weights.enrichmentDiversity * compositeScores[2]! +
    weights.marketDepth * compositeScores[3]! +
    weights.marketBalance * compositeScores[4]!;

  return {
    mvs: Math.max(0, Math.min(100, Number(mvs.toFixed(1)))),
    scores,
    inputs,
    normalizationVersion: MVS_NORMALIZATION_VERSION,
  };
}
