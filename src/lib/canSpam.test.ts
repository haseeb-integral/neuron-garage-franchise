import { describe, it, expect } from "vitest";
import { findMissingUnsubscribe, sequencesMissingUnsubscribe, checkCanSpam, checkSequenceMailingAddress, canSpamFooter, ADDRESS_REQUIRED_MESSAGE } from "./canSpam";

describe("per-variant unsubscribe check", () => {
  it("tag in Variant A does not hide missing tag in Variant B", () => {
    const seqs = [{ seq_number: 2, seq_variants: [
      { variant_label: "A", email_body: "hi {{unsubscribe}}" },
      { variant_label: "B", email_body: "hi" },
    ] }];
    expect(findMissingUnsubscribe(seqs)).toEqual(["Step 2, Variant B"]);
    expect(sequencesMissingUnsubscribe(seqs)).toBe(true);
  });
  it("passes when every variant has the tag", () => {
    const seqs = [{ seq_number: 1, seq_variants: [
      { variant_label: "A", email_body: "{{unsubscribe}}" },
      { variant_label: "B", email_body: "{{ unsubscribe }}" },
    ] }];
    expect(sequencesMissingUnsubscribe(seqs)).toBe(false);
  });
  it("empty sequence list is not compliant", () => {
    expect(sequencesMissingUnsubscribe([])).toBe(true);
  });
});

describe("saved company mailing address", () => {
  const address = "123 Test Street\nAustin, TX 78701";
  it("blocks launches when no address is saved", () => {
    expect(checkCanSpam(["{{unsubscribe}}"], { address: "" })).toBe(ADDRESS_REQUIRED_MESSAGE);
    expect(checkSequenceMailingAddress([], "   ")).toBe(ADDRESS_REQUIRED_MESSAGE);
  });
  it("rejects the old stand-in address", () => {
    expect(checkCanSpam([canSpamFooter("[ADD MAILING ADDRESS]")], { address: "[ADD MAILING ADDRESS]" })).toBe(ADDRESS_REQUIRED_MESSAGE);
  });
  it("allows the saved address in every email", () => {
    expect(checkCanSpam([canSpamFooter(address)], { address })).toBeNull();
    expect(checkSequenceMailingAddress([{ email_body: canSpamFooter(address) }], address)).toBeNull();
  });
  it("checks the mailing address independently in Variant B", () => {
    expect(checkSequenceMailingAddress([{ seq_number: 2, seq_variants: [
      { email_body: canSpamFooter(address) }, { email_body: "{{unsubscribe}}" },
    ] }], address)).toContain("Step 2, Variant B");
  });
  it("accepts line breaks rendered as HTML", () => {
    expect(checkSequenceMailingAddress([{ email_body: "<p>123 Test Street</p><p>Austin, TX 78701</p>" }], address)).toBeNull();
  });
  it("does not accept a different address", () => {
    expect(checkCanSpam([canSpamFooter("456 Other Street")], { address })).not.toBeNull();
  });
  it("keeps draft address checks optional", () => {
    expect(checkCanSpam(["{{unsubscribe}}"], { requireAddress: false })).toBeNull();
  });
});
