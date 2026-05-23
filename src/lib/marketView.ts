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

// Only this file may mint a CompositeScore. If you find yourself calling this
// outside src/lib/marketView.ts, stop — you're recreating the bug.
function mintCompositeScore(raw: unknown): CompositeScore {
  const n = Number(raw);
  const safe = Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
  return safe as CompositeScore;
}

// ─── Market view ──────────────────────────────────────────────────────────
// One object per market per render. Everything the UI needs, frozen.
export type MarketView = Readonly<{
  cityId: string | null;
  city: string;
  state: string;
  composite: CompositeScore;        // ← the ONLY composite any UI should read
  compositeFormatted: string;       // "82" or "—"
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
