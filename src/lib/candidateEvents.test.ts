import { describe, expect, it } from "vitest";
import { processCallStartsAt } from "./candidateEvents";

describe("processCallStartsAt", () => {
  it("uses daylight-saving time for US zones", () => {
    expect(processCallStartsAt("2026-07-15", "09:00", "ET (Eastern)")).toBe("2026-07-15T13:00:00.000Z");
    expect(processCallStartsAt("2026-01-15", "09:00", "ET (Eastern)")).toBe("2026-01-15T14:00:00.000Z");
  });

  it("supports all six choices", () => {
    expect(processCallStartsAt("2026-07-15", "09:00", "CT (Central)")).toBe("2026-07-15T14:00:00.000Z");
    expect(processCallStartsAt("2026-07-15", "09:00", "MT (Mountain)")).toBe("2026-07-15T15:00:00.000Z");
    expect(processCallStartsAt("2026-07-15", "09:00", "PT (Pacific)")).toBe("2026-07-15T16:00:00.000Z");
    expect(processCallStartsAt("2026-07-15", "09:00", "AKT (Alaska)")).toBe("2026-07-15T17:00:00.000Z");
    expect(processCallStartsAt("2026-07-15", "09:00", "HT (Hawaii)")).toBe("2026-07-15T19:00:00.000Z");
  });

  it("rejects a skipped daylight-saving time", () => {
    expect(() => processCallStartsAt("2026-03-08", "02:30", "ET (Eastern)")).toThrow(
      "does not exist",
    );
  });
});