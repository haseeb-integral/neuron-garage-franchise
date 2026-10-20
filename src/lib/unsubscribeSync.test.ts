import { describe, expect, it } from "vitest";
import { syncCooldownSeconds, unsubscribeSyncMessage } from "./unsubscribeSync";

describe("unsubscribe sync rules", () => {
  it("requires 60 seconds between manual attempts", () => {
    expect(syncCooldownSeconds(1000, 1000)).toBe(60);
    expect(syncCooldownSeconds(1000, 60_999)).toBe(1);
    expect(syncCooldownSeconds(1000, 61_000)).toBe(0);
    expect(syncCooldownSeconds(null, 1000)).toBe(0);
  });
  it("does not call a failed campaign check a successful sync", () => {
    const result = { ok: false, new_suppressions_added: 2, failed_campaigns: [{ campaign_id: "1", error: "401" }] };
    expect(unsubscribeSyncMessage(result)).toContain("1 campaigns could not be checked");
    expect(unsubscribeSyncMessage(result)).not.toContain("Synced");
  });
});