// ============================================================================
// marketView.ts — SINGLE SOURCE OF TRUTH for every number displayed for a market.
// ============================================================================
//
// Background (May 23, 2026 incident): the right-panel gauge was showing
// composites in the teens while the table showed 80s for the same market.
// Root cause: two different formulas computing "Score" in two different files.
//
// Permanent fix: any UI that displays a per-market number reads from a
// MarketView built here. Components MUST NOT compute, re-derive, or round
// composite scores themselves. The branded `CompositeScore` type enforces this
// at compile time — only `mintCompositeScore()` (this file) can produce one.
//
// Layers:
//   1. buildMarketView()    — the selector. Returns a frozen view for one market.
//   2. CompositeScore brand — TS refuses raw `number` where CompositeScore expected.
//   3. assertNoCompositeDrift() — dev-only runtime guard. Throws if the same
//      (cityId, weightsHash) produces two different composites in one render.
//   4. weightsHash()        — stable hash of master+sub weights for drift keys.
//
// See AGENTS.md Core rule: "Any number rendered to a user comes from
// marketView selectors. Components never compute, never re-derive, never round
// in JSX. Violations are bugs, not stylistic preferences."
// ============================================================================

import type { TierLetter } from "@/lib/cityTiers";

// ─── Branded type ──────────────────────────────────────────────────────────
// A CompositeScore is a number that has passed through the selector. The
// `unique symbol` brand means structural typing can't substitute a raw number.
declare const __compositeBrand: unique symbol;
export type CompositeScore = number & { readonly [__compositeBrand]: "CompositeScore" };

// ─── Display calibration ──────────────────────────────────────────────────
// The raw composite is the weighted sum of 46 normalized inputs. In practice
// the strongest U.S. metros land in the 60s–70s (current observed max ≈ 74,
// median ≈ 41). Showing a Tier A city "63" reads as a C-/D+ to non-technical
// users — Sam and Kaylie's teachers see the number and silently discount the
// market. This is a UI calibration problem, not a math problem.
//
// Fix: a strictly-increasing piecewise-linear curve maps the raw composite
// into the intuitive school-grade range. Properties we rely on:
//   • Monotonic   → relative ordering of cities is preserved exactly.
//   • Anchored at 0 and 100 → the scale still claims "/100".
//   • Tier-safe   → tiers come from rank percentile (cityTiers.ts), so
//                   percentile membership (A/B/C/D) is unchanged.
//   • Pure        → same input → same output, so the drift detector still works.
// Only this file applies the curve, and it is applied at mint time so every
// MarketView consumer sees the same calibrated number with zero per-component
// risk. Raw composite_score_default in the DB is NOT modified.
//
// Anchors re-tuned 2026-07-12 (Brett+Haseeb) AFTER the TAM Teachers 3-metric
// rebuild widened the raw composite ceiling from 74 → 93. The old top anchor
// (raw 74 → 100) had every strong city saturating at a tied 100, which killed
// visual spread among Nashville/Louisville/Honolulu/Chicago/etc. The new
// anchors keep the tier boundaries (Tier A ≥ 90, Tier B ≥ 80, Tier C ≥ 70)
// but stretch the top so cities from raw 70–93 span display 90–100 with real
// differentiation.
//
// Post-rebuild raw distribution (composite, n≈935 scored cities):
//   min 10 · p50 38 · p80 55 · p95 70 · p99 81 · max 93
//
// New anchors:
//   raw  0 → 0
//   raw 20 → 40
//   raw 35 → 60
//   raw 41 → 70    ← Tier C boundary (unchanged, at raw median)
//   raw 55 → 80    ← Tier B boundary (was raw 50 → 80; now at p80)
//   raw 70 → 90    ← Tier A boundary (was raw 59 → 90; now at p95)
//   raw 80 → 95    ← NEW mid-A anchor for top-end spread
//   raw 93 → 100   (top of observed raw composite pins to perfect 100)
//   raw 100 → 100
// Change these anchors only after Brett/Haseeb sign off; ordering stays
// invariant as long as the sequence is strictly increasing in both axes.
export const CALIBRATION_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [20, 40],
  [35, 60],
  [41, 70],
  [55, 80],
  [70, 90],
  [80, 95],
  [93, 100],
  [100, 100],
];

export function calibrateCompositeForDisplay(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  const r = Math.max(0, Math.min(100, raw));
  for (let i = 1; i < CALIBRATION_ANCHORS.length; i += 1) {
    const [x0, y0] = CALIBRATION_ANCHORS[i - 1];
    const [x1, y1] = CALIBRATION_ANCHORS[i];
    if (r <= x1) {
      const t = x1 === x0 ? 0 : (r - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return 100;
}

// Only this file may mint a CompositeScore. If you find yourself calling this
// outside src/lib/marketView.ts, stop — you're recreating the bug.
function mintCompositeScore(raw: unknown): CompositeScore {
  const n = Number(raw);
  const clamped = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  const displayed = calibrateCompositeForDisplay(clamped);
  return Math.round(displayed) as CompositeScore;
}


// ─── Pillar display calibration ────────────────────────────────────────────
// The same monotonic curve, exposed for the 3 pillar scores (Demand, TAM
// Teachers, Competitive Opportunity). DISPLAY ONLY — never feed the result
// back into composite math (categoryScores stay raw so the client-side
// recompute matches the server composite).
export function calibratePillarForDisplay(raw: number | null | undefined): number | null {
  if (raw == null || !Number.isFinite(Number(raw))) return null;
  return Math.round(calibrateCompositeForDisplay(Number(raw)));
}

// ─── Branded pillar display scores ─────────────────────────────────────────
// Same pattern as CompositeScore: only `buildPillarView()` can mint a
// PillarDisplayScore, so a raw 0-74 number cannot be passed to UI props
// expecting the calibrated school-grade value. Catches the May 24 bug
// (raw pillar in the dashboard, calibrated in the spreadsheet) at compile
// time instead of in production.
declare const __pillarBrand: unique symbol;
export type PillarDisplayScore = number & { readonly [__pillarBrand]: "PillarDisplayScore" };

export type PillarKey = "demand" | "franchiseeSupply" | "competitiveLandscape";

export type PillarView = Readonly<{
  raw: number | null;             // Pre-calibration (used in composite math)
  display: PillarDisplayScore | null; // School-grade 0-100 (used in UI only)
  displayFormatted: string;       // "86" or "—"
}>;

export type PillarsView = Readonly<Record<PillarKey, PillarView>>;

function mintPillar(raw: number | null | undefined): PillarView {
  if (raw == null || !Number.isFinite(Number(raw))) {
    return Object.freeze({ raw: null, display: null, displayFormatted: "—" });
  }
  const r = Number(raw);
  const display = Math.round(calibrateCompositeForDisplay(r)) as PillarDisplayScore;
  return Object.freeze({ raw: r, display, displayFormatted: String(display) });
}

export function buildPillarView(
  categoryScores: Partial<Record<PillarKey, number | null>> | null | undefined,
): PillarsView {
  const cs = categoryScores ?? {};
  return Object.freeze({
    demand: mintPillar(cs.demand),
    franchiseeSupply: mintPillar(cs.franchiseeSupply),
    competitiveLandscape: mintPillar(cs.competitiveLandscape),
  });
}

// ─── Competitive Opportunity helper ────────────────────────────────────────
// CSI (Competitive Saturation Index) has been refactored (2026-07-07,
// Brett-approved). The old formula divided a supply term — real national
// brand counts PLUS an enrollment×0.003 "local provider" guess — by a demand
// denominator (enrollment × income/65k). Two problems, per Sam:
//   1. The local-provider guess averaged ~72% of total supply and drowned
//      the real counted competitors it was supposed to supplement.
//   2. The demand denominator duplicated the Demand pillar, so city size
//      and income were counted twice in the final ranking.
// The new raw supply is real counted competition only:
//     csi_raw_supply = (STEM brand locations × 2.0) + (general brand × 1.0)
// This is already stored pre-weighted in the DB column
// `csi_national_brand_count_weighted` and mirrored into `csi_raw_supply`.
// `score_csi` (0–100, higher = more saturated) is now the percentile rank
// of csi_raw_supply across all cities in the DB. This helper flips it into
// the friendly "Competitive Opportunity" pillar (higher = better). Every UI
// surface MUST go through this helper — never inline `100 - score_csi`.
export const CSI_STEM_WEIGHT = 2.0;
export const CSI_GENERAL_WEIGHT = 1.0;
export function competitiveOpportunityFromCsi(csi: number | null | undefined): number | null {
  if (csi == null || !Number.isFinite(Number(csi))) return null;
  const v = 100 - Number(csi);
  return Math.max(0, Math.min(100, v));
}


// ─── Market view ──────────────────────────────────────────────────────────
// One object per market per render. Everything the UI needs, frozen.
//
// Naming convention (locked May 24, 2026):
//   • Weighted Composite Index = the RAW math result (used for sort/tier).
//     Exposed as `rawComposite` / `rawCompositeFormatted`.
//   • Total Score              = the CALIBRATED display number (school-grade
//     scale). Exposed as `composite` / `compositeFormatted`.
// Both are shown side-by-side in popovers, drawers, and CSV exports so the
// user can audit the calibration at any time. They are the same underlying
// truth on two different scales (like Celsius vs. Fahrenheit).
export type MarketView = Readonly<{
  cityId: string | null;
  city: string;
  state: string;
  composite: CompositeScore;        // Total Score (calibrated) — the ONLY composite any UI should read
  compositeFormatted: string;       // "91" or "—"
  rawComposite: number;             // Weighted Composite Index (pre-calibration)
  rawCompositeFormatted: string;    // "63" or "—"
  tier: TierLetter | null;
  tierFormatted: string;            // "A" or "—"
  hasLiveData: boolean;
  population: number | null;
  competitorCount: number | null;
}>;

type MarketLike = {
  city?: string | null;
  state?: string | null;
  cityId?: string | null;
  compositeScore?: number | null;
  tier?: TierLetter | null | string;
  hasLiveData?: boolean | null;
  population?: number | null;
  competitorCount?: number | null;
  lastScrapedAt?: string | null;
};

export function buildMarketView(market: MarketLike): MarketView {
  const rawN = Number(market.compositeScore ?? 0);
  const rawClamped = Number.isFinite(rawN) ? Math.max(0, Math.min(100, rawN)) : 0;
  const rawComposite = Math.round(rawClamped);
  const composite = mintCompositeScore(market.compositeScore ?? 0);
  const hasLiveData =
    market.hasLiveData === true ||
    composite > 0 ||
    !!market.lastScrapedAt;
  const tier = (market.tier as TierLetter | null | undefined) ?? null;

  return Object.freeze({
    cityId: market.cityId ?? null,
    city: String(market.city ?? ""),
    state: String(market.state ?? ""),
    composite,
    compositeFormatted: hasLiveData ? String(composite) : "—",
    rawComposite,
    rawCompositeFormatted: hasLiveData ? String(rawComposite) : "—",
    tier: tier ?? null,
    tierFormatted: tier && hasLiveData ? String(tier) : "—",
    hasLiveData,
    population:
      market.population != null && Number.isFinite(Number(market.population))
        ? Number(market.population)
        : null,
    competitorCount:
      market.competitorCount != null && Number.isFinite(Number(market.competitorCount))
        ? Number(market.competitorCount)
        : null,
  });
}


// ─── Weights hash ──────────────────────────────────────────────────────────
// Stable, cheap hash of applied master + sub weights. Used to key the drift
// detector — two renders with the same weights+market must yield the same
// composite. Different weights legitimately produce different composites.
export function weightsHash(
  appliedWeights: Record<string, number> | undefined,
  appliedSubWeights: Record<string, Record<string, number>> | undefined,
): string {
  try {
    return JSON.stringify([appliedWeights ?? {}, appliedSubWeights ?? {}]);
  } catch {
    return "unhashable";
  }
}

// ─── Drift assertion (dev-only) ────────────────────────────────────────────
// In dev, every minted composite is logged under (cityId, weightsHash). If the
// same key is logged with two different composites in the same render pass,
// a loud console.error fires. Production: no-op, zero cost.
//
// Pass-through design: takes a MarketView, asserts, returns it unchanged so
// callers can wrap inline:  const view = assertNoCompositeDrift(buildMarketView(m), wh)

const driftMap = new Map<string, number>();
let driftRenderToken = 0;
let driftRenderTokenSeen = -1;

export function beginDriftRender(): void {
  if (!import.meta.env.DEV) return;
  driftRenderToken += 1;
}

export function assertNoCompositeDrift(
  view: MarketView,
  wHash: string,
): MarketView {
  if (!import.meta.env.DEV) return view;
  if (!view.cityId) return view;

  // Reset the map at the start of each render pass.
  if (driftRenderTokenSeen !== driftRenderToken) {
    driftMap.clear();
    driftRenderTokenSeen = driftRenderToken;
  }

  const key = `${view.cityId}::${wHash}`;
  const prev = driftMap.get(key);
  if (prev != null && prev !== view.composite) {
    // eslint-disable-next-line no-console
    console.error(
      `[marketView] COMPOSITE DRIFT for ${view.city}, ${view.state} ` +
        `(cityId=${view.cityId}). Same weights produced two scores in one render: ` +
        `${prev} → ${view.composite}. Some component is computing its own composite ` +
        `instead of reading from marketView. This is the bug from May 23 — fix it now.`,
    );
  } else {
    driftMap.set(key, view.composite);
  }
  return view;
}

// ─── Escape hatch for legacy reads ─────────────────────────────────────────
// Where we have a raw number from the database that we KNOW is the canonical
// composite (e.g. server-stored composite_score_default before reweighting),
// use this to convert it into the branded type explicitly. This is the only
// other path to a CompositeScore and exists because the migration is gradual.
// New code should call buildMarketView() instead.
export function unsafeAsCompositeScore(n: number): CompositeScore {
  return mintCompositeScore(n);
}
