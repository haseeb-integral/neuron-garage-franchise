// Phase 7 destructive test (offline version): prove the drift detector
// actually fires when two different composites are minted for the same
// (cityId, weightsHash) in one render pass, and stays silent otherwise.
//
// This is the unit-test replacement for the browser-based "hardcode a wrong
// composite in CityScoring.tsx and watch the console" check. If this suite
// ever goes red, the May 23 guard rail is broken — treat as P0.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertNoCompositeDrift,
  beginDriftRender,
  buildMarketView,
  unsafeAsCompositeScore,
  weightsHash,
} from "./marketView";

const baseMarket = {
  cityId: "city-honolulu",
  city: "Urban Honolulu",
  state: "Hawaii",
  compositeScore: 82,
  tier: "A" as const,
  hasLiveData: true,
  population: 350_000,
  competitorCount: 12,
};

describe("buildMarketView", () => {
  it("clamps + applies display calibration into a branded CompositeScore", () => {
    // New anchors (2026-07-12): [80,95] → [93,100]. Raw 82.6 lands at 96.
    expect(buildMarketView({ ...baseMarket, compositeScore: 82.6 }).composite).toBe(96);
    expect(buildMarketView({ ...baseMarket, compositeScore: -5 }).composite).toBe(0);
    expect(buildMarketView({ ...baseMarket, compositeScore: 250 }).composite).toBe(100);
    expect(buildMarketView({ ...baseMarket, compositeScore: NaN }).composite).toBe(0);
  });

  it("formats composite as em-dash when the market has no live data", () => {
    const view = buildMarketView({
      ...baseMarket,
      compositeScore: 0,
      hasLiveData: false,
      lastScrapedAt: null,
    });
    expect(view.compositeFormatted).toBe("—");
    expect(view.tierFormatted).toBe("—");
  });

  it("freezes the view so consumers cannot mutate displayed numbers in place", () => {
    const view = buildMarketView(baseMarket);
    expect(Object.isFrozen(view)).toBe(true);
  });

  it("two builds with the same inputs produce equal composites (idempotent)", () => {
    const a = buildMarketView(baseMarket);
    const b = buildMarketView({ ...baseMarket });
    expect(a.composite).toBe(b.composite);
    expect(a.compositeFormatted).toBe(b.compositeFormatted);
  });
});

describe("assertNoCompositeDrift", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Vitest sets import.meta.env.DEV = true by default, so the guard rail is live.
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    beginDriftRender();
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("stays silent when the same market mints the same composite twice in one render", () => {
    const wHash = weightsHash({ a: 1 }, { a: { x: 1 } });
    const v1 = assertNoCompositeDrift(buildMarketView(baseMarket), wHash);
    const v2 = assertNoCompositeDrift(buildMarketView(baseMarket), wHash);
    expect(v1.composite).toBe(v2.composite);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("FIRES a red console.error when two different composites collide on the same key", () => {
    const wHash = weightsHash({ a: 1 }, { a: { x: 1 } });
    assertNoCompositeDrift(buildMarketView(baseMarket), wHash);
    // Simulate a rogue component computing its own composite under the same key.
    assertNoCompositeDrift(buildMarketView({ ...baseMarket, compositeScore: 23 }), wHash);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const msg = String(errorSpy.mock.calls[0][0]);
    expect(msg).toMatch(/COMPOSITE DRIFT/);
    expect(msg).toMatch(/Urban Honolulu/);
  });

  it("does NOT fire when the weights legitimately change (different wHash → different render context)", () => {
    const wHashA = weightsHash({ a: 1 }, {});
    const wHashB = weightsHash({ a: 2 }, {});
    assertNoCompositeDrift(buildMarketView(baseMarket), wHashA);
    assertNoCompositeDrift(buildMarketView({ ...baseMarket, compositeScore: 23 }), wHashB);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("resets between render passes (no false positives across renders)", () => {
    const wHash = weightsHash({ a: 1 }, {});
    assertNoCompositeDrift(buildMarketView(baseMarket), wHash);
    beginDriftRender();
    assertNoCompositeDrift(buildMarketView({ ...baseMarket, compositeScore: 23 }), wHash);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe("brand", () => {
  it("unsafeAsCompositeScore is the only other path to a CompositeScore", () => {
    // Raw 77.4 lands between anchors 74→100 and 100→100, calibrated to 100.
    const c = unsafeAsCompositeScore(77.4);
    expect(c).toBe(100);
  });
});

// ── Phase 3 (offline): simulate every wired surface rendering the same market
// in one render pass and prove they all agree on the number. This is the
// unit-test equivalent of opening /city-scoring and eyeballing the table,
// gauge, map tooltip, spreadsheet, nearby panel, detail drawer, compare modal,
// global search, and find-prospects modal to confirm they show the same score.
describe("Phase 3 — cross-surface render agreement", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    beginDriftRender();
  });
  afterEach(() => errorSpy.mockRestore());

  const SURFACES = [
    "RankedMarkets", "Gauge", "Dashboard", "MarketsMap", "Spreadsheet",
    "NearbyPanel", "MarketDetailDrawer", "CompareModal", "MarketCompareModal",
    "GlobalSearch", "FindProspectsModal", "RankedListInner",
  ];

  it("all 12 wired surfaces mint the SAME composite for the same market+weights", () => {
    const wHash = weightsHash({ economic: 25, talent: 25 }, { economic: { gdp: 1 } });
    const composites = SURFACES.map(() =>
      assertNoCompositeDrift(buildMarketView(baseMarket), wHash).composite,
    );
    expect(new Set(composites).size).toBe(1);
    // Raw 82 calibrated → 100 (anchor 74→100, 100→100).
    expect(composites[0]).toBe(100);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("if ONE surface goes rogue (computes its own number) the drift detector catches it", () => {
    const wHash = weightsHash({ x: 1 }, {});
    // 11 good surfaces, 1 rogue
    SURFACES.slice(0, 11).forEach(() =>
      assertNoCompositeDrift(buildMarketView(baseMarket), wHash),
    );
    assertNoCompositeDrift(
      buildMarketView({ ...baseMarket, compositeScore: 23 }), // ← the May 23 bug
      wHash,
    );
    expect(errorSpy).toHaveBeenCalledTimes(1);
    // Raw 82→100, raw 23→44 after calibration. Drift detector reports both.
    expect(String(errorSpy.mock.calls[0][0])).toMatch(/100.*44|44.*100/);
  });
});

// ── Phase 6 (offline): regression fuzz — feed varied/edge-case market shapes
// through the selector and assert invariants hold for every one. Replaces
// clicking through dozens of markets in the live UI.
describe("Phase 6 — regression fuzz across market shapes", () => {
  const shapes = [
    { cityId: "a", city: "Aaa", state: "CA", compositeScore: 0, hasLiveData: false },
    { cityId: "b", city: "Bbb", state: "TX", compositeScore: 100, hasLiveData: true, tier: "A" as const },
    { cityId: "c", city: "Ccc", state: "FL", compositeScore: 49.5, hasLiveData: true, tier: "C" as const },
    { cityId: "d", city: "Ddd", state: "NY", compositeScore: 50.5, hasLiveData: true, tier: "C" as const },
    { cityId: "e", city: "Eee", state: "WA", compositeScore: null, hasLiveData: false },
    { cityId: "f", city: "Fff", state: "OR", compositeScore: undefined as unknown as number, hasLiveData: true, lastScrapedAt: "2026-05-22" },
    { cityId: "g", city: "Ggg", state: "CO", compositeScore: 999, hasLiveData: true },
    { cityId: "h", city: "Hhh", state: "AZ", compositeScore: -10, hasLiveData: true },
    { cityId: "i", city: "Iii", state: "NV", compositeScore: NaN, hasLiveData: true },
    { cityId: "j", city: "Jjj", state: "ID", compositeScore: 73, hasLiveData: true, tier: null },
    // missing cityId — selector must still produce a safe view
    { cityId: null, city: "Kkk", state: "MT", compositeScore: 42, hasLiveData: true },
    // empty strings
    { cityId: "l", city: "", state: "", compositeScore: 10, hasLiveData: true },
  ];

  it.each(shapes)("invariants hold for %j", (m) => {
    const v = buildMarketView(m);
    // composite ∈ [0,100], integer
    expect(v.composite).toBeGreaterThanOrEqual(0);
    expect(v.composite).toBeLessThanOrEqual(100);
    expect(Number.isInteger(v.composite)).toBe(true);
    // formatted string is either "—" or matches composite exactly (no rounding drift)
    if (v.compositeFormatted !== "—") {
      expect(v.compositeFormatted).toBe(String(v.composite));
    }
    // tier formatting is "—" iff no live data or no tier
    if (!v.hasLiveData || !v.tier) expect(v.tierFormatted).toBe("—");
    // frozen
    expect(Object.isFrozen(v)).toBe(true);
  });

  it("idempotency holds across the entire shape sweep", () => {
    for (const m of shapes) {
      const a = buildMarketView(m).composite;
      const b = buildMarketView({ ...m }).composite;
      expect(a).toBe(b);
    }
  });
});
