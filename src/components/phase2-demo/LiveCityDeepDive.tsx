import { useMemo, useState } from "react";
import { Loader2, MapPin, FileDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { DEFAULT_WEIGHTS, computeMvs } from "@/lib/mvs/computeMvs";
import { useLiveMvs } from "@/lib/mvs/useLiveMvs";
import { RunPipelineButton } from "@/components/phase2-demo/RunPipelineButton";
import {
  DataSourcesPanel,
  ConfidenceStamp,
  ProviderSourceChips,
  OpenSourceLink,
  NationalOperatorsPanel,
} from "@/components/phase2-demo/LiveCitySourcePanels";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ProviderScreenshotButton } from "@/components/phase2-demo/ProviderScreenshotButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { classifyExclusion } from "@/lib/mvs/classifyExclusion";
import { unpricedBreakdown } from "@/lib/mvs/unpricedReason";
import { CrawlerTelemetryCard } from "@/components/phase2-demo/CrawlerTelemetryCard";




const NAVY = "#07142f";
const MUTED = "#526078";
const BORDER = "#eef2f7";
const SOFT = "#f7faff";
const BLUE = "#174be8";

const CHIP =
  "inline-flex items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold";

const SUB_SCORE_META: {
  key: keyof typeof DEFAULT_WEIGHTS;
  title: string;
  subtitle: string;
  formula: string;
  sources: { label: string; detail: string }[];
}[] = [
  {
    key: "pricingAcceptance",
    title: "Pricing Acceptance",
    subtitle: "Are families already paying premium pricing?",
    formula:
      "Uses each provider's lowest listed price as a single-week proxy. Score = 0.40 × normalize(median weekly, $300–$700) + 0.40 × normalize(75th pct weekly, $400–$800) + 0.20 × (% at $500+ per week).",
    sources: [
      { label: "Sawyer", detail: "Per-camp price ranges scraped from Sawyer listings (price_min / price_max)." },
      { label: "Google Maps", detail: "Cross-checked pricing where the Google Maps listing exposes a price range." },
      { label: "Google Search", detail: "Organic results for premium camps not indexed by Sawyer/Maps." },
      { label: "ActivityHero", detail: "Per-session pricing from ActivityHero listings, when available." },
      { label: "mvs_providers table", detail: "Every camp shown in the Premium providers table below feeds this score." },
    ],
  },
  // Market Absorption (formerly key: "marketAbsorption", 25% weight) was
  // removed June 24, 2026. Its weight was proportionally redistributed across
  // the 5 remaining pillars; the card, week-activity panel, and confidence
  // branch were all removed with it.
  {
    key: "scaledOperator",
    title: "Scaled Operator",
    subtitle: "Validated vs saturated by national operators?",
    formula:
      "0.65 × normalize(Operator Validation, 0–8) + 0.35 × (100 − normalize(Direct Competitor Load, 0–5 per 10k))",
    sources: [
      { label: "Operator watchlist", detail: "Curated list of national brands (Galileo, iD Tech, Steve & Kate's, etc.) maintained in mvs_operator_watchlist." },
      { label: "Provider name match", detail: "Watchlist names matched against the premium providers found in this city." },
      { label: "US Census ACS (5-yr)", detail: "Children 5–12 population used to normalize competitor load per 10k kids." },
    ],
  },
  {
    key: "enrichmentDiversity",
    title: "Enrichment Diversity",
    subtitle: "Do families invest across multiple categories?",
    formula:
      "normalize(clamp(Category Count, 2, 10), 2, 10) × 100",
    sources: [
      { label: "Category classifier", detail: "Each provider classified into STEM / Arts / Sports / Academic / Specialty by AI extractor over scraped descriptions." },
      { label: "mvs_providers table", detail: "Same premium provider rows as Pricing — category_classified column." },
    ],
  },
  {
    key: "marketDepth",
    title: "Market Depth",
    subtitle: "Is the premium ecosystem large enough to prove camp culture?",
    formula:
      "normalize(clamp(Premium Provider Count, 4, 15), 4, 15) × 100. Depth is a threshold question — beyond ~15 premium providers, additional density is context, not further validation, so the score saturates at 15.",
    sources: [
      { label: "5-source discovery", detail: "Deduplicated count from Sawyer + ActivityHero + Google Maps + Google Search + local directories." },
      { label: "Tier classifier", detail: "Only providers classified 'premium' by the tier rules are counted here." },
    ],
  },
  {
    key: "marketBalance",
    title: "Market Balance Index",
    subtitle: "Two-sided review flag — checks for saturated supply or unproven demand. Does not contribute to the composite score.",
    formula:
      "Affluent families per premium provider = affluent families with children ÷ premium provider count. Ratio < 200 → Saturated (review). Ratio > 8,000 → Unproven camp culture (review). Otherwise Healthy (no flag). Weight = 0% — this pillar does not enter the composite.",
    sources: [
      { label: "US Census ACS (B19131)", detail: "Affluent families with children, cost-of-living-adjusted, from us_cities_scored." },
      { label: "mvs_providers table", detail: "Premium provider count (denominator) from the same live providers table." },
    ],
  },
];

// Plain-English interpretation chips per pillar. Pillar-specific wording so
// non-technical readers can read the card without opening the formula.
// Market Balance uses its own bands driven by the coverageRatio input.
const GENERIC_BAND_LABELS = ["Weak", "Mixed", "Strong", "Very strong"] as const;
const GENERIC_BAND_MAX = [39, 59, 79, 100];

const PILLAR_BAND_SUFFIX: Record<string, string> = {
  pricingAcceptance: "premium pricing",
  scaledOperator: "operator validation",
};

const DIVERSITY_BAND_LABELS = [
  "narrow enrichment mix",
  "mixed enrichment mix",
  "broad enrichment mix",
  "very broad enrichment mix",
];

// 2026-07-14: "thin provider market" wording removed from the Depth chip —
// the "Thin market — low confidence" flag now only appears on Enrichment
// Diversity. Depth uses neutral size wording so the two cards don't
// duplicate the same warning.
const DEPTH_BAND_LABELS = [
  "small provider market",
  "moderate provider market",
  "deep provider market",
  "very deep provider market",
];

type BandTone = "weak" | "mid" | "strong" | "top";
const BAND_TONES: BandTone[] = ["weak", "mid", "strong", "top"];
const BAND_COLORS: Record<BandTone, { bg: string; fg: string }> = {
  weak: { bg: "#fce7ec", fg: "#a3142b" },
  mid: { bg: "#fff3d6", fg: "#8a5a00" },
  strong: { bg: "#e3f3e7", fg: "#1d6b32" },
  top: { bg: "#dceaff", fg: "#174be8" },
};

function bandIndexFromScore(score: number): number {
  return GENERIC_BAND_MAX.findIndex((m) => score <= m);
}

function bandFor(
  key: string,
  score: number | null,
  input: any,
): { label: string; tone: BandTone } | null {
  if (key === "marketBalance") {
    // 2026-07-14 rebuild: MBI is a two-sided review flag driven by `status`,
    // not by a 0–100 score. Healthy → no chip. Saturated/Unproven → review chip.
    const status = input?.status;
    if (!status || status === "healthy") return null;
    if (status === "saturated") return { label: "Saturated — review", tone: "weak" };
    if (status === "unproven") return { label: "Unproven camp culture — review", tone: "mid" };
    return null;
  }
  if (score == null) return null;
  const idx = Math.max(0, bandIndexFromScore(score));
  const tone = BAND_TONES[idx] ?? "mid";
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  if (key === "enrichmentDiversity") return { label: cap(DIVERSITY_BAND_LABELS[idx]), tone };
  if (key === "marketDepth") {
    // Depth band comes from raw provider count so the chip matches the RESULT
    // sentence bands (<8 small, 8–14 moderate, 15–19 deep, 20+ very deep).
    const pc = input?.premiumProviderCount;
    if (pc == null) return { label: cap(DEPTH_BAND_LABELS[idx]), tone };
    const depthIdx = pc < 8 ? 0 : pc < 15 ? 1 : pc < 20 ? 2 : 3;
    return { label: cap(DEPTH_BAND_LABELS[depthIdx]), tone: BAND_TONES[depthIdx] };
  }
  const suffix = PILLAR_BAND_SUFFIX[key];
  if (!suffix) return null;
  return { label: `${GENERIC_BAND_LABELS[idx]} ${suffix}`, tone };
}

// One-line plain-English "why" sentence shown right under the market band
// pill. Reads from the same `input` object already on the card — no extra
// fetch, no math change. Returns null when a needed input is missing so
// the card never shows a broken sentence.
function bandLabelWord(score: number): string {
  const idx = Math.max(0, bandIndexFromScore(score));
  return ["weak", "mixed", "strong", "very strong"][idx] ?? "mixed";
}
function bandThresholdWord(score: number): string {
  if (score <= 39) return "≤ 39 = weak";
  if (score <= 59) return "40–59 = mixed";
  if (score <= 79) return "60–79 = strong";
  return "80+ = very strong";
}
function fmt(n: number | null | undefined, digits = 1): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return n.toFixed(digits);
}
function bandWhyFor(
  key: string,
  score: number | null,
  input: any,
): string | null {
  if (key === "marketBalance") {
    // MBI is a review flag now — "why" reads from status, not from a score.
    const ratio = input?.marketBalanceRatio ?? input?.coverageRatio;
    const status = input?.status;
    if (ratio == null || status == null) return null;
    const rStr = Math.round(ratio).toLocaleString();
    if (status === "saturated")
      return `Why: ${rStr} affluent families per premium provider (< 200 → saturated supply, review recommended).`;
    if (status === "unproven")
      return `Why: ${rStr} affluent families per premium provider (> 8,000 → unproven camp culture, review recommended).`;
    return `Why: ${rStr} affluent families per premium provider (200–8,000 → healthy balance, no flag).`;
  }
  if (score == null) return null;
  const word = bandLabelWord(score);
  const thr = bandThresholdWord(score);
  const s = score.toFixed(1);
  if (key === "pricingAcceptance") {
    const med = fmt(input?.medianPrice, 0);
    const pct = fmt(input?.pctAtLeast500, 0);
    if (med == null || pct == null) return null;
    return `Why: median weekly price $${med} and ${pct}% of providers at $500+/wk give a ${word} score of ${s} (${thr}).`;
  }
  if (key === "scaledOperator") {
    const op = input?.operatorValidation;
    const dc = input?.directCompetitorLoad;
    if (op == null || dc == null) return null;
    return `Why: ${op} national operator${op === 1 ? "" : "s"} validating and ${fmt(dc, 1)} direct competitors per 10k kids give a ${word} score of ${s} (${thr}).`;
  }
  if (key === "enrichmentDiversity") {
    const cc = input?.categoryCount;
    if (cc == null) return null;
    return `Why: ${cc} enrichment categor${cc === 1 ? "y" : "ies"} represented gives a ${word} score of ${s} (${thr}).`;
  }
  if (key === "marketDepth") {
    const pc = input?.premiumProviderCount;
    if (pc == null) return null;
    return `Why: ${pc} premium provider${pc === 1 ? "" : "s"} found gives a ${word} score of ${s} (${thr}).`;
  }
  return null;
}

function resultSentenceFor(
  key: string,
  tone: BandTone | null | undefined,
  input?: any,
): string | null {
  // Market Balance is driven by status, not a tone from a 0–100 score.
  if (key === "marketBalance") {
    const status = input?.status;
    if (!status) return null;
    if (status === "saturated")
      return "Supply looks saturated for the affluent demand in this city — review before pursuing.";
    if (status === "unproven")
      return "Very few premium providers relative to affluent families — camp culture may be unproven. Review before pursuing.";
    return "Supply and affluent demand look well balanced — no review flag.";
  }
  // Market Depth uses the raw premium-provider count for cleaner bands.
  if (key === "marketDepth") {
    const pc = input?.premiumProviderCount;
    if (pc == null) return null;
    if (pc < 8) return `Only ${pc} premium provider${pc === 1 ? "" : "s"} — the premium ecosystem is small.`;
    if (pc < 15) return `${pc} premium providers — a moderate premium ecosystem, camp culture is emerging.`;
    return `${pc} premium providers — a mature premium ecosystem with proven camp culture.`;
  }
  if (!tone) return null;
  if (key === "pricingAcceptance") {
    if (tone === "weak") return "Most providers in this city are not charging premium prices yet.";
    if (tone === "mid") return "Some providers charge premium prices, but it is not the norm yet.";
    if (tone === "strong") return "Premium pricing is already common among providers here.";
    return "Premium pricing is the norm across providers here.";
  }
  if (key === "scaledOperator") {
    if (tone === "weak") return "Almost no national or multi-site operators are active in this city yet.";
    if (tone === "mid") return "A few national or multi-site operators are present, but the market is not crowded.";
    if (tone === "strong") return "Several national or multi-site operators are already competing here.";
    return "National and multi-site operators are heavily competing in this city.";
  }
  if (key === "enrichmentDiversity") {
    if (tone === "weak") return "Families here have very few enrichment options outside daycare.";
    if (tone === "mid") return "There is a moderate mix of enrichment categories for families.";
    if (tone === "strong") return "Families here have a wide range of enrichment options to choose from.";
    return "Families here enjoy an unusually broad mix of enrichment options.";
  }
  return null;
}

// Friendly labels for the sub-score input rows so non-technical readers
// can interpret the numbers (e.g. "Median weekly price (est.)" instead of
// the raw camelCase key "medianPrice").
const INPUT_LABELS: Record<string, string> = {
  medianPrice: "Median weekly price (est.)",
  p75Price: "75th-pct weekly price (est.)",
  pctAtLeast500: "% of providers ≥ $500/wk",
  selloutRate: "Sellout rate",
  premiumProviderCount: "Premium providers",
  categoryCount: "Categories represented",
  diversityRatio: "Diversity ratio",
  operatorValidation: "National operators (validating)",
  directCompetitorLoad: "Direct competitors / 10k kids",
  marketBalanceRatio: "Affluent families per premium provider",
  coverageRatio: "Affluent families per premium provider",
  status: "Balance status",
  children5to12: "Children 5–12 (US Census ACS)",
  affluentDualIncomeFamilyCount: "Affluent families with children (ACS B19131)",
};

// Per-input freshness/source pill shown on the right of each input row so
// readers can tell which numbers are live-scraped vs. from static reference
// data (ACS) vs. from the curated operator watchlist. Uses only signals
// already in scope — no extra fetch.
function freshnessForInput(key: string, lastRefreshed: string | null): string {
  if (
    key === "coverageRatio" ||
    key === "marketBalanceRatio" ||
    key === "children5to12" ||
    key === "affluentDualIncomeFamilyCount"
  ) {
    return "US Census ACS";
  }
  if (key === "operatorValidation") return "Watchlist";
  if (key === "directCompetitorLoad") return "Watchlist + ACS";
  if (lastRefreshed) {
    try {
      const d = new Date(lastRefreshed);
      return `Scraped ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    } catch {
      return "Scraped";
    }
  }
  return "Scraped";
}

// Build the click-through "proof" rows for an input number. Mirrors the
// same filter computeMvs uses (premium tier + has the required field) so
// the rows shown match the math exactly. Returns null when there is no
// useful breakdown for the key.
type ProofRow = { label: string; value?: string | number | null; providerId?: string | null };

// Resolve a provider name against the watchlist + city overrides, returning
// the effective overlap ("direct" | "adjacent") or null. Mirrors the same
// logic in computeMvs.ts so popover rows match the score math exactly.
function resolveOverlapLocal(
  providerName: string,
  watchlist: any[],
  overrides: any[],
): { brand: string; overlap: string } | null {
  const lower = providerName.toLowerCase();
  const match = watchlist.find((w) => lower.includes(String(w.name).toLowerCase()));
  if (!match) return null;
  const override = overrides.find(
    (o) => String(o.operator_name).toLowerCase() === String(match.name).toLowerCase(),
  );
  const overlap = override ? override.overlap : match.default_overlap;
  return { brand: match.name, overlap };
}

function proofForInput(
  key: string,
  premiumProviders: any[],
  categoryCounts: { label: string; count: number }[],
  watchlist: any[],
  overrides: any[],
  acs: { affluent_dual_income_family_count: number; children_5_12_count: number } | null,
  cityDisplay: string,
): { title: string; subtitle: string; rows: ProofRow[] } | null {
  if (
    key === "medianPrice" ||
    key === "p75Price" ||
    key === "pctAtLeast500"
  ) {
    const withPrice = premiumProviders
      .filter((p) => (p.price_min ?? null) != null)
      .map((p) => ({
        label: p.name,
        value: `$${p.price_min}${p.price_max && p.price_max !== p.price_min ? `–$${p.price_max}` : ""}/wk`,
        providerId: p.id ?? null,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return {
      title: `Providers behind this number (${withPrice.length})`,
      subtitle: "Premium providers with a readable weekly price",
      rows: withPrice,
    };
  }
  if (key === "premiumProviderCount") {
    const rows = premiumProviders
      .map((p) => ({ label: p.name, value: p.category_classified ?? "—", providerId: p.id ?? null }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return {
      title: `Premium providers (${rows.length})`,
      subtitle: "All providers classified as premium tier",
      rows,
    };
  }
  if (key === "categoryCount" || key === "diversityRatio") {
    const rows = categoryCounts.map((c) => ({ label: c.label, value: c.count }));
    return {
      title: `Categories represented (${rows.length})`,
      subtitle: "Premium providers grouped by classified category",
      rows,
    };
  }
  if (key === "operatorValidation") {
    // Unique national brands matched in this city (any overlap counts).
    const seen = new Map<string, string>();
    for (const p of premiumProviders) {
      const m = resolveOverlapLocal(p.name, watchlist, overrides);
      if (m && !seen.has(m.brand.toLowerCase())) {
        seen.set(m.brand.toLowerCase(), m.overlap);
      }
    }
    const rows = Array.from(seen.entries())
      .map(([brand, overlap]) => ({
        label: brand,
        value: overlap === "direct" ? "direct overlap" : "adjacent overlap",
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return {
      title: `Validating national operators (${rows.length})`,
      subtitle: "Watchlist brands found among premium providers in this city",
      rows: rows.length > 0
        ? rows
        : [{ label: "No watchlist brands matched in this city", value: "" }],
    };
  }
  if (key === "directCompetitorLoad") {
    // Direct-overlap site count ÷ (children_5_12 / 10000).
    const directRows: ProofRow[] = [];
    let directSiteCount = 0;
    for (const p of premiumProviders) {
      const m = resolveOverlapLocal(p.name, watchlist, overrides);
      if (m && m.overlap === "direct") {
        const sites = p.site_count ?? 1;
        directSiteCount += sites;
        directRows.push({ label: `${p.name} (${m.brand})`, value: `${sites} site${sites === 1 ? "" : "s"}`, providerId: p.id ?? null });
      }
    }
    directRows.sort((a, b) => a.label.localeCompare(b.label));
    const kids = acs?.children_5_12_count ?? 0;
    const per10k = kids / 10000;
    const ratio = per10k > 0 ? directSiteCount / per10k : 0;
    const formulaRows: ProofRow[] = [
      { label: "Direct competitor sites", value: directSiteCount },
      { label: "Children 5–12", value: kids.toLocaleString() },
      { label: "÷ 10,000 kids", value: per10k.toFixed(2) },
      { label: "Direct competitors / 10k kids", value: ratio.toFixed(2) },
    ];
    return {
      title: "Direct competitors per 10k kids",
      subtitle: "Direct-overlap sites ÷ (children 5–12 ÷ 10,000)",
      rows: [
        ...formulaRows,
        { label: "—", value: "" },
        ...(directRows.length > 0
          ? directRows
          : [{ label: "No direct-overlap brands matched", value: "" }]),
      ],
    };
  }
  if (key === "children5to12") {
    const kids = acs?.children_5_12_count ?? null;
    return {
      title: `Children 5–12 in ${cityDisplay}`,
      subtitle: "US Census ACS 5-year estimate",
      rows: [
        { label: "Children aged 5–12", value: kids != null ? kids.toLocaleString() : "—" },
        { label: "Source", value: "data.census.gov (ACS 5-year)" },
      ],
    };
  }
  if (key === "coverageRatio" || key === "marketBalanceRatio") {
    const affluent = acs?.affluent_dual_income_family_count ?? 0;
    const premCount = premiumProviders.length;
    const ratio = premCount > 0 ? affluent / premCount : 0;
    let band = "Healthy";
    if (ratio < 200) band = "Saturated — review";
    else if (ratio > 8000) band = "Unproven — review";
    return {
      title: "Affluent families per premium provider",
      subtitle: "Affluent families with children (ACS B19131) ÷ premium providers",
      rows: [
        { label: "Affluent families with children (ACS B19131)", value: affluent.toLocaleString() },
        { label: "Premium providers", value: premCount },
        { label: "Ratio", value: Math.round(ratio).toLocaleString() },
        { label: "Status", value: band },
      ],
    };
  }
  if (key === "affluentDualIncomeFamilyCount") {
    const affluent = acs?.affluent_dual_income_family_count ?? null;
    const kids = acs?.children_5_12_count ?? null;
    return {
      title: `Affluent dual-income families in ${cityDisplay}`,
      subtitle: "Pre-computed in mvs-acs ingest from US Census ACS",
      rows: [
        { label: "Affluent dual-income families", value: affluent != null ? affluent.toLocaleString() : "—" },
        { label: "Children 5–12 (reference)", value: kids != null ? kids.toLocaleString() : "—" },
        { label: "Source", value: "data.census.gov (ACS 5-year)" },
      ],
    };
  }
  return null;
}




interface Props {
  cityKey: string;            // e.g. "Austin, TX"
  cityDisplay: string;        // e.g. "Austin"
  stateDisplay: string;       // e.g. "TX"
}

/**
 * Live deep-dive panel rendered on Market Validation when a city's
 * `mvs_city_flags.mvs_data_source = 'live'`. Reads providers/weeks/ACS via
 * `useLiveMvs` and computes MVS through the shared helper. Sliders are
 * preview-only (v1.0): they change the in-memory weight blend without
 * persisting, so users can sanity-check sensitivity.
 */
// Strict Camp View helper is shared with Provider Evidence Review.
// See src/lib/mvs/classifyExclusion.ts

export function LiveCityDeepDive({ cityKey, cityDisplay, stateDisplay }: Props) {
  const [weights, setWeights] = useState<Record<string, number>>({ ...DEFAULT_WEIGHTS });
  const { result, providers, weeks, acs, flag, watchlist, overrides, lastRefreshed, qaOpenCount, qaReasons, loading, error, refresh } =
    useLiveMvs(cityKey, { weights });

  const [catchingUp, setCatchingUp] = useState(false);
  const [catchupProgress, setCatchupProgress] = useState({ current: 0, total: 0 });
  const [showExcluded, setShowExcluded] = useState(false);
  const [regressionCheck, setRegressionCheck] = useState<{
    prev: number | null;
    curr: number;
    regressed: boolean;
    at: string;
  } | null>(null);

  // Strict Camp View — split providers into real camps vs non-camps. Raw
  // rows are preserved in the DB; this only affects headline counters and
  // the catch-up scanner. The Excluded drawer below the table keeps full
  // visibility for audit.
  const activeCamps = useMemo(
    () => providers.filter((p) => classifyExclusion(p) === null),
    [providers],
  );
  const excludedProviders = useMemo(
    () =>
      providers
        .map((p) => ({ p, ex: classifyExclusion(p) }))
        .filter((x) => x.ex !== null) as Array<{ p: any; ex: { reason: string; label: string } }>,
    [providers],
  );

  async function runClientCatchup() {
    const unpriced = activeCamps.filter((p) => (p.price_min ?? null) == null && (p.price_max ?? null) == null);
    if (unpriced.length === 0) {
      toast.info(`All ${activeCamps.length} summer camps already have pricing checked.`);
      return;
    }
    setCatchingUp(true);
    setCatchupProgress({ current: 0, total: unpriced.length });
    const batchSize = 5;
    let checked = 0;
    for (let i = 0; i < unpriced.length; i += batchSize) {
      const batchIds = unpriced.slice(i, i + batchSize).map((p) => p.id);
      try {
        await supabase.functions.invoke("mvs-discover-providers", {
          body: { city: cityKey, catchupBatch: batchIds },
        });
      } catch (err) {
        console.warn("[Catchup] batch failed:", err);
      }
      checked += batchIds.length;
      setCatchupProgress({ current: Math.min(checked, unpriced.length), total: unpriced.length });
      refresh();
    }
    // After all prices are filled, re-run tier classification so any newly
    // priced camps (≥$400 → premium, <$200 → budget) get retagged. Otherwise
    // freshly priced rows stay stuck at their pre-catchup "mid" default.
    try {
      await supabase.functions.invoke("mvs-classify-tier", {
        body: { city: cityKey, reclassify: true },
      });
    } catch (err) {
      console.warn("[Catchup] reclassify failed (non-fatal):", err);
    }
    // T2 — Regression guard: compare premium count vs previous snapshot.
    // If it dropped ≥20% we fire a notification via the RPC and show a
    // small inline warning here.
    try {
      const { data: reg } = await supabase.rpc("mvs_check_tier_regression", {
        _city: cityKey,
        _trigger: "client_catchup",
      });
      if (reg && typeof reg === "object") {
        const r = reg as any;
        setRegressionCheck({
          prev: r.previous?.premium ?? null,
          curr: r.current?.premium ?? 0,
          regressed: !!r.regressed,
          at: new Date().toISOString(),
        });
        if (r.regressed) {
          toast.warning(
            `Premium count dropped from ${r.previous.premium} to ${r.current.premium} in ${cityDisplay}. Check the notification bell.`,
          );
        }
      }
    } catch (err) {
      console.warn("[Catchup] regression check failed (non-fatal):", err);
    }
    setCatchingUp(false);
    toast.success(`Catch-up finished for ${unpriced.length} camps!`);
    refresh();
  }



  const provCount = activeCamps.length;
  const excludedCount = excludedProviders.length;
  const weekCount = weeks.length;
  // Filter out QA reasons from the retired Market Absorption pillar so they
  // don't inflate the "items in QA queue" pill or trigger the Limited Source
  // Coverage badge. Registration-page scraping fed only that pillar.
  const isRetiredQaReason = (r: string) =>
    r === "no registration page found" || r.startsWith("no usable page");
  const activeQaReasons = qaReasons.filter((r) => !isRetiredQaReason(r.reason));
  const activeQaCount = activeQaReasons.reduce((sum, r) => sum + r.count, 0);
  // The DB-stored `low_confidence_badge` is computed from no_reg_page_pct,
  // which is now a stale signal. Only treat the city as low-confidence if
  // there's at least one non-retired QA reason.
  const lowConfidence = (flag?.low_confidence_badge ?? false) && activeQaCount > 0;


  const premiumProviders = useMemo(
    () => activeCamps.filter((p) => p.tier === "premium"),
    [activeCamps],
  );

  // Category breakdown of premium providers — rendered as small chips inside
  // the Enrichment Diversity card so readers can see which categories the
  // diversity score is built from. Uses the same `category_classified` field
  // already loaded by useLiveMvs (no new fetch).
  const categoryCounts = useMemo(() => {
    const order = ["STEM", "Arts", "Sports", "Academic", "Specialty"];
    const counts: Record<string, number> = {};
    for (const p of premiumProviders) {
      const raw = (p as any).category_classified;
      if (!raw) continue;
      const norm = String(raw).trim();
      if (!norm) continue;
      const key =
        order.find((o) => o.toLowerCase() === norm.toLowerCase()) ?? norm;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const known = order
      .filter((k) => counts[k])
      .map((k) => ({ label: k, count: counts[k] }));
    const extras = Object.keys(counts)
      .filter((k) => !order.includes(k))
      .sort()
      .map((k) => ({ label: k, count: counts[k] }));
    return [...known, ...extras];
  }, [premiumProviders]);

  // Per-sub-score confidence: each pillar now explains its OWN inputs
  // (not just the global provider count) so the four non-Scaled cards stop
  // showing the same sentence. All counts read arrays already in scope.
  const nTotal = premiumProviders.length;
  const nWithPrice = useMemo(
    () => premiumProviders.filter((p) => (p.price_min ?? null) != null).length,
    [premiumProviders],
  );
  const nWithCategory = useMemo(
    () => premiumProviders.filter((p) => !!(p as any).category_classified).length,
    [premiumProviders],
  );

  // "What-if" delta: recompute MVS with DEFAULT_WEIGHTS so we can show the
  // user how far their slider preview moved the score from baseline. Uses
  // the same providers/weeks/acs already in scope — no extra fetch.
  const defaultMvs = useMemo(() => {
    if (!acs) return null;
    try {
      // Pass watchlist + overrides so this baseline matches what the shortlist
      // table and useLiveMvs report (Brett's "one calibrated number" rule).
      return computeMvs(providers, weeks, acs, {
        weights: DEFAULT_WEIGHTS,
        watchlist,
        overlapOverrides: overrides,
      }).mvs;
    } catch {
      return null;
    }
  }, [providers, weeks, acs, watchlist, overrides]);


  const weightsDirty = useMemo(
    () =>
      (Object.keys(DEFAULT_WEIGHTS) as (keyof typeof DEFAULT_WEIGHTS)[]).some(
        (k) => Math.abs((weights[k] ?? 0) - DEFAULT_WEIGHTS[k]) > 0.001,
      ),
    [weights],
  );


  function confidenceFor(key: string): { level: "high" | "medium" | "low"; detail: string } {
    if (key === "scaledOperator") {
      if (watchlist.length === 0) return { level: "low", detail: "Watchlist is empty." };
      return { level: "high", detail: `Matched against ${watchlist.length} national brands.` };
    }

    if (key === "pricingAcceptance") {
      if (nWithPrice === 0) return { level: "low", detail: `0 of ${nTotal} premium providers had a readable price.` };
      if (nWithPrice < 5) return { level: "low", detail: `${nWithPrice} of ${nTotal} providers had readable prices — too few for a stable median.` };
      const level = nWithPrice < 10 ? "medium" : "high";
      return { level, detail: `${nWithPrice} of ${nTotal} providers had readable prices.` };
    }

    if (key === "enrichmentDiversity") {
      const k = categoryCounts.length;
      if (nWithCategory === 0) return { level: "low", detail: `0 of ${nTotal} providers classified into a category.` };
      const level = k < 3 || nWithCategory < 5 ? "low" : k < 5 || nWithCategory < 10 ? "medium" : "high";
      return { level, detail: `Based on ${k} categor${k === 1 ? "y" : "ies"} across ${nWithCategory} classified providers.` };
    }

    if (key === "marketDepth") {
      if (nTotal === 0) return { level: "low", detail: "No premium providers discovered." };
      const level = nTotal < 5 ? "low" : nTotal < 10 ? "medium" : "high";
      return { level, detail: `Based on ${nTotal} premium provider${nTotal === 1 ? "" : "s"} discovered.` };
    }

    if (key === "marketBalance") {
      const cov = (result?.inputs.marketBalance as any)?.coverageRatio as number | null | undefined;
      if (cov == null) return { level: "low", detail: "No coverage ratio yet — needs ACS + premium provider count." };
      const level = nTotal < 5 ? "low" : nTotal < 10 ? "medium" : "high";
      return { level, detail: `Based on coverage ratio ${cov.toFixed(0)} (ACS kids ÷ premium seats) across ${nTotal} provider${nTotal === 1 ? "" : "s"}.` };
    }

    return { level: "medium", detail: `${nTotal} providers.` };
  }





  const nMissingPriceTotal = useMemo(
    () => activeCamps.filter((p) => (p.price_min ?? null) == null && (p.price_max ?? null) == null).length,
    [activeCamps],
  );
  const unpricedReasons = useMemo(() => unpricedBreakdown(activeCamps), [activeCamps]);

  if (loading) {
    return (
      <section
        className="mb-5 flex h-32 items-center justify-center rounded-lg border bg-white"
        style={{ borderColor: BORDER }}
      >
        <Loader2 className="h-5 w-5 animate-spin text-[#174be8]" />
        <span className="ml-2 text-sm text-[#526078]">
          Loading live {cityDisplay} pipeline data…
        </span>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load live {cityDisplay} data: {error}
      </section>
    );
  }


  return (
    <>
      <div className="mb-4 rounded-lg border border-[#dbe4f2] bg-[#f0f5ff] p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#174be8]"></span>
            <span className="text-xs font-bold text-[#07142f]">Missing Prices Catch-Up Queue</span>
            <span className="rounded-full bg-[#dceaff] px-2 py-0.5 text-[10px] font-bold text-[#174be8]">
              {nMissingPriceTotal} unpriced
            </span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {catchingUp && (
              <div className="flex flex-1 sm:w-48 flex-col gap-1">
                <div className="flex justify-between text-[10px] font-semibold text-[#526078]">
                  <span>Scanning Google…</span>
                  <span>{catchupProgress.current} / {catchupProgress.total}</span>
                </div>
                <Progress value={catchupProgress.total > 0 ? (catchupProgress.current / catchupProgress.total) * 100 : 0} className="h-2" />
              </div>
            )}
            <button
              onClick={runClientCatchup}
              disabled={catchingUp || nMissingPriceTotal === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#174be8] px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-[#123bb8] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {catchingUp && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {catchingUp ? "Running Catch-Up…" : `Run Missing Prices Catch-Up (${nMissingPriceTotal})`}
            </button>
          </div>
        </div>
        {nMissingPriceTotal > 0 && unpricedReasons.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-[#dbe4f2] pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#526078]">
              Why unpriced:
            </span>
            {unpricedReasons.map((r) => (
              <span
                key={r.key}
                className="inline-block rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#07142f] border border-[#dbe4f2]"
              >
                {r.count} {r.short.toLowerCase()}
              </span>
            ))}
          </div>
        )}
        <CrawlerTelemetryCard providers={activeCamps as any} cityDisplay={cityDisplay} />
        {regressionCheck && (
          <div
            className={`mt-2 rounded-md border px-3 py-1.5 text-[11px] ${
              regressionCheck.regressed
                ? "border-[#f5c2c7] bg-[#fdecea] text-[#a3142b]"
                : "border-[#c8e6d0] bg-[#eaf7ee] text-[#1d6b32]"
            }`}
          >
            <strong>Regression check:</strong>{" "}
            {regressionCheck.regressed ? "⚠ " : "✓ "}
            Premium tier{" "}
            {regressionCheck.prev != null ? `${regressionCheck.prev} → ` : ""}
            {regressionCheck.curr}
            {regressionCheck.regressed
              ? " — sharp drop detected. See notification bell."
              : " — no regression."}
          </div>
        )}
      </div>



      <RunPipelineButton city={cityKey} onComplete={refresh} />
      {/* Composite hero card */}

      <section
        className="mb-5 rounded-lg border bg-white p-5"
        style={{ borderColor: BORDER }}
      >
        <div className="flex flex-wrap items-start gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <MapPin size={16} style={{ color: BLUE }} />
              <h2 className="text-[18px] font-black" style={{ color: NAVY }}>
                {cityDisplay}, {stateDisplay}
              </h2>
              <span
                className={CHIP}
                style={{ backgroundColor: "#e3f3e7", color: "#1d6b32" }}
              >
                Live · v1.0-fixed
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={`${CHIP} cursor-help`}
                    style={{ backgroundColor: "#eef2f7", color: "#07142f" }}
                  >
                    {provCount} active camp{provCount === 1 ? "" : "s"}
                    {excludedCount > 0 ? ` · ${excludedCount} excluded` : ""}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-[12px] leading-relaxed">
                  <strong>Strict Camp View.</strong> Headline counters and the Missing-Prices catch-up scanner only include real summer camps. Daycares, public parks, free retail workshops, and charity drop-in clubs are kept in the database for audit but moved to the <em>Excluded Locations</em> drawer below the providers table.
                </TooltipContent>
              </Tooltip>
              {lowConfidence && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={`${CHIP} cursor-help`}
                      style={{ backgroundColor: "#fce7ec", color: "#a3142b" }}
                    >
                      ⚑ Limited Source Coverage
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-[12px] leading-relaxed">
                    More than 20% of premium providers in this city had missing or broken registration pages we could not read. The Market Validation Score still computed, but treat it with caution until those sources are fixed in the QA Queue.
                  </TooltipContent>
                </Tooltip>
              )}
              <a
                href={`/market-validation/competitors?city=${encodeURIComponent(cityDisplay)}&state=${encodeURIComponent(stateDisplay)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold"
                style={{ borderColor: BLUE, color: BLUE, backgroundColor: "#fff" }}
                title={`Open every provider found for ${cityDisplay} in a new tab.`}
              >
                See all competitors for this city →
              </a>
              <a
                href={`/market-validation/evidence?city=${encodeURIComponent(cityDisplay)}&state=${encodeURIComponent(stateDisplay)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold"
                style={{ borderColor: BLUE, color: BLUE, backgroundColor: "#fff" }}
                title={`Open the Provider Evidence Review for ${cityDisplay} in a new tab.`}
              >
                Review Provider Evidence →
              </a>
            </div>
            <p
              className="mt-2 text-[12px] leading-relaxed"
              style={{ color: MUTED }}
            >
              {provCount === 0 && weekCount === 0 ? (
                <>
                  No pipeline data yet for {cityDisplay}. Open the{" "}
                  <a href="/market-validation/rollout" className="font-semibold text-[#174be8] underline">
                    City Scoring Console
                  </a>{" "}
                  and click <strong>Run</strong> for {cityDisplay} to generate a Market Validation Score
                  (1–2 min). Once the run finishes, the score and sub-metrics will appear here automatically.
                </>
              ) : (
                <>
                  Computed from {provCount} provider{provCount === 1 ? "" : "s"} for {cityDisplay}. Drag a weight slider below to sanity-check sensitivity
                  (preview-only, not persisted).
                </>
              )}
            </p>
          </div>
          <div className="flex w-[240px] shrink-0 flex-col items-end gap-2">
            <div className="text-[42px] font-black leading-none tabular-nums" style={{ color: NAVY }}>
              {result?.mvs != null ? result.mvs.toFixed(1) : "—"}
            </div>
            <div className="text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>
              {result?.mvs != null ? "Market Validation Score" : "Not scored yet"}
            </div>
            {weightsDirty && result?.mvs != null && defaultMvs != null && (
              <div
                className="mt-1 flex items-center gap-2 rounded-md border px-2 py-1 text-[10px]"
                style={{ borderColor: BORDER, backgroundColor: SOFT, color: NAVY }}
                title="Default weights are the baseline used everywhere else in the app. Your slider changes are preview-only."
              >
                <span>
                  Default <span className="font-bold tabular-nums">{defaultMvs.toFixed(1)}</span>{" "}
                  → preview <span className="font-bold tabular-nums">{result.mvs.toFixed(1)}</span>{" "}
                  <span
                    className="font-semibold tabular-nums"
                    style={{ color: result.mvs > defaultMvs ? "#1d6b32" : result.mvs < defaultMvs ? "#a3142b" : MUTED }}
                  >
                    ({result.mvs > defaultMvs ? "+" : ""}{(result.mvs - defaultMvs).toFixed(1)})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setWeights({ ...DEFAULT_WEIGHTS })}
                  className="rounded border px-1.5 py-0.5 text-[10px] font-semibold hover:bg-white"
                  style={{ borderColor: BORDER, color: BLUE }}
                >
                  Reset
                </button>
              </div>
            )}

            <a
              href={`/market-brief?city=${encodeURIComponent(cityDisplay)}&state=${encodeURIComponent(stateDisplay)}&w=pa:${weights.pricingAcceptance},so:${weights.scaledOperator},ed:${weights.enrichmentDiversity},md:${weights.marketDepth},mb:${weights.marketBalance}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[#174be8] px-3 py-1.5 text-[12px] font-bold text-white hover:bg-[#1240c9]"
              title="Open the branded Market Brief in a new tab. Use Cmd-P / Save as PDF for a print-quality copy."
            >
              <FileDown size={12} />
              Open Market Brief
            </a>
          </div>
        </div>
      </section>

      {/* Data sources strip — provenance + freshness at a glance */}
      <DataSourcesPanel
        providers={providers}
        weeks={weeks}
        watchlistCount={watchlist.length}
        acsAvailable={!!acs}
        lastRefreshed={lastRefreshed}
        qaOpenCount={activeQaCount}
      />

      {/* Sub-score grid with live sliders */}
      <p className="mb-2 text-[12px] leading-relaxed" style={{ color: MUTED }}>
        Each card shows the score, what it means, the inputs used, and where the data came from. The big number is the pillar score and does not change with the slider. The slider only changes how much this pillar counts toward the final MVS at the top of the page.
      </p>
      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SUB_SCORE_META.map((meta) => {
          const score = result?.scores[meta.key] ?? null;
          const input = result?.inputs[meta.key] as any;
          const weight = weights[meta.key];
          const confidence = confidenceFor(meta.key);
          const band = bandFor(meta.key, score, input);
          const isMbi = meta.key === "marketBalance";
          const mbiStatus = isMbi ? (input?.status as string | null | undefined) : null;
          const mbiFlagged = isMbi && (mbiStatus === "saturated" || mbiStatus === "unproven");
          return (
            <div
              key={meta.key}
              className="flex flex-col rounded-lg border bg-white p-4"
              style={{ borderColor: BORDER, minHeight: 260 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="text-[13px] font-bold" style={{ color: NAVY }}>
                      {meta.title}
                    </h3>
                    <span
                      className={CHIP}
                      style={{ backgroundColor: SOFT, color: BLUE }}
                      title={isMbi ? "Market Balance is a review flag — it does not contribute weight to the composite score." : undefined}
                    >
                      {isMbi ? "Review flag · 0%" : `${Math.round(weight * 100)}%`}
                    </span>
                    {band && (
                      <span
                        className={CHIP}
                        style={{ backgroundColor: BAND_COLORS[band.tone].bg, color: BAND_COLORS[band.tone].fg }}
                      >
                        {band.label}
                      </span>
                    )}
                    {meta.key === "enrichmentDiversity" &&
                      typeof input?.premiumProviderCount === "number" &&
                      input.premiumProviderCount < 4 && (
                        <span
                          className={CHIP}
                          style={{ backgroundColor: "#fff3d6", color: "#8a5a00" }}
                          title="Fewer than 4 premium providers found; enrichment breadth signal is weak."
                        >
                          Thin market — low confidence
                        </span>
                      )}
                  </div>
                  <p className="mt-0.5 text-[11px]" style={{ color: MUTED }}>
                    {meta.subtitle}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {isMbi ? (
                    <>
                      <div
                        className="text-[18px] font-black leading-tight tabular-nums"
                        style={{ color: mbiFlagged ? "#a3142b" : NAVY }}
                      >
                        {mbiStatus === "saturated"
                          ? "Saturated"
                          : mbiStatus === "unproven"
                          ? "Unproven"
                          : mbiStatus === "healthy"
                          ? "Healthy"
                          : "—"}
                      </div>
                      <div className="mt-0.5 text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>
                        review flag
                      </div>
                      <div className="mt-0.5 text-[9px] italic" style={{ color: MUTED }}>
                        no sub-score
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className="text-[24px] font-black leading-none tabular-nums"
                        style={{ color: NAVY }}
                      >
                        {score != null ? score.toFixed(1) : "—"}
                      </div>
                      <div className="mt-0.5 text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>
                        / 100
                      </div>
                      <div className="mt-0.5 text-[9px] italic" style={{ color: MUTED }}>
                        sub-score
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Result */}
              {(() => {
                const sentence = resultSentenceFor(meta.key, band?.tone, input);
                return sentence ? (
                  <div className="mt-3 border-t border-dashed pt-2" style={{ borderColor: BORDER }}>
                    <div className="mb-1 text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>
                      Result
                    </div>
                    <p className="text-[12px] leading-snug" style={{ color: NAVY }}>
                      {sentence}
                    </p>
                  </div>
                ) : null;
              })()}

              {/* Evidence */}
              {input && (
                <div className="mt-3 border-t border-dashed pt-2" style={{ borderColor: BORDER }}>
                  <div className="mb-1 text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>
                    Evidence
                  </div>
                  <ul className="space-y-1">
                    {Object.entries(input).map(([k, v]) => {
                      if (v == null || k === "year2Signal" || k === "diversityRatio") return null;
                      // MBI: skip fields already shown as the status chip or as
                      // a duplicate of marketBalanceRatio.
                      if (isMbi && (k === "coverageRatio" || k === "status")) return null;
                      const display =
                        typeof v === "number"
                          ? k === "marketBalanceRatio" || k === "affluentDualIncomeFamilyCount" || k === "premiumProviderCount" || k === "children5to12"
                            ? Math.round(v).toLocaleString()
                            : Number.isInteger(v)
                            ? v
                            : v.toFixed(2)
                          : String(v);
                      const proof = proofForInput(k, premiumProviders, categoryCounts, watchlist, overrides, acs, cityDisplay);
                      return (
                        <li key={k} className="flex items-center justify-between gap-2 text-[11px]">
                          <span style={{ color: MUTED }}>{INPUT_LABELS[k] ?? k}</span>
                          <span className="flex items-center gap-1.5">
                            {proof ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    className="font-medium tabular-nums underline decoration-dotted underline-offset-2 hover:text-[#174be8]"
                                    style={{ color: NAVY }}
                                    title="Click to see the rows behind this number"
                                  >
                                    {display}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent
                                  align="end"
                                  className="w-[320px] p-0"
                                  style={{ borderColor: BORDER }}
                                >
                                  <div className="border-b px-3 py-2 text-[12px] font-bold" style={{ borderColor: BORDER, color: NAVY }}>
                                    {proof.title}
                                    <div className="mt-0.5 text-[10px] font-normal" style={{ color: MUTED }}>
                                      {proof.subtitle}
                                    </div>
                                  </div>
                                  <div className="max-h-[260px] overflow-y-auto">
                                    {proof.rows.length === 0 ? (
                                      <div className="px-3 py-3 text-[11px]" style={{ color: MUTED }}>
                                        No rows to show.
                                      </div>
                                    ) : (
                                      <ul className="divide-y" style={{ borderColor: BORDER }}>
                                        {proof.rows.map((r, i) => (
                                          <li
                                            key={i}
                                            className="flex items-center justify-between gap-2 px-3 py-1.5 text-[11px]"
                                            style={{ borderColor: BORDER }}
                                          >
                                            <span className="min-w-0 flex-1 truncate" style={{ color: NAVY }}>
                                              {r.label}
                                            </span>
                                            {r.providerId && (
                                              <ProviderScreenshotButton
                                                providerId={r.providerId}
                                                providerName={r.label}
                                              />
                                            )}
                                            {r.value != null && (
                                              <span className="shrink-0 tabular-nums font-semibold" style={{ color: NAVY }}>
                                                {r.value}
                                              </span>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <span className="font-medium tabular-nums" style={{ color: NAVY }}>
                                {display}
                              </span>
                            )}
                            <span
                              className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                              style={{ backgroundColor: SOFT, color: MUTED, border: `1px solid ${BORDER}` }}
                              title="Where this number came from"
                            >
                              {freshnessForInput(k, lastRefreshed)}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  {meta.key === "enrichmentDiversity" && (
                    <div className="mt-2 border-t border-dashed pt-2" style={{ borderColor: BORDER }}>
                      <div className="mb-1 text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>
                        Categories found
                      </div>
                      {categoryCounts.length === 0 ? (
                        <p className="text-[11px]" style={{ color: MUTED }}>
                          No categories classified yet.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {categoryCounts.map((c) => (
                            <span
                              key={c.label}
                              className={CHIP}
                              style={{ backgroundColor: SOFT, color: NAVY, border: `1px solid ${BORDER}` }}
                            >
                              {c.label} {c.count}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Trust — MBI shows "Review recommended" when a flag is set,
                  otherwise a short "No flag" note. All other pillars keep the
                  original confidence stamp. */}
              {isMbi ? (
                <div className="mt-3 border-t border-dashed pt-2" style={{ borderColor: BORDER }}>
                  <div className="mb-1 text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>
                    Trust
                  </div>
                  <p
                    className="text-[12px] font-semibold leading-snug"
                    style={{ color: mbiFlagged ? "#a3142b" : NAVY }}
                  >
                    {mbiFlagged ? "Review recommended" : "No review flag"}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug" style={{ color: MUTED }}>
                    {mbiFlagged
                      ? "This is a two-sided check on supply vs. affluent demand. The composite score is unaffected — treat this as a diligence signal."
                      : "Supply and affluent demand fall inside the healthy band. No follow-up needed."}
                  </p>
                </div>
              ) : (
                <div className="mt-3 border-t border-dashed pt-2" style={{ borderColor: BORDER }}>
                  <div className="mb-1 text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>
                    Trust
                  </div>
                  <p className="text-[12px] font-semibold leading-snug" style={{ color: NAVY }}>
                    {confidence.level === "high" ? "High confidence" : confidence.level === "medium" ? "Medium confidence" : "Low confidence"}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] leading-snug" style={{ color: MUTED }}>
                    <span>{confidence.detail}</span>
                    <ConfidenceStamp level={confidence.level} detail={confidence.detail} />
                  </p>
                </div>
              )}

              {/* Weight (preview) — hidden for MBI since it does not contribute
                  weight to the composite. */}
              {!isMbi && (
                <>
                  <div className="mt-3 rounded-md border border-dashed p-2" style={{ borderColor: BORDER }}>
                    <div className="mb-1 flex items-center justify-between text-[10px]" style={{ color: MUTED }}>
                      <span>Weight (preview)</span>
                      <span className="font-semibold tabular-nums" style={{ color: NAVY }}>
                        {Math.round(weight * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[Math.round(weight * 100)]}
                      min={5}
                      max={40}
                      step={1}
                      aria-label={`${meta.title} weight`}
                      onValueChange={(vals) => {
                        const pct = vals[0] / 100;
                        setWeights((w) => ({ ...w, [meta.key]: pct }));
                      }}
                    />
                  </div>
                  {score != null && (() => {
                    const contrib = score * weight;
                    const defaultContrib = score * DEFAULT_WEIGHTS[meta.key];
                    const delta = contrib - defaultContrib;
                    const showDelta = Math.abs(delta) >= 0.05;
                    return (
                      <div className="mt-1.5 flex items-center justify-between text-[10px]" style={{ color: MUTED }}>
                        <span>
                          Contributes <span className="font-semibold tabular-nums" style={{ color: NAVY }}>{contrib.toFixed(1)}</span> of 100 to MVS
                        </span>
                        {showDelta ? (
                          <span
                            className="font-semibold tabular-nums"
                            style={{ color: delta > 0 ? "#1d6b32" : "#a3142b" }}
                          >
                            {delta > 0 ? "+" : ""}{delta.toFixed(1)} vs default
                          </span>
                        ) : (
                          <span className="italic">drag to preview</span>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}





              <details className="mt-auto pt-3 text-[11px]">
                <summary
                  className="cursor-pointer font-semibold"
                  style={{ color: BLUE }}
                >
                  How this score is calculated
                </summary>
                <pre
                  className="mt-2 whitespace-pre-wrap rounded-md p-2 text-[11px] leading-snug"
                  style={{
                    backgroundColor: SOFT,
                    color: NAVY,
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                  }}
                >
                  {meta.formula}
                </pre>
              </details>

              <details className="pt-2 text-[11px]">
                <summary
                  className="cursor-pointer font-semibold"
                  style={{ color: BLUE }}
                >
                  Where the data comes from ({meta.sources.length})
                </summary>
                <ul className="mt-2 space-y-1.5 rounded-md p-2" style={{ backgroundColor: SOFT }}>
                  {meta.sources.map((src) => (
                    <li key={src.label} className="leading-snug">
                      <span
                        className="mr-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ backgroundColor: "#fff", color: BLUE, border: `1px solid ${BORDER}` }}
                      >
                        {src.label}
                      </span>
                      <span style={{ color: NAVY }}>{src.detail}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          );
        })}
      </section>

      {/* Known limitations — honest list of caveats built from the same
          signals already on the page (no extra fetch). Helps a new reader
          trust the numbers by naming what we do NOT know. */}
      {(() => {
        const items: string[] = [];
        const nNoPrice = nTotal - nWithPrice;
        const nNoCategory = nTotal - nWithCategory;
        // activeQaReasons / activeQaCount are computed at the top of the
        // component so the Known Limitations bullet, the QA pill in the Data
        // Sources strip, and the Limited Source Coverage badge all agree.

        if (activeQaCount > 0) {
          const reasonText =
            activeQaReasons.length > 0
              ? ` Reason breakdown: ${activeQaReasons.map((r) => `"${r.reason}" (${r.count})`).join(", ")}.`
              : "";
          items.push(
            `${activeQaCount} of ${nTotal} premium provider page${activeQaCount === 1 ? " is" : "s are"} flagged in the QA queue.${reasonText} A flagged provider may still contribute to scoring if price or category was scraped from another source.`,
          );
        }


        if (nNoPrice > 0 && nTotal > 0) {
          items.push(
            `${nNoPrice} of ${nTotal} premium provider${nTotal === 1 ? "" : "s"} had no readable weekly price; excluded from Pricing Acceptance.`,
          );
        }
        if (nNoCategory > 0 && nTotal > 0) {
          items.push(
            `${nNoCategory} of ${nTotal} premium provider${nTotal === 1 ? "" : "s"} were not classified into a category; excluded from Enrichment Diversity.`,
          );
        }
        if (watchlist.length === 0) {
          items.push("National operator watchlist is empty — Scaled Operator score may be unreliable.");
        }
        items.push("US Census ACS family/income data is from the 2023 5-year release; demographics may have shifted since.");
        items.push("Pricing uses each provider's lowest listed price as a single-week proxy (not a per-week average).");
        items.push("Market Absorption (week-by-week sellout) is intentionally excluded in v1.0-fixed; weights were redistributed across the 5 remaining pillars.");

        return (
          <section
            className="mb-6 rounded-lg border bg-white"
            style={{ borderColor: BORDER }}
          >
            <details>
              <summary
                className="cursor-pointer px-4 py-3 text-[13px] font-bold"
                style={{ color: NAVY }}
              >
                Known limitations ({items.length})
                <span className="ml-2 text-[11px] font-normal" style={{ color: MUTED }}>
                  What this score cannot tell you yet
                </span>
              </summary>
              <ul
                className="space-y-1.5 border-t px-4 py-3 text-[12px] leading-relaxed"
                style={{ borderColor: BORDER, color: NAVY }}
              >
                {items.map((it, i) => (
                  <li key={i} className="flex gap-2">
                    <span style={{ color: MUTED }}>•</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </details>
          </section>
        );
      })()}

      {/* National operators matched — Scaled Operator evidence */}
      <NationalOperatorsPanel providers={premiumProviders} watchlist={watchlist} />


      {/* Week-by-week activity panel removed June 24, 2026 with Market Absorption. */}

      {/* Premium provider table — live */}
      <section className="mb-6 rounded-lg border bg-white" style={{ borderColor: BORDER }}>
        <div
          className="flex items-center justify-between gap-2 border-b px-4 py-3"
          style={{ borderColor: BORDER }}
        >
          <div>
            <h3 className="text-[14px] font-bold" style={{ color: NAVY }}>
              Premium providers — live
            </h3>
            <p className="text-[11px]" style={{ color: MUTED }}>
              {premiumProviders.length} premium provider
              {premiumProviders.length === 1 ? "" : "s"} from{" "}
              <code className="rounded bg-[#f7faff] px-1 py-px text-[#174be8]">mvs_providers</code>. Source chips show which feed(s) each camp was discovered through; the link icon opens the original listing.
            </p>
          </div>
          <span
            className={CHIP}
            style={{ backgroundColor: "#e3f3e7", color: "#1d6b32" }}
          >
            Live
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ color: MUTED }}>
                <th className="px-4 py-2 text-left font-semibold">Provider</th>
                <th className="px-4 py-2 text-left font-semibold">Discovery source(s)</th>
                <th className="px-4 py-2 text-right font-semibold">$ min/wk</th>
                <th className="px-4 py-2 text-right font-semibold">$ max/wk</th>
                <th className="px-4 py-2 text-left font-semibold">Category</th>
                <th className="px-4 py-2 text-right font-semibold">Weeks</th>
              </tr>
            </thead>
            <tbody>
              {premiumProviders.map((p) => {
                const pweeks = weeks.filter((w) => w.provider_id === p.id);
                const listingHref = p.source_listing_url ?? p.website_url ?? p.url ?? null;
                const hasPrice = (p.price_min ?? null) != null;
                const hasCategory = !!(p as any).category_classified;
                const isClean = hasPrice && hasCategory;
                const dotColor = isClean ? "#1d6b32" : "#c97a00";
                const dotTitle = isClean
                  ? "Complete — has price and category"
                  : `Incomplete — missing ${!hasPrice ? "price" : ""}${!hasPrice && !hasCategory ? " and " : ""}${!hasCategory ? "category" : ""}`;
                return (
                  <tr
                    key={p.id}
                    className="border-t"
                    style={{ borderColor: BORDER }}
                  >
                    <td className="px-4 py-2.5 font-semibold" style={{ color: NAVY }}>
                      <span className="inline-flex items-center gap-2">
                        <span
                          aria-label={dotTitle}
                          title={dotTitle}
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: dotColor }}
                        />
                        {p.name}
                        <OpenSourceLink href={listingHref} />
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <ProviderSourceChips sources={p.sources} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: NAVY }}>
                      {p.price_min ? `$${p.price_min}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: NAVY }}>
                      {p.price_max ? `$${p.price_max}` : "—"}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: NAVY }}>
                      {p.category_classified ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: NAVY }}>
                      {pweeks.length}
                    </td>
                  </tr>
                );
              })}
              {premiumProviders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-[12px]" style={{ color: MUTED }}>
                    No premium providers classified yet. Run the pipeline (coming in Turn 5.2) to populate.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {premiumProviders.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-3 border-t px-4 py-2 text-[11px]"
            style={{ borderColor: BORDER, color: MUTED }}
          >
            <span className="font-semibold" style={{ color: NAVY }}>Row trust:</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#1d6b32" }} />
              Complete (price + category)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#c97a00" }} />
              Incomplete (missing price or category)
            </span>
            <span className="italic">QA-queue items are excluded from this table — see Known limitations.</span>
          </div>
        )}

      </section>

      {/* Excluded Locations — Strict Camp View drawer.
          Preserves audit visibility for daycares, public parks, free retail
          workshops, and charity drop-in clubs without inflating the headline
          camp counters or the catch-up scanner queue. */}
      <section className="mb-6 rounded-lg border bg-white" style={{ borderColor: BORDER }}>
        <button
          type="button"
          onClick={() => setShowExcluded((s) => !s)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        >
          <div>
            <h3 className="text-[14px] font-bold" style={{ color: NAVY }}>
              Excluded Locations ({excludedCount})
            </h3>
            <p className="text-[11px]" style={{ color: MUTED }}>
              Not counted as summer camps in headline numbers. Includes daycares, public parks, free retail workshops, and charity drop-in clubs. Raw rows are kept in <code className="rounded bg-[#f7faff] px-1 py-px text-[#174be8]">mvs_providers</code> for audit.
            </p>
          </div>
          <span
            className={CHIP}
            style={{ backgroundColor: "#eef2f7", color: "#526078" }}
          >
            {showExcluded ? "Hide" : "Show"}
          </span>
        </button>
        {showExcluded && (
          <div className="overflow-x-auto border-t" style={{ borderColor: BORDER }}>
            {excludedCount === 0 ? (
              <p className="px-4 py-6 text-center text-[12px]" style={{ color: MUTED }}>
                No excluded locations for this city.
              </p>
            ) : (
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ color: MUTED }}>
                    <th className="px-4 py-2 text-left font-semibold">Location</th>
                    <th className="px-4 py-2 text-left font-semibold">Why excluded</th>
                    <th className="px-4 py-2 text-left font-semibold">Source</th>
                    <th className="px-4 py-2 text-left font-semibold">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {excludedProviders.map(({ p, ex }) => {
                    const href = p.source_listing_url ?? p.website_url ?? p.url ?? null;
                    return (
                      <tr key={p.id} className="border-t" style={{ borderColor: BORDER }}>
                        <td className="px-4 py-2.5 font-semibold" style={{ color: NAVY }}>
                          <span className="inline-flex items-center gap-2">
                            {p.name}
                            <OpenSourceLink href={href} />
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={CHIP}
                            style={{ backgroundColor: "#eef2f7", color: "#526078" }}
                            title={ex.reason}
                          >
                            {ex.label}
                          </span>
                          <span className="ml-2 text-[11px]" style={{ color: MUTED }}>
                            {ex.reason}
                          </span>
                        </td>
                        <td className="px-4 py-2.5" style={{ color: MUTED }}>
                          {p.platform ?? "—"}
                        </td>
                        <td className="px-4 py-2.5" style={{ color: MUTED }}>
                          {p.category_classified ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>
    </>
  );
}
