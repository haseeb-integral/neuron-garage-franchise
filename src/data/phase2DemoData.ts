/**
 * Phase 2 — Week 2 demo data. Static, hardcoded sample values used by the
 * Market Validation and Site Analysis mockup pages so Brett and Sam can sign
 * off on layout and UX before any backend wiring.
 *
 * DO NOT wire these to Supabase. Week 3 swaps consumers to real hooks.
 *
 * Numeric values are illustrative only. Composite + sub-score formulas come
 * verbatim from `.lovable/phase-2/phase-2-sow.md` Items 1 and 2.
 */

// ---------------------------------------------------------------------------
// Item 1 — Market Validation Engine (Feature 1A)
// Shortlist = Feature 1 (City Search) Balanced top 8 (Tier A/B).
// Deep-dive anchor = San Antonio, TX (client has an Austin franchise and is
// most familiar with the SA market; Frisco was swapped out 2026-06-15).
// ---------------------------------------------------------------------------

export type AbsorptionStatus = "sold_out" | "waitlist" | "low_availability" | "open" | "unknown";
export type ConfidenceLevel = "high" | "medium" | "low";

export interface ShortlistCity {
  city: string;
  state: string;
  composite: number;
  active: boolean;
}

/**
 * Row format consumed by the v1.1 decision-capture shortlist table.
 * Sub-score values are demo numbers only — every city other than the
 * anchor (San Antonio) has placeholder MVS / sub-scores until Week 3
 * wires Manus output.
 */
export interface ShortlistRow {
  id: string;
  city: string;
  state: string;
  composite: number;
  tier: string;          // demo label; final band vocabulary is an Open Decision for Brett
  pricing: number;
  absorption: number;
  scaledOperator: number;
  diversity: number;
  depth: number;
  balanceBand: "Underserved" | "Balanced" | "Competitive" | "Saturated";
}

// Order mirrors Feature 1 Balanced ranking (top 8). MVS composites are demo
// numbers in the 65–82 range; anchor (San Antonio) = 78.
export const SHORTLIST_DEMO: ShortlistRow[] = [
  { id: "new-york-ny",    city: "New York",     state: "NY", composite: 82, tier: "Top Tier",pricing: 88, absorption: 80, scaledOperator: 78, diversity: 84, depth: 79, balanceBand: "Saturated" },
  { id: "houston-tx",     city: "Houston",      state: "TX", composite: 76, tier: "Strong",  pricing: 74, absorption: 72, scaledOperator: 80, diversity: 75, depth: 74, balanceBand: "Competitive" },
  { id: "chicago-il",     city: "Chicago",      state: "IL", composite: 74, tier: "Strong",  pricing: 80, absorption: 68, scaledOperator: 76, diversity: 78, depth: 70, balanceBand: "Competitive" },
  { id: "boston-ma",      city: "Boston",       state: "MA", composite: 72, tier: "Strong",  pricing: 84, absorption: 66, scaledOperator: 72, diversity: 70, depth: 68, balanceBand: "Competitive" },
  { id: "san-antonio-tx", city: "San Antonio",  state: "TX", composite: 78, tier: "Strong",  pricing: 82, absorption: 74, scaledOperator: 71, diversity: 76, depth: 68, balanceBand: "Underserved" },
  { id: "philadelphia-pa",city: "Philadelphia", state: "PA", composite: 69, tier: "Mixed",   pricing: 72, absorption: 64, scaledOperator: 70, diversity: 68, depth: 66, balanceBand: "Balanced" },
  { id: "los-angeles-ca", city: "Los Angeles",  state: "CA", composite: 67, tier: "Mixed",   pricing: 86, absorption: 58, scaledOperator: 74, diversity: 72, depth: 60, balanceBand: "Saturated" },
  { id: "indianapolis-in",city: "Indianapolis", state: "IN", composite: 71, tier: "Strong",  pricing: 68, absorption: 70, scaledOperator: 66, diversity: 70, depth: 72, balanceBand: "Underserved" },
];

export interface SubScore {
  value: number;
  weight: number;
  signals: { label: string; value: string }[];
  formula: string;
  confidence: { level: ConfidenceLevel; note: string };
}

export interface MarketValidationDemo {
  city: string;
  state: string;
  scrapeDate: string;
  composite: number;
  tier: "Top Tier" | "Strong" | "Mixed" | "Weak";
  verdict: string;
  shortlist: ShortlistCity[];
  subScores: {
    pricingAcceptance: SubScore;
    marketAbsorption: SubScore;
    scaledOperator: SubScore;
    enrichmentDiversity: SubScore;
    marketDepth: SubScore;
    marketBalance: SubScore;
  };
  premiumProviders: {
    name: string;
    weeklyPrice: number;
    siteCount: number;
    overlap: "direct" | "adjacent" | "distant";
    sampleWeeks: { label: string; status: AbsorptionStatus }[];
  }[];
}

export const sanAntonioMarketValidationDemo: MarketValidationDemo = {
  city: "San Antonio",
  state: "TX",
  scrapeDate: "2026-03-15",
  composite: 78,
  tier: "Strong",
  verdict:
    "Validated premium enrichment market with strong absorption signals. Direct competitor load is moderate; room for one well-sited operator in north-side Bexar County.",
  shortlist: [
    { city: "San Antonio", state: "TX", composite: 78, active: true },
    { city: "Houston", state: "TX", composite: 76, active: false },
    { city: "Chicago", state: "IL", composite: 74, active: false },
    { city: "New York", state: "NY", composite: 82, active: false },
    { city: "Boston", state: "MA", composite: 72, active: false },
  ],

  subScores: {
    pricingAcceptance: {
      value: 82,
      weight: 0.2,
      signals: [
        { label: "Median premium price / week", value: "$549" },
        { label: "75th-percentile price / week", value: "$649" },
        { label: "% premium providers at $500+ / week", value: "64%" },
      ],
      formula:
        "0.40 × normalize(median, $300–$700) + 0.40 × normalize(75th pct, $400–$800) + 0.20 × (% at $500+)",
      confidence: { level: "high", note: "All 18 providers had explicit weekly pricing scraped from operator sites." },
    },
    marketAbsorption: {
      value: 74,
      weight: 0.25,
      signals: [
        { label: "Sellout rate (sold_out + waitlist ÷ total weeks)", value: "58%" },
        { label: "Avg time-to-sellout", value: "Year 2 signal" },
        { label: "YoY velocity", value: "Year 2 signal" },
      ],
      formula:
        "0.60 × normalize(Sellout Rate, 0–80%) + 0.25 × normalize(Time-to-Sellout, inverse) + 0.15 × normalize(YoY Velocity, -20% to +30%)",
      confidence: { level: "medium", note: "4 of 18 providers parsed below 0.7 confidence — routed to human QA queue per SOW Item 1." },
    },
    scaledOperator: {
      value: 71,
      weight: 0.2,
      signals: [
        { label: "Distinct national operators present", value: "5 of 8 cap" },
        { label: "Direct competitor load / 10k kids 5–12", value: "2.1" },
        { label: "Watchlist matches", value: "Galileo, Code Ninjas, Snapology, iD Tech, Mathnasium" },
      ],
      formula:
        "0.65 × normalize(Operator Validation, 0–8) + 0.35 × (100 − normalize(Direct Competitor Load, 0–5 per 10k))",
      confidence: { level: "high", note: "Operator matches from Apify Maps + manual watchlist." },
    },
    enrichmentDiversity: {
      value: 76,
      weight: 0.1,
      signals: [
        { label: "Distinct categories with ≥1 premium provider", value: "7 of 12" },
        { label: "Diversity ratio (categories ÷ provider count)", value: "0.39" },
      ],
      formula:
        "0.70 × normalize(Category Count, 2–10) + 0.30 × normalize(Diversity Ratio, 0.1–0.6)",
      confidence: { level: "high", note: "Category tags from Gemini Flash classification." },
    },
    marketDepth: {
      value: 68,
      weight: 0.1,
      signals: [
        { label: "Premium provider count", value: "18" },
        { label: "Peer median (DFW suburbs)", value: "14" },
      ],
      formula: "normalize(Premium Provider Count, 4–40)",
      confidence: { level: "high", note: "Provider count from full universe scrape." },
    },
    marketBalance: {
      value: 88,
      weight: 0.15,
      signals: [
        { label: "Affluent dual-income families (5–12)", value: "6,420" },
        { label: "Coverage ratio", value: "357" },
        { label: "Classification", value: "Underserved (≥350)" },
      ],
      formula: "normalize(Coverage Ratio, 50–500); ≥350 Underserved · 200–349 Balanced · 100–199 Competitive · <100 Saturated",
      confidence: { level: "low", note: "ACS dual-income breakdown imputed at tract level — flagged for review." },
    },
  },
  premiumProviders: [
    {
      name: "Galileo San Antonio",
      weeklyPrice: 549,
      siteCount: 2,
      overlap: "direct",
      sampleWeeks: [
        { label: "Wk 1: Jun 9–13", status: "sold_out" },
        { label: "Wk 2: Jun 16–20", status: "sold_out" },
        { label: "Wk 3: Jun 23–27", status: "waitlist" },
        { label: "Wk 4: Jul 7–11", status: "low_availability" },
        { label: "Wk 5: Jul 14–18", status: "open" },
      ],
    },
    {
      name: "Snapology of San Antonio",
      weeklyPrice: 475,
      siteCount: 1,
      overlap: "direct",
      sampleWeeks: [
        { label: "Wk 1", status: "sold_out" },
        { label: "Wk 2", status: "waitlist" },
        { label: "Wk 3", status: "open" },
        { label: "Wk 4", status: "open" },
        { label: "Wk 5", status: "open" },
      ],
    },
    {
      name: "Code Ninjas Stone Oak",
      weeklyPrice: 425,
      siteCount: 3,
      overlap: "adjacent",
      sampleWeeks: [
        { label: "Wk 1", status: "low_availability" },
        { label: "Wk 2", status: "open" },
        { label: "Wk 3", status: "open" },
        { label: "Wk 4", status: "open" },
        { label: "Wk 5", status: "open" },
      ],
    },
    {
      name: "iD Tech @ UT Dallas",
      weeklyPrice: 899,
      siteCount: 1,
      overlap: "direct",
      sampleWeeks: [
        { label: "Wk 1", status: "sold_out" },
        { label: "Wk 2", status: "sold_out" },
        { label: "Wk 3", status: "waitlist" },
        { label: "Wk 4", status: "open" },
        { label: "Wk 5", status: "open" },
      ],
    },
    {
      name: "Mad Science of DFW",
      weeklyPrice: 385,
      siteCount: 4,
      overlap: "distant",
      sampleWeeks: [
        { label: "Wk 1", status: "open" },
        { label: "Wk 2", status: "open" },
        { label: "Wk 3", status: "open" },
        { label: "Wk 4", status: "open" },
        { label: "Wk 5", status: "open" },
      ],
    },
    {
      name: "Maker Kids Alamo Heights",
      weeklyPrice: 510,
      siteCount: 1,
      overlap: "direct",
      sampleWeeks: [
        { label: "Wk 1", status: "sold_out" },
        { label: "Wk 2", status: "waitlist" },
        { label: "Wk 3", status: "low_availability" },
        { label: "Wk 4", status: "open" },
        { label: "Wk 5", status: "unknown" },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Item 2 — Site Analysis Engine (Feature 1B)
// Demo sites = Trinity (Westlake), Austin vs LeafSpring, Austin (positive vs
// negative anchor per SOW). 4-slot compare strip with two empty slots.
// ---------------------------------------------------------------------------

export interface SiteAnalysisDemoSite {
  id: string;
  schoolName: string;
  address: string;
  schoolType: "Private elementary" | "Public elementary" | "Charter elementary" | "Montessori" | "Other K-8" | "Other";
  enrollment: number;
  gradeAlignment: string;
  composite: number;
  verdict: string;
  subScores: {
    schoolProfile: { value: number; weight: number; formula: string };
    neighborhoodAffluence: { value: number; weight: number; formula: string };
    familyDensity: { value: number; weight: number; formula: string };
    schoolEcosystem: { value: number; weight: number; formula: string };
    accessibility: { value: number; weight: number; formula: string };
  };
  isochroneCallouts: {
    medianHHI10min: string;
    pctOver150k10min: string;
    pctDualIncome10min: string;
    children5to12Within10min: string;
    children5to12Within15min: string;
    familiesWithKids5to12Within10min: string;
  };
}

export const SITE_RECOMMEND_THRESHOLDS = {
  recommend: 75,
  worthALook: 60,
} as const;

// 1A demo helpers — non-functional UI affordances added per SOW LOV items.
export const QA_QUEUE_FLAGGED_COUNT = 4;

export const SCRAPE_CADENCE: { label: string; month: string; current?: boolean }[] = [
  { label: "Jan", month: "2026-01" },
  { label: "Mar", month: "2026-03", current: true },
  { label: "Jun", month: "2026-06" },
  { label: "Sep", month: "2026-09" },
  { label: "Nov", month: "2026-11" },
];

export const MARKET_BALANCE_BANDS = [
  { key: "underserved", label: "Underserved", range: "≥350", bg: "#e3f3e7", fg: "#1d6b32" },
  { key: "balanced", label: "Balanced", range: "200–349", bg: "#e0ecff", fg: "#1542a3" },
  { key: "competitive", label: "Competitive", range: "100–199", bg: "#fff1d6", fg: "#925100" },
  { key: "saturated", label: "Saturated", range: "<100", bg: "#fce7ec", fg: "#a3142b" },
] as const;
export const MARKET_BALANCE_ACTIVE_BAND = "underserved";

// 1B demo helpers — exact values from Sam v2 PDF, Score 1 School Profile.
// All factors are on a 0–100 scale so 0.50·type + 0.25·norm(enrollment) +
// 0.25·alignment lands 0–100 directly. "Other" (incl. daycare) = 30 is the
// calibration anchor that drags LeafSpring's School Profile below threshold.
export const SCHOOL_PROFILE_FACTORS = {
  schoolType: [
    { type: "Private elementary", factor: 100 },
    { type: "Montessori", factor: 85 },
    { type: "Charter elementary", factor: 75 },
    { type: "Public elementary", factor: 70 },
    { type: "Other K-8", factor: 50 },
    { type: "Other (incl. daycare)", factor: 30 },
  ],
  enrollmentRange: "150–800",
  gradeAlignment: [
    { label: "K-5 or K-6", factor: 100 },
    { label: "Pre-K through 5", factor: 95 },
    { label: "K-8", factor: 80 },
    { label: "Other", factor: 50 },
  ],
} as const;

export const SITE_ACCESSIBILITY_CALLOUTS: Record<string, {
  driveToHighway: string;
  parkingSpaces: string;
  popReachable15min: string;
}> = {
  "trinity-westlake": {
    driveToHighway: "3 min · Loop 360",
    parkingSpaces: "~85 (lot)",
    popReachable15min: "412k",
  },
  "leafspring-austin": {
    driveToHighway: "11 min · I-35",
    parkingSpaces: "~24 (street)",
    popReachable15min: "168k",
  },
};


export const austinSiteAnalysisDemo: {
  filled: SiteAnalysisDemoSite[];
  emptySlots: number;
} = {
  filled: [
    {
      id: "trinity-westlake",
      schoolName: "Trinity Episcopal School (Westlake)",
      address: "3901 Bee Caves Rd, Austin, TX 78746",
      schoolType: "Private elementary",
      enrollment: 540,
      gradeAlignment: "K–8 · grade_alignment_factor = 80",
      composite: 86,
      verdict: "Strong site. Affluent, dense, accessible. Matches profile of current high-performing NG locations.",
      subScores: {
        schoolProfile: {
          // 0.50·100 (Private elem) + 0.25·norm(540,150–800)=60 + 0.25·80 (K-8) = 85
          value: 85,
          weight: 0.25,
          formula:
            "0.50 × school_type_factor + 0.25 × normalize(Enrollment, 150–800) + 0.25 × grade_alignment_factor",
        },
        neighborhoodAffluence: {
          value: 92,
          weight: 0.25,
          formula:
            "0.40 × norm(Median HHI 10min, $80k–$200k) + 0.35 × norm(% HH >$150k, 10–50%) + 0.25 × norm(% Dual-Income, 40–80%)",
        },
        familyDensity: {
          value: 78,
          weight: 0.2,
          formula:
            "0.50 × norm(Children 5–12 / 10min, 1k–15k) + 0.30 × norm(Children 5–12 / 15min, 3k–40k) + 0.20 × norm(Families w/ kids / 10min, 500–8k)",
        },
        schoolEcosystem: {
          value: 84,
          weight: 0.15,
          formula:
            "0.40 × norm(Elementary count 15min, 3–25) + 0.30 × norm(Private school count 15min, 1–10) + 0.30 × norm(Nearby student pop 15min, 2k–25k)",
        },
        accessibility: {
          value: 88,
          weight: 0.15,
          formula:
            "0.30 × access(distance to major road) + 0.30 × access(distance to highway) + 0.40 × norm(Pop reachable 15min, 50k–500k)",
        },
      },
      isochroneCallouts: {
        medianHHI10min: "$178k",
        pctOver150k10min: "44%",
        pctDualIncome10min: "67%",
        children5to12Within10min: "9,420",
        children5to12Within15min: "28,140",
        familiesWithKids5to12Within10min: "5,680",
      },
    },
    {
      id: "leafspring-austin",
      schoolName: "LeafSpring (former NG site, closed 2023)",
      address: "Austin daycare facility, north of customer base",
      schoolType: "Other",
      enrollment: 220,
      gradeAlignment: "Daycare PK–K · misaligned vs NG 5–12 ✗",
      composite: 41,
      verdict:
        "Calibration anchor — known negative. Commute from established customer base and weak school-type fit drag the score below the recommend threshold.",
      subScores: {
        schoolProfile: {
          value: 38,
          weight: 0.25,
          formula:
            "0.50 × school_type_factor + 0.25 × normalize(Enrollment, 150–800) + 0.25 × grade_alignment_factor",
        },
        neighborhoodAffluence: {
          value: 52,
          weight: 0.25,
          formula:
            "0.40 × norm(Median HHI 10min) + 0.35 × norm(% HH >$150k) + 0.25 × norm(% Dual-Income)",
        },
        familyDensity: {
          value: 46,
          weight: 0.2,
          formula:
            "0.50 × norm(Children 5–12 / 10min) + 0.30 × norm(Children 5–12 / 15min) + 0.20 × norm(Families w/ kids / 10min)",
        },
        schoolEcosystem: {
          value: 35,
          weight: 0.15,
          formula:
            "0.40 × norm(Elementary count) + 0.30 × norm(Private school count) + 0.30 × norm(Nearby student pop)",
        },
        accessibility: {
          value: 32,
          weight: 0.15,
          formula:
            "0.30 × access(distance to major road) + 0.30 × access(distance to highway) + 0.40 × norm(Pop reachable 15min)",
        },
      },
      isochroneCallouts: {
        medianHHI10min: "$94k",
        pctOver150k10min: "16%",
        pctDualIncome10min: "48%",
        children5to12Within10min: "3,210",
        children5to12Within15min: "11,840",
        familiesWithKids5to12Within10min: "1,940",
      },
    },
  ],
  emptySlots: 2,
};
