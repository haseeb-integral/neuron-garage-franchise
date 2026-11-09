import { describe, expect, it } from "vitest";
import { fddReviewAllowsSigning } from "./fddReview";
describe("Full FDD review signing gate", () => {
  it("blocks Item 23 until its exact FDD loads", () => {
    expect(fddReviewAllowsSigning("item23", "version-1", null)).toBe(false);
    expect(fddReviewAllowsSigning("item23", "version-1", "older-version")).toBe(false);
    expect(fddReviewAllowsSigning("item23", "version-1", "version-1")).toBe(true);
  });
  it("blocks Item 23 when no received version is known", () => {
    expect(fddReviewAllowsSigning("item23", null, null)).toBe(false);
  });
  it("does not add an FDD requirement to other forms", () => {
    expect(fddReviewAllowsSigning("bgcf", null, null)).toBe(true);
    expect(fddReviewAllowsSigning("facility", null, null)).toBe(true);
  });
});