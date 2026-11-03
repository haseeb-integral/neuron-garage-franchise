import { describe, it, expect } from "vitest";
import { applyZipPlace, lookupZip } from "./zipLookup";
describe("RFC ZIP lookup", () => {
  it("fills city/state from a ZIP and preserves leading zeroes", async () => {
    expect(await lookupZip("02108")).toEqual({ city: "Boston", state: "MA" });
    expect(await lookupZip("78205")).toEqual({ city: "San Antonio", state: "TX" });
  });
  it("supports ZIP+4 and leaves unknown ZIPs editable", async () => {
    expect(await lookupZip("02108-1234")).toEqual({ city: "Boston", state: "MA" });
    expect(await lookupZip("00000")).toBeNull();
    expect(await lookupZip("021")).toBeNull();
  });
  it("market ZIP never changes the home address", () => {
    const answers = { city: "Denver", state: "CO" };
    expect(applyZipPlace(answers, "camp_zip", "78205", { city: "San Antonio", state: "TX" })).toEqual({ ...answers, camp_zip: "78205", camp_city: "San Antonio", camp_state: "TX" });
    expect(applyZipPlace(answers, "zip", "00000", null)).toEqual({ ...answers, zip: "00000" });
  });
});