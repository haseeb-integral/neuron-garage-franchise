import { describe, expect, it } from "vitest";
import { evidenceVersion, proofVersionIds } from "../../../supabase/functions/portal-fdd-proof-packet/versions";

describe("receipt proof version identity", () => {
  const versions = [
    { id: "original", file_name: "Original FDD.pdf", fdd_issuance_date: "2026-03-01", file_sha256: "original-fingerprint" },
    { id: "later", file_name: "Later FDD.pdf", fdd_issuance_date: "2026-10-01", file_sha256: "later-fingerprint" },
  ];
  it("keeps the receipt's original version after a later staff selection", () => {
    expect(evidenceVersion("original", versions)?.file_sha256).toBe("original-fingerprint");
  });
  it("does not guess when receipt evidence has no confirmed version", () => {
    expect(evidenceVersion(null, versions)).toBeNull();
    expect(evidenceVersion("missing", versions)).toBeNull();
  });
  it("includes versions from original receipts, corrections, and delivery events", () => {
    expect(proofVersionIds("later", [{ fdd_file_id: "emailed" }], [{ fdd_file_id: "original" }, { fdd_file_id: "original" }])).toEqual(["later", "emailed", "original"]);
  });
});