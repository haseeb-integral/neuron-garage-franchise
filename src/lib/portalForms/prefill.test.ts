import { describe, it, expect } from "vitest";
import { buildPrefill, hiddenKnownKeys } from "./prefill";
import { getPortalForm } from "./logic";

const profile = { first_name: "Sam", last_name: "Reed", email: "old@x.com", phone: "111", street: "1 A St", city: "Austin", state: "TX", zip: "78701" };

describe("form prefill", () => {
  it("fills the first form from the pipeline record and account email", () => {
    const a = buildPrefill(getPortalForm("rfc")!, {}, profile, null, "me@x.com");
    expect(a).toMatchObject({ first_name: "Sam", last_name: "Reed", email: "me@x.com", cell: "111", street: "1 A St", city: "Austin", state: "TX", zip: "78701" });
  });
  it("later forms prefer answers fixed on the first form", () => {
    const a = buildPrefill(getPortalForm("item23")!, {}, profile, { last_name: "Reede", cell: "222", street: "9 B St" }, "me@x.com");
    expect(a).toMatchObject({ last_name: "Reede", phone: "222", street: "9 B St", first_name: "Sam" });
  });
  it("never overwrites what the prospect typed", () => {
    const a = buildPrefill(getPortalForm("item23")!, { phone: "999" }, profile, null, null);
    expect(a.phone).toBe("999");
  });
  it("facility city/state come from the camp market, not home", () => {
    const a = buildPrefill(getPortalForm("facility")!, {}, profile, { camp_city: "San Antonio", camp_state: "TX" }, null);
    expect(a.city).toBe("San Antonio");
  });
  it("hides name and email only on later forms, and only when known", () => {
    const bg = getPortalForm("bgcf")!;
    expect([...hiddenKnownKeys(bg, { first_name: "Sam", last_name: "Reed", email: "a@b.c" })].sort()).toEqual(["email", "first_name", "last_name"]);
    expect(hiddenKnownKeys(bg, { first_name: "Sam" }).has("last_name")).toBe(false);
    expect(hiddenKnownKeys(getPortalForm("rfc")!, { first_name: "Sam" }).size).toBe(0);
    expect(hiddenKnownKeys(getPortalForm("item23")!, { first_name: "Sam" }).size).toBe(0);
  });
});
