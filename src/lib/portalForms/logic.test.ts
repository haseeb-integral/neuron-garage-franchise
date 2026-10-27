import { describe, it, expect } from "vitest";
import { RFC_FORM } from "./rfc";
import { missingRequired, formProgress, signatureMatches } from "./logic";

describe("portal form rules", () => {
  it("optional boxes like Preferred Name are not required", () => {
    expect(missingRequired(RFC_FORM, {}).some((m) => m.label === "Preferred Name")).toBe(false);
  });
  it("the 'please explain' box becomes required only after a yes", () => {
    const has = (a: Record<string, unknown>) => missingRequired(RFC_FORM, a).some((m) => m.label.startsWith("If you answered yes"));
    expect(has({ felony: "No" })).toBe(false);
    expect(has({ felony: "Yes" })).toBe(true);
  });
  it("all three references are required", () => {
    const refs = missingRequired(RFC_FORM, {}).filter((m) => m.label.startsWith("Reference"));
    expect(refs.some((m) => m.label.startsWith("Reference 3"))).toBe(true);
  });
  it("an empty form is 0% done", () => {
    expect(formProgress(RFC_FORM, {})).toBe(0);
  });
  it("signature must match first and last name", () => {
    expect(signatureMatches("Sam  Reed", "Sam", "Reed")).toBe(true);
    expect(signatureMatches("Samuel J. Reed", "Samuel", "Reed")).toBe(true);
    expect(signatureMatches("Sam", "Sam", "Reed")).toBe(false);
    expect(signatureMatches("John Smith", "Sam", "Reed")).toBe(false);
  });
});
