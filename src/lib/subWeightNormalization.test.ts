import { describe, it, expect } from "vitest";
import {
  sumEnabledWeights,
  normalizeToHundred,
  equalSplit,
  hasPendingEdits,
  effectivePct,
} from "./subWeightNormalization";
import type { SowMetricEntry } from "./sowMetricRegistry";

const m = (key: string, enabled = true): SowMetricEntry =>
  ({ key, label: key, enabled, status: "live", description: "", weight: 0 } as unknown as SowMetricEntry);

describe("subWeightNormalization", () => {
  const metrics = [m("a"), m("b"), m("c", false)];

  it("sumEnabledWeights sums only enabled built-ins + customs", () => {
    expect(sumEnabledWeights(metrics, { a: 10, b: 20, c: 99 }, [{ weight: 5 }])).toBe(35);
  });

  it("normalizeToHundred yields shares summing to 100 when there is weight", () => {
    const out = normalizeToHundred(metrics, { a: 10, b: 30, c: 99 }, 40);
    expect(out.a).toBeCloseTo(25);
    expect(out.b).toBeCloseTo(75);
    expect(out.c).toBe(0);
  });

  it("normalizeToHundred yields all zeros when enabledSum is 0", () => {
    const out = normalizeToHundred(metrics, { a: 0, b: 0, c: 0 }, 0);
    expect(out.a).toBe(0);
    expect(out.b).toBe(0);
    expect(out.c).toBe(0);
  });

  it("equalSplit divides 100 across enabled metrics only", () => {
    const out = equalSplit(metrics);
    expect(out.a).toBe(50);
    expect(out.b).toBe(50);
    expect(out.c).toBe(0);
  });

  it("hasPendingEdits detects drift > 0.05% from applied", () => {
    const applied = { a: 50, b: 50, c: 0 };
    expect(hasPendingEdits(metrics, { a: 10, b: 30, c: 0 }, 40, applied)).toBe(true);
    expect(hasPendingEdits(metrics, { a: 20, b: 20, c: 0 }, 40, applied)).toBe(false);
  });

  it("effectivePct returns null for disabled or zero sum", () => {
    expect(effectivePct(10, false, 40)).toBeNull();
    expect(effectivePct(10, true, 0)).toBeNull();
    expect(effectivePct(10, true, 40)).toBe(25);
  });
});
