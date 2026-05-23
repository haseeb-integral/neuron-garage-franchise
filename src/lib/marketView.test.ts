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
  it("clamps + rounds the raw composite into a branded CompositeScore", () => {
    expect(buildMarketView({ ...baseMarket, compositeScore: 82.6 }).composite).toBe(83);
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
    const c = unsafeAsCompositeScore(77.4);
    expect(c).toBe(77);
  });
});
