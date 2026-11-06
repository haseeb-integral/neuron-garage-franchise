// Pure builder for the staff FDD audit trail report (read-only).

export interface AuditCandidate { id: string; first_name: string | null; last_name: string | null; email: string | null }
export interface AuditCompliance {
  candidate_id: string; fdd_sent_at: string | null; fdd_received_at: string | null;
  fa_signed_at: string | null; fdd_file_id: string | null;
}
export interface AuditSend {
  candidate_id: string; fdd_file_id: string | null; recipient_email: string | null; actor_email: string | null;
  file_name: string | null; issuance_date: string | null; file_sha256: string | null; status: string; sent_at: string | null;
}
export interface AuditEvent { candidate_id: string; fdd_file_id: string | null; event: string; at: string }
export interface AuditSignature {
  candidate_id: string; signer_name: string | null; signed_at: string; ip: string | null;
  pdf_sha256: string | null; fdd_file_id: string | null; correction_request_id: string | null;
}
export interface AuditFddFile { id: string; file_name: string | null; fdd_issuance_date: string | null; file_sha256: string | null }
export interface AuditProofFile { candidate_id: string; category: string; file_name: string }

export interface AuditRow {
  candidateId: string; name: string; email: string;
  fddVersion: string; fddFingerprint: string;
  fddMethod: string; fddSentDate: string; fddProof: string; resendCount: number; sends: AuditSend[];
  item23Date: string; item23Method: string; item23Proof: string; item23Signature: string;
  faSignedDate: string; daysSentToSigned: number | null;
}

/** YYYY-MM-DD in the viewer's local time (date-only strings pass through). */
export function dayOf(v: string | null | undefined): string {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Whole calendar days from the FDD sent day to the agreement signed day. */
export function daysBetween(from: string | null | undefined, to: string | null | undefined): number | null {
  const a = dayOf(from), b = dayOf(to);
  if (!a || !b) return null;
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export function versionLabel(fileName: string | null | undefined, issuance: string | null | undefined): string {
  if (!fileName && !issuance) return "";
  return [fileName || "FDD", issuance ? `issued ${issuance}` : ""].filter(Boolean).join(" — ");
}

export function buildAuditRows(input: {
  candidates: AuditCandidate[]; compliance: AuditCompliance[]; sends: AuditSend[]; events: AuditEvent[];
  signatures: AuditSignature[]; fddFiles: AuditFddFile[]; proofFiles: AuditProofFile[];
}): AuditRow[] {
  const files = new Map(input.fddFiles.map((f) => [f.id, f]));
  const comp = new Map(input.compliance.map((c) => [c.candidate_id, c]));
  const rows: AuditRow[] = [];

  for (const c of input.candidates) {
    const cc = comp.get(c.id);
    const sends = input.sends
      .filter((s) => s.candidate_id === c.id && s.status === "sent" && s.sent_at)
      .sort((a, b) => a.sent_at!.localeCompare(b.sent_at!));
    if (!cc?.fdd_sent_at && sends.length === 0) continue;

    const first = sends[0];
    const events = input.events.filter((e) => e.candidate_id === c.id);
    const proofs = input.proofFiles.filter((p) => p.candidate_id === c.id);
    const fddProofFiles = proofs.filter((p) => p.category === "fdd_proof").map((p) => p.file_name);
    const faProofFiles = proofs.filter((p) => p.category === "fa_proof").map((p) => p.file_name);
    const downloads = events.filter((e) => e.event === "downloaded").length;

    const fileId = cc?.fdd_file_id ?? first?.fdd_file_id ?? events.find((e) => e.fdd_file_id)?.fdd_file_id ?? null;
    const f = fileId ? files.get(fileId) : undefined;
    const fddVersion = versionLabel(f?.file_name ?? first?.file_name, f?.fdd_issuance_date ?? first?.issuance_date);
    const fddFingerprint = f?.file_sha256 ?? first?.file_sha256 ?? "";

    const fddSentDate = dayOf(cc?.fdd_sent_at ?? first?.sent_at);
    const fddMethod = first ? "Email link (app)" : "Recorded by staff";
    const proofParts: string[] = [];
    if (first) proofParts.push(`Email accepted by provider ${first.sent_at} to ${first.recipient_email ?? "?"}${first.actor_email ? ` (sent by ${first.actor_email})` : ""}`);
    if (fddProofFiles.length) proofParts.push(`Staff proof file: ${fddProofFiles.join(", ")}`);
    if (downloads) proofParts.push(`${downloads} portal download${downloads === 1 ? "" : "s"} logged`);
    if (!proofParts.length) proofParts.push("Date entered by staff, no proof file");

    const sigs = input.signatures.filter((s) => s.candidate_id === c.id).sort((a, b) => a.signed_at.localeCompare(b.signed_at));
    const sig = sigs[0];
    const item23Method = sig ? "E-signed in portal" : cc?.fdd_received_at ? "Recorded by staff" : "";
    let item23Proof = "";
    if (sig) {
      item23Proof = `Signed ${sig.signed_at}${sig.ip ? `, IP ${sig.ip}` : ""}${sig.pdf_sha256 ? `, signed PDF SHA-256 ${sig.pdf_sha256}` : ""}`;
      if (sigs.length > 1) item23Proof += ` (+${sigs.length - 1} correction${sigs.length === 2 ? "" : "s"})`;
    } else if (cc?.fdd_received_at) {
      item23Proof = "Date entered by staff";
    }
    const item23Signature = sig ? `/s/ ${sig.signer_name ?? ""} — ${sig.signed_at}` : "";

    rows.push({
      candidateId: c.id,
      name: [c.first_name, c.last_name].filter(Boolean).join(" "),
      email: c.email ?? "",
      fddVersion, fddFingerprint, fddMethod, fddSentDate,
      fddProof: proofParts.join("; "),
      resendCount: Math.max(0, sends.length - 1), sends,
      item23Date: dayOf(cc?.fdd_received_at),
      item23Method, item23Proof, item23Signature,
      faSignedDate: dayOf(cc?.fa_signed_at),
      daysSentToSigned: daysBetween(cc?.fdd_sent_at ?? first?.sent_at, cc?.fa_signed_at),
    });
  }
  return rows.sort((a, b) => b.fddSentDate.localeCompare(a.fddSentDate));
}

const HEADERS = [
  "Prospect", "Email", "FDD version", "FDD SHA-256", "How FDD was sent", "Date FDD sent", "Resends",
  "Proof of sending", "Item 23 received date", "How Item 23 was received", "Proof of Item 23",
  "Item 23 signature", "Franchise agreement signed", "Days FDD sent to agreement signed",
];

function cell(v: string | number | null): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function auditRowsToCsv(rows: AuditRow[]): string {
  const lines = [HEADERS.join(",")];
  for (const r of rows) {
    lines.push([
      r.name, r.email, r.fddVersion, r.fddFingerprint, r.fddMethod, r.fddSentDate, r.resendCount,
      r.fddProof, r.item23Date, r.item23Method, r.item23Proof, r.item23Signature, r.faSignedDate, r.daysSentToSigned,
    ].map(cell).join(","));
  }
  return "\uFEFF" + lines.join("\n");
}
