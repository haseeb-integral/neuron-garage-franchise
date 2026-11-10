import { describe, expect, it } from "vitest";
import { readPasswordSetupLink } from "./passwordSetupLink";

describe("password setup link rules", () => {
  const link = (type: string) => `https://example.test/reset-password#type=${type}&access_token=test&refresh_token=test`;
  it("accepts an invitation callback", () => expect(readPasswordSetupLink(link("invite"))).toBe("invite"));
  it("accepts a recovery callback", () => expect(readPasswordSetupLink(link("recovery"))).toBe("recovery"));
  it("rejects an expired callback even with tokens", () => expect(readPasswordSetupLink(`${link("invite")}&error_code=otp_expired`)).toBe("invalid"));
  it("rejects a used or invalid callback", () => expect(readPasswordSetupLink(`${link("recovery")}&error=access_denied`)).toBe("invalid"));
  it("rejects a missing link despite a portal marker", () => expect(readPasswordSetupLink("https://example.test/reset-password?portal=1")).toBe("invalid"));
  it("rejects another sign-in type", () => expect(readPasswordSetupLink(link("magiclink"))).toBe("invalid"));
  it("rejects an incomplete invitation", () => expect(readPasswordSetupLink("https://example.test/reset-password#type=invite&access_token=test")).toBe("invalid"));
});