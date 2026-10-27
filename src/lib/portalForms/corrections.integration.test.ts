import { describe, it, expect } from "vitest";

// Run only with short-lived staff/prospect sessions supplied by the test runner.
const enabled = !!process.env.PORTAL_TEST_STAFF_TOKEN && !!process.env.PORTAL_TEST_PROSPECT_TOKEN;
const base = process.env.PORTAL_TEST_URL;
const key = process.env.PORTAL_TEST_ANON_KEY;
async function rpc(name: string, body: unknown, token?: string) {
  const response = await fetch(`${base}/rest/v1/rpc/${name}`, {
    method: "POST", headers: { apikey: key ?? "", Authorization: `Bearer ${token ?? key}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return { ok: response.ok, status: response.status, data: await response.json() };
}

describe.skipIf(!enabled)("Live form correction safeguards", () => {
  it("rejects a prospect requesting a staff correction", async () => {
    const result = await rpc("portal_request_correction", { _form_id: process.env.PORTAL_TEST_FORM_ID, _reason: "Not allowed" }, process.env.PORTAL_TEST_PROSPECT_TOKEN);
    expect(result.ok).toBe(false);
    expect(result.data.message).toContain("Staff only");
  });
  it("rejects a signed-out correction request", async () => {
    expect((await rpc("portal_request_correction", { _form_id: process.env.PORTAL_TEST_FORM_ID, _reason: "Not allowed" })).ok).toBe(false);
  });
  it("rejects empty staff correction reasons", async () => {
    const result = await rpc("portal_request_correction", { _form_id: process.env.PORTAL_TEST_FORM_ID, _reason: " " }, process.env.PORTAL_TEST_STAFF_TOKEN);
    expect(result.ok).toBe(false);
    expect(result.data.message).toContain("Please enter a reason");
  });
  it("rejects correction requests with no saved submitted form", async () => {
    const result = await rpc("portal_request_correction", { _form_id: "00000000-0000-0000-0000-000000000000", _reason: "Test" }, process.env.PORTAL_TEST_STAFF_TOKEN);
    expect(result.ok).toBe(false);
    expect(result.data.message).toContain("Only a submitted form");
  });
  it("does not expose the atomic submission action to prospects", async () => {
    const result = await rpc("portal_finish_submission", { _form_id: process.env.PORTAL_TEST_FORM_ID, _expected_answers: {}, _signature: {}, _details: {} }, process.env.PORTAL_TEST_PROSPECT_TOKEN);
    expect(result.ok).toBe(false);
    expect(result.data.message).toContain("permission denied");
  });
});