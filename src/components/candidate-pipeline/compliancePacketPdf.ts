// Compliance Packet — a single PDF a regulator can read: FDD dates, signing
// date, the 16-day math, who entered what and when, override details, and the
// list of proof files on record.
import jsPDF from "jspdf";
import {
  FDD_WAIT_DAYS,
  earliestSigningDate,
  fddEffectiveDate,
  formatDay,
  signingTooEarly,
} from "@/lib/fddCompliance";

export interface CompliancePacketArgs {
  candidateName: string;
  candidateEmail?: string | null;
  compliance: {
    fdd_sent_at: string | null;
    fdd_received_at: string | null;
    fa_signed_at: string | null;
    compliance_override: boolean;
    override_reason: string | null;
    override_by: string | null;
    override_at: string | null;
  } | null;
  audit: {
    field: string;
    old_value: any;
    new_value: any;
    changed_by: string | null;
    changed_at: string;
  }[];
  proofFiles: { file_name: string; category: string; uploaded_by_email: string | null; created_at: string }[];
  generatedBy?: string | null;
}

function fmtVal(v: any): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "on" : "off";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleDateString();
  return String(v);
}

export function buildCompliancePacketPdf(args: CompliancePacketArgs): jsPDF {
  const { candidateName, candidateEmail, compliance, audit, proofFiles, generatedBy } = args;
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const M = 48;
  let y = M;

  const line = (text: string, size = 10, bold = false, color: [number, number, number] = [20, 20, 20]) => {
    if (y > pageH - M) {
      pdf.addPage();
      y = M;
    }
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const wrapped = pdf.splitTextToSize(text, pageW - M * 2) as string[];
    wrapped.forEach((w) => {
      if (y > pageH - M) {
        pdf.addPage();
        y = M;
      }
      pdf.text(w, M, y);
      y += size + 4;
    });
  };
  const gap = (n = 8) => { y += n; };

  line("FDD Compliance Packet", 18, true, [0, 60, 126]);
  line(`Generated ${new Date().toLocaleString()}${generatedBy ? ` by ${generatedBy}` : ""}`, 9, false, [110, 110, 110]);
  gap(10);

  line(`Candidate: ${candidateName}`, 12, true);
  if (candidateEmail) line(`Email: ${candidateEmail}`, 10);
  gap(6);

  const sent = compliance?.fdd_sent_at ?? null;
  const received = compliance?.fdd_received_at ?? null;
  const signed = compliance?.fa_signed_at ?? null;
  const effective = fddEffectiveDate(sent, received);
  const earliest = earliestSigningDate(sent, received);
  const early = signingTooEarly(sent, received, signed);

  if (compliance?.compliance_override) {
    line("COMPLIANCE OVERRIDE IS ON", 12, true, [200, 30, 30]);
    line(`Reason: ${compliance.override_reason ?? "—"}`, 10, false, [200, 30, 30]);
    line(
      `Set by ${compliance.override_by ?? "—"}${compliance.override_at ? ` on ${new Date(compliance.override_at).toLocaleString()}` : ""}`,
      10,
      false,
      [200, 30, 30],
    );
    gap(8);
  }

  line("Key dates", 13, true, [0, 60, 126]);
  line(`FDD sent: ${sent ? new Date(sent).toLocaleDateString() : "—"}  (day 1 of the waiting period)`);
  line(`FDD received / acknowledged: ${received ? new Date(received).toLocaleDateString() : "—"}`);
  line(`Waiting-period clock starts: ${formatDay(effective)}`);
  line(`Required wait: ${FDD_WAIT_DAYS} calendar days (FTC minimum is 14 full days)`);
  line(`Earliest allowed signing date: ${formatDay(earliest)}`);
  line(`Franchise agreement signed: ${signed ? new Date(signed).toLocaleDateString() : "—"}`);
  if (sent && signed) {
    const days = Math.round(
      (new Date(signed).setHours(0, 0, 0, 0) - new Date(effective ?? sent).setHours(0, 0, 0, 0)) / 86_400_000,
    );
    line(`Days elapsed between FDD and signing: ${days}`);
  }
  line(
    early ? "STATUS: signing date is inside the waiting period." : "STATUS: waiting period satisfied.",
    11,
    true,
    early ? [200, 30, 30] : [20, 120, 60],
  );
  gap(10);

  line("Proof documents on file", 13, true, [0, 60, 126]);
  if (proofFiles.length === 0) {
    line("None on file.", 10, false, [200, 30, 30]);
  } else {
    proofFiles.forEach((f) => {
      line(
        `• [${f.category}] ${f.file_name} — uploaded ${new Date(f.created_at).toLocaleString()}${f.uploaded_by_email ? ` by ${f.uploaded_by_email}` : ""}`,
      );
    });
  }
  gap(10);

  line("Change history (audit trail)", 13, true, [0, 60, 126]);
  if (audit.length === 0) {
    line("No recorded changes.", 10, false, [110, 110, 110]);
  } else {
    audit.forEach((a) => {
      line(
        `• ${new Date(a.changed_at).toLocaleString()} — ${a.field}: ${fmtVal(a.old_value)} → ${fmtVal(a.new_value)}${a.changed_by ? ` (${a.changed_by})` : ""}`,
        9,
      );
    });
  }

  return pdf;
}
