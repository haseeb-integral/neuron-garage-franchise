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

import { itemDueDate, homeworkSummary, PORTAL_STEPS as STEPS2 } from "./portalPath";
describe("homework due dates", () => {
  it("Request for Consideration is due 1 day before the call", () => {
    const rfc = STEPS2[0]?.items.find((i) => i.key === "rfc");
    expect(rfc?.dueDaysBefore).toBe(1);
    expect(itemDueDate("2026-11-10T15:00:00Z", rfc?.dueDaysBefore, "UTC")?.toISOString().slice(0, 10)).toBe("2026-11-09");
  });
  it("Background form is due 5 days before", () => {
    const days = STEPS2[1]?.items.find((i) => i.key === "bg_credit_funding")?.dueDaysBefore;
    expect(days).toBe(5);
    expect(itemDueDate("2026-11-10T15:00:00Z", days, "UTC")?.toISOString()).toBe("2026-11-05T15:00:00.000Z");
  });
  it("Facility form is due 2 days before", () => {
    const days = STEPS2[2]?.items.find((i) => i.key === "facility_form")?.dueDaysBefore;
    expect(days).toBe(2);
    expect(itemDueDate("2026-11-10T15:00:00Z", days, "UTC")?.toISOString()).toBe("2026-11-08T15:00:00.000Z");
  });
  it("no call booked means no date", () => {
    expect(itemDueDate(null, 1)).toBeNull();
  });
  it("keeps the local call time across Denver daylight saving", () => {
    expect(itemDueDate("2026-11-02T17:00:00Z", 2, "America/Denver")?.toISOString()).toBe("2026-10-31T16:00:00.000Z");
  });
  it("uses the prospect's local date near UTC midnight", () => {
    const due = itemDueDate("2026-11-10T01:00:00Z", 1, "America/Denver");
    expect(due?.toLocaleDateString("en-US", { timeZone: "America/Denver" })).toBe("11/8/2026");
  });
  it("shows 75 percent with one late unfinished item", () => {
    const items = STEPS2[1]?.items ?? [];
    expect(homeworkSummary(items, ["fdd_attorney", "item23", "personality"], "2026-11-10T15:00:00Z", new Date("2026-11-06T15:00:00Z"), "UTC")).toEqual({ percent: 75, overdue: true });
  });
  it("completed homework and items without deadlines never become overdue", () => {
    expect(homeworkSummary([{ key: "rfc", dueDaysBefore: 1 }, { key: "welcome", noDue: true }], ["rfc"], "2026-11-10T15:00:00Z", new Date("2026-11-12T15:00:00Z"), "UTC").overdue).toBe(false);
  });
  it("no booked call or invalid date cannot flag homework overdue", () => {
    expect(itemDueDate("invalid", 1)).toBeNull();
    expect(homeworkSummary([{ key: "rfc", dueDaysBefore: 1 }], [], null).overdue).toBe(false);
  });
});
