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
