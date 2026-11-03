import { describe, it, expect } from "vitest";
import { RFC_FORM } from "./rfc";
import { REFERENCES_FORM } from "./references";
import { missingRequired, formProgress, signatureMatches, submissionForm, formForItem } from "./logic";

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
    const refs = missingRequired(REFERENCES_FORM, {}).filter((m) => m.label.startsWith("Reference"));
    expect(refs.some((m) => m.label.startsWith("Reference 3"))).toBe(true);
  });
  it("references are separate Step 3 homework, not required in the new RFC", () => {
    expect(missingRequired(RFC_FORM, {}).some((m) => m.label.startsWith("Reference"))).toBe(false);
    expect(formForItem(3, "references")?.key).toBe("references");
    expect(REFERENCES_FORM.noSignature).toBe(true);
  });
  it("new RFC needs market ZIP instead of county", () => {
    const fields = RFC_FORM.sections.flatMap((s) => s.fields ?? []);
    expect(fields.some((f) => f.key === "camp_county")).toBe(false);
    expect(missingRequired(RFC_FORM, {}).filter((m) => m.label === "ZIP Code")).toHaveLength(2);
  });
  it("old signed RFC retains county and all three references", () => {
    const old = submissionForm(RFC_FORM, "2");
    expect(old.sections.flatMap((s) => s.fields ?? []).some((f) => f.key === "camp_county")).toBe(true);
    expect(old.sections.find((s) => s.id === "references")?.repeater?.requiredCount).toBe(3);
    expect(submissionForm(RFC_FORM, "3")).toBe(RFC_FORM);
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
