import { describe, it, expect } from "vitest";
import { stageToStep, stepState, stepProgress } from "./portalPath";

describe("portal path rules", () => {
  it("maps pipeline stages onto the 5 steps", () => {
    expect(stageToStep("new_lead")).toBe(1);
    expect(stageToStep("initial_qual")).toBe(1);
    expect(stageToStep("business_overview")).toBe(2);
    expect(stageToStep("fdd_review")).toBe(2);
    expect(stageToStep("immersion")).toBe(3);
    expect(stageToStep("confirmation")).toBe(4);
    expect(stageToStep("signing")).toBe(5);
    expect(stageToStep("disqualified")).toBeNull();
  });
  it("later steps stay locked", () => {
    expect(stepState(1, 2)).toBe("done");
    expect(stepState(2, 2)).toBe("current");
    expect(stepState(3, 2)).toBe("locked");
  });
  it("counts ticks for the badge", () => {
    expect(stepProgress(2, ["item23", "personality", "rfc"])).toEqual({ done: 2, total: 4 });
  });
});

import { itemDueDate, PORTAL_STEPS as STEPS2 } from "./portalPath";
describe("homework due dates", () => {
  it("Request for Consideration is due 1 day before the call", () => {
    const rfc = STEPS2[0].items.find((i) => i.key === "rfc")!;
    expect(itemDueDate("2026-11-10T15:00:00Z", rfc.dueDaysBefore)!.toISOString().slice(0, 10)).toBe("2026-11-09");
  });
  it("Background form is due 5 days before, facility form 2 days before", () => {
    expect(STEPS2[1].items.find((i) => i.key === "bg_credit_funding")!.dueDaysBefore).toBe(5);
    expect(STEPS2[2].items.find((i) => i.key === "facility_form")!.dueDaysBefore).toBe(2);
  });
  it("no call booked means no date", () => {
    expect(itemDueDate(null, 1)).toBeNull();
  });
});
