import { describe, it, expect } from "vitest";
import { ITEM23_FORM, ITEM23_SELLER_LINES, formatFddIssuance, item23Receipt } from "./item23";
import { formForItem, getPortalForm } from "./logic";

describe("Item 23 receipt rules", () => {
  it("lists all three sellers, ticked, with the same address and phone as Sam and Kaylie", () => {
    expect(ITEM23_SELLER_LINES).toHaveLength(3);
    expect(ITEM23_SELLER_LINES[0]).toContain("Sam Reed");
    expect(ITEM23_SELLER_LINES[1]).toContain("Kaylie Reed");
    expect(ITEM23_SELLER_LINES[2]).toContain("Skyler Bossen");
    for (const line of ITEM23_SELLER_LINES) {
      expect(line).toContain("[x]");
      expect(line).toContain("150 S. Willow Street #2125, Telluride, CO 81435");
      expect(line).toContain("(970) 239-1054");
      expect(line).not.toContain("512-593-2750");
    }
  });

  it("names the exact FDD version received in the signed statement", () => {
    const { signedText, preText } = item23Receipt("2026-03-01");
    expect(signedText).toContain("Franchise Disclosure Document dated March 1, 2026");
    expect(signedText).toContain("G. Form of General Release");
    expect(preText).toContain("Issuance Date: March 1, 2026");
  });

  it("never invents a date when the version is not recorded", () => {
    expect(formatFddIssuance(null)).toBe("date not on file");
    expect(item23Receipt(null).signedText).toContain("date not on file");
  });

  it("attaches to the Step 2 'Sign and return the Item 23 receipt' checklist item", () => {
    expect(formForItem(2, "item23")?.key).toBe("item23");
    expect(getPortalForm("item23")?.key).toBe("item23");
    expect(ITEM23_FORM.stepNum).toBe(2);
  });
});
