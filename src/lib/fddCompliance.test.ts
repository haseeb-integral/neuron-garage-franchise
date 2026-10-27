import { describe, expect, it } from "vitest";
import { daysRemaining, earliestSigningDate, signingTooEarly, stageRequiresFddWait } from "./fddCompliance";

describe("FDD signing-only waiting rule", () => {
  it("does not hold Immersion during the FDD wait", () => {
    expect(stageRequiresFddWait("immersion")).toBe(false);
  });

  it("does not hold Confirmation during the FDD wait", () => {
    expect(stageRequiresFddWait("confirmation")).toBe(false);
  });

  it("only checks the wait when entering Signing", () => {
    expect(stageRequiresFddWait("signing")).toBe(true);
    for (const stage of ["new_lead", "initial_qualification", "business_overview", "fdd_review", "disqualified"]) {
      expect(stageRequiresFddWait(stage)).toBe(false);
    }
  });

  it("blocks franchise signing before 16 days", () => {
    expect(signingTooEarly("2026-10-01T12:00:00", null, "2026-10-16T12:00:00")).toBe(true);
    expect(daysRemaining("2026-10-01T12:00:00", null, new Date(2026, 9, 16))).toBe(1);
  });

  it("allows franchise signing on day 16", () => {
    expect(signingTooEarly("2026-10-01T12:00:00", null, "2026-10-17T12:00:00")).toBe(false);
    expect(daysRemaining("2026-10-01T12:00:00", null, new Date(2026, 9, 17))).toBe(0);
  });

  it("keeps the clock based on the later FDD sent or received date", () => {
    expect(earliestSigningDate("2026-10-01T12:00:00", "2026-10-03T12:00:00")).toEqual(new Date(2026, 9, 19));
  });
});