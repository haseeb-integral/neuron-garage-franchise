import { describe, it, expect } from "vitest";
import { buildAuditRows, daysBetween } from "./fddAuditReport";

const base = { events: [], signatures: [], fddFiles: [], proofFiles: [] };

describe("fdd audit report", () => {
  it("counts calendar days from FDD sent to agreement signed", () => {
    expect(daysBetween("2026-03-01", "2026-03-17")).toBe(16);
    expect(daysBetween("2026-03-01", null)).toBeNull();
  });

  it("uses the first provider-accepted send and counts resends", () => {
    const rows = buildAuditRows({
      ...base,
      candidates: [{ id: "c1", first_name: "A", last_name: "B", email: "a@x.com" }, { id: "c2", first_name: "No", last_name: "Fdd", email: null }],
      compliance: [],
      sends: [
        { candidate_id: "c1", fdd_file_id: null, recipient_email: "a@x.com", actor_email: null, file_name: "FDD.pdf", issuance_date: "2026-03-01", file_sha256: "h", status: "sent", sent_at: "2026-04-10T12:00:00Z" },
        { candidate_id: "c1", fdd_file_id: null, recipient_email: "a@x.com", actor_email: null, file_name: "FDD.pdf", issuance_date: "2026-03-01", file_sha256: "h", status: "sent", sent_at: "2026-04-02T12:00:00Z" },
        { candidate_id: "c1", fdd_file_id: null, recipient_email: "a@x.com", actor_email: null, file_name: "FDD.pdf", issuance_date: null, file_sha256: null, status: "failed", sent_at: null },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].fddSentDate).toBe("2026-04-02");
    expect(rows[0].resendCount).toBe(1);
    expect(rows[0].fddVersion).toBe("FDD.pdf — issued 2026-03-01");
  });
});
