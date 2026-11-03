import { describe, expect, it, vi } from "vitest";
import { processCallStartsAt, syncProcessCallEvent } from "./candidateEvents";

const mock = vi.hoisted(() => ({ upsert: vi.fn(), eq: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { email: "staff@example.com" } } }) },
  from: () => ({ select: () => ({ eq: mock.eq }), upsert: mock.upsert }),
} }));

describe("processCallStartsAt", () => {
  it("uses daylight-saving time for US zones", () => {
    expect(processCallStartsAt("2026-07-15", "09:00", "ET (Eastern)")).toBe("2026-07-15T13:00:00.000Z");
    expect(processCallStartsAt("2026-01-15", "09:00", "ET (Eastern)")).toBe("2026-01-15T14:00:00.000Z");
  });

  it("supports all six choices", () => {
    expect(processCallStartsAt("2026-07-15", "09:00", "CT (Central)")).toBe("2026-07-15T14:00:00.000Z");
    expect(processCallStartsAt("2026-07-15", "09:00", "MT (Mountain)")).toBe("2026-07-15T15:00:00.000Z");
    expect(processCallStartsAt("2026-07-15", "09:00", "PT (Pacific)")).toBe("2026-07-15T16:00:00.000Z");
    expect(processCallStartsAt("2026-07-15", "09:00", "AKT (Alaska)")).toBe("2026-07-15T17:00:00.000Z");
    expect(processCallStartsAt("2026-07-15", "09:00", "HT (Hawaii)")).toBe("2026-07-15T19:00:00.000Z");
  });

  it("rejects a skipped daylight-saving time", () => {
    expect(() => processCallStartsAt("2026-03-08", "02:30", "ET (Eastern)")).toThrow(
      "does not exist",
    );
  });
});

describe("Step 2 next-call saving", () => {
  it("saves one Step 3 call linked to its Step 2 source", async () => {
    mock.eq.mockReturnValue({ eq: mock.eq, maybeSingle: async () => ({ data: null, error: null }) });
    mock.upsert.mockResolvedValue({ error: null });
    expect(await syncProcessCallEvent("candidate", 2, "Business Immersion & Evaluation", {
      date: "2026-11-10", time: "15:00", timeZone: "MT (Mountain)",
    })).toBe("created");
    expect(mock.upsert).toHaveBeenCalledWith(expect.objectContaining({
      candidate_id: "candidate", source_process_step: 2,
      starts_at: "2026-11-10T22:00:00.000Z", event_type: "call",
      title: "Step 3 — Business Immersion & Evaluation",
    }), { onConflict: "candidate_id,source_process_step" });
  });
});