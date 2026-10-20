import { describe, it, expect } from "vitest";
import { findMissingUnsubscribe, sequencesMissingUnsubscribe } from "./canSpam";

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
