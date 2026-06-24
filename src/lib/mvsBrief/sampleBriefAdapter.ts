// Phase 6 polish — adapt the static demo data (Market Validation sample path)
// into the same MvsBriefArgs shape the live PDF generator already accepts, so
// Brett can export the branded brief for sample-data rows too.
//
// Where the demo has rich detail (San Antonio = anchor), we surface it. Where
// it doesn't (other shortlist rows), pillar scores + composite still render
// and the roster/appendix degrade gracefully to "no data".

import {
  DEFAULT_WEIGHTS,
  MVS_NORMALIZATION_VERSION,
  type MvsAcsInput,
  type MvsProviderInput,
  type MvsResult,
  type MvsScoreInputs,
  type MvsWeekInput,
  type MvsWeekStatus,
} from "@/lib/mvs/computeMvs";
import {
  sanAntonioMarketValidationDemo,
  type ShortlistRow,
  type MarketValidationDemo,
} from "@/data/phase2DemoData";
import type { MvsBriefArgs } from "@/lib/mvsBrief/MvsBriefDocument";

const EMPTY_INPUTS: MvsScoreInputs = {
  pricingAcceptance: { medianPrice: null, p75Price: null, pctAtLeast500: null },
  marketAbsorption: {
    selloutRate: null,
    timeToSellout: null,
    yoyVelocity: null,
    year2Signal: true,
  },
  scaledOperator: { operatorValidation: null, directCompetitorLoad: null, children5to12: null },
  enrichmentDiversity: {
    categoryCount: null,
    diversityRatio: null,
    premiumProviderCount: null,
  },
  marketDepth: { premiumProviderCount: null },
  marketBalance: {
    coverageRatio: null,
    affluentDualIncomeFamilyCount: null,
    premiumProviderCount: null,
  },
};

function buildResultFromRow(row: ShortlistRow): MvsResult {
  return {
    mvs: row.composite,
    scores: {
      pricingAcceptance: row.pricing,
      // Market Absorption removed in v1.1 — pillar no longer in composite.
      marketAbsorption: null,
      scaledOperator: row.scaledOperator,
      enrichmentDiversity: row.diversity,
      marketDepth: row.depth,
      // ShortlistRow has no explicit balance score — back-solve from composite
      // so the five weighted pillars sum to the displayed MVS.
      marketBalance: deriveBalance(row),
    },
    inputs: EMPTY_INPUTS,
    normalizationVersion: MVS_NORMALIZATION_VERSION,
  };
}

function deriveBalance(row: ShortlistRow): number {
  // Market Absorption removed from composite in v1.1 (weight 0).
  const w = DEFAULT_WEIGHTS;
  const known =
    w.pricingAcceptance * row.pricing +
    w.scaledOperator * row.scaledOperator +
    w.enrichmentDiversity * row.diversity +
    w.marketDepth * row.depth;
  const remainder = row.composite - known;
  const balance = remainder / w.marketBalance;
  return Math.max(0, Math.min(100, Number(balance.toFixed(1))));
}

function providersAndWeeksFromDemo(
  demo: MarketValidationDemo,
): { providers: MvsProviderInput[]; weeks: MvsWeekInput[] } {
  // Week-by-week `sampleWeeks` data was removed in v1.1 along with Market
  // Absorption — providers still surface for roster, weeks degrade to empty.
  const providers: MvsProviderInput[] = demo.premiumProviders.map((p, i) => ({
    id: `sample-${i}`,
    name: p.name,
    tier: "premium",
    price_min: p.weeklyPrice,
    price_max: p.weeklyPrice,
    category_classified: null,
    site_count: p.siteCount,
  }));
  return { providers, weeks: [] };
}

const SAMPLE_ACS: MvsAcsInput = {
  // San Antonio demo values — only rendered when the active row is the anchor.
  affluent_dual_income_family_count: 6420,
  children_5_12_count: 168000,
};

/**
 * Build a `MvsBriefArgs` payload from the static Market Validation demo so the
 * same branded PDF generator works for sample-data rows. Use the active
 * shortlist row's pillar scores + composite for the cover/exec; surface the
 * San Antonio premium roster and ACS only when the active row IS the anchor
 * (other rows have no provider sample in demo data).
 */
export function buildSampleBriefArgs(row: ShortlistRow): MvsBriefArgs {
  const isAnchor = row.id === "san-antonio-tx";
  const { providers, weeks } = isAnchor
    ? providersAndWeeksFromDemo(sanAntonioMarketValidationDemo)
    : { providers: [], weeks: [] };
  return {
    cityKey: `${row.city}, ${row.state}`,
    cityDisplay: row.city,
    stateDisplay: row.state,
    result: buildResultFromRow(row),
    providers,
    weeks,
    weeksDetailed: [],
    acs: isAnchor ? SAMPLE_ACS : null,
    weights: { ...DEFAULT_WEIGHTS },
    lowConfidence: false,
    latestRun: null,
    generatedAt: new Date(),
  };
}
