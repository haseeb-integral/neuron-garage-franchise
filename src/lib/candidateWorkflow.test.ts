import { describe, expect, it } from "vitest";
import { candidatePanelId, nextProcessStage } from "./candidateWorkflow";

describe("process advancement", () => {
  it("moves Step 1 to Business Overview", () => expect(nextProcessStage(1, "initial_qual")).toBe("business_overview"));
  it("moves Step 2 directly to Immersion, not the retired FDD column", () => expect(nextProcessStage(2, "business_overview")).toBe("immersion"));
  it("moves Step 3 to Confirmation", () => expect(nextProcessStage(3, "immersion")).toBe("confirmation"));
  it("moves Step 4 to Signing through the existing signing guard", () => expect(nextProcessStage(4, "confirmation")).toBe("signing"));
  it("cannot skip ahead using a future step", () => expect(nextProcessStage(4, "initial_qual")).toBeNull());
  it("does not move back from a completed step", () => expect(nextProcessStage(1, "immersion")).toBeNull());
  it("does not advance Signing or disqualified prospects", () => { expect(nextProcessStage(5, "signing")).toBeNull(); expect(nextProcessStage(2, "disqualified")).toBeNull(); });
  it("remembers the stable database ID instead of the reload-dependent row number", () => expect(candidatePanelId({ id: 7, dbId: "candidate-uuid" })).toBe("candidate-uuid"));
});