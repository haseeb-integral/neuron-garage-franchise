import { describe, it, expect } from "vitest";
import { staffFormView, staffAnswerSections, type StaffFormRecord, type StaffSignatureRecord } from "./staffView";
import { FACILITY_FORM } from "./facility";

const form = (candidate: string, status = "submitted"): StaffFormRecord => ({
  id: `form-${candidate}`, candidate_id: candidate, form_key: "facility", status, answers: { city: "Later draft" },
  created_at: "2026-10-27T14:00:00Z", updated_at: "2026-10-27T15:00:00Z", submitted_at: null,
  form_version: "1", last_section: 0, progress: 80, reopen_reason: null, reopened_at: null, reopened_by: null,
});
const sig = (candidate: string): StaffSignatureRecord => ({
  id: `sig-${candidate}`, form_id: `form-${candidate}`, candidate_id: candidate, form_key: "facility",
  signed_at: "2026-10-27T15:00:00Z", answers_snapshot: { city: "Austin" }, pdf_path: "saved.pdf",
  answers_sha256: "test-hash", esign_consent_at: null, esign_consent_text: null, form_version: "1", ip: null,
  pdf_sha256: "pdf-test-hash", signed_text: "Test submission", signer_name: "Test Prospect", user_agent: null,
  user_email: "test@example.com", user_id: "test-user", correction_request_id: null, fdd_file_id: null,
});

describe("Staff prospect form selection", () => {
  it("never shows another candidate's records", () => {
    const view = staffFormView("B", "facility", [form("A")], [sig("A")]);
    expect(view.record).toBeUndefined();
    expect(view.answers).toBeNull();
  });
  it("reads submitted answers and PDF from the same signature, not the draft", () => {
    const view = staffFormView("A", "facility", [form("A")], [sig("A")]);
    expect(view.answers?.city).toBe("Austin");
    expect(view.signature?.pdf_path).toBe("saved.pdf");
  });
  it("does not substitute a draft when a submitted snapshot is missing", () => {
    expect(staffFormView("A", "facility", [form("A")], []).answers).toBeNull();
  });
  it("shows draft answers without attaching an old signed PDF", () => {
    const view = staffFormView("A", "facility", [form("A", "reopened")], [sig("A")]);
    expect(view.answers?.city).toBe("Later draft");
    expect(view.signature).toBeUndefined();
  });
  it("includes a school's Other reason only when selected", () => {
    const rows = (good_fit: string[]) => staffAnswerSections(FACILITY_FORM, { schools: [{ good_fit, good_fit_other: "I teach here" }] }).flatMap((s) => s.rows);
    expect(rows(["Other"]).find((r) => r.label.endsWith("Other reason"))?.value).toBe("I teach here");
    expect(rows([]).some((r) => r.label.endsWith("Other reason"))).toBe(false);
  });
});