import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { AuditRow } from "@/lib/fddAuditReport";

export function auditRowsToPdf(rows: AuditRow[], filters: string): Blob {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const now = new Date();
  doc.setFontSize(14);
  doc.text("Neuron Garage — FDD Audit Trail Report", 40, 40);
  doc.setFontSize(9);
  doc.text(`Generated ${now.toLocaleString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`, 40, 56);
  doc.text(`Filters: ${filters || "none"} · ${rows.length} prospect${rows.length === 1 ? "" : "s"}`, 40, 68);

  autoTable(doc, {
    startY: 80,
    styles: { fontSize: 6.5, cellPadding: 3, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: [10, 34, 66], textColor: 255 },
    head: [["Prospect", "FDD version", "How sent", "Date sent", "Proof of sending", "Item 23 received", "How received", "Proof of Item 23", "Item 23 signature", "Agreement signed", "Days"]],
    body: rows.map((r) => [
      `${r.name}\n${r.email}`,
      `${r.fddVersion || "—"}${r.fddFingerprint ? `\nSHA-256 ${r.fddFingerprint}` : ""}`,
      `${r.fddMethod}${r.resendCount ? `\n+${r.resendCount} resend(s)` : ""}`,
      r.fddSentDate || "—", r.fddProof || "—",
      r.item23Date || "—", r.item23Method || "—", r.item23Proof || "—", r.item23Signature || "—",
      r.faSignedDate || "—", r.daysSentToSigned == null ? "—" : String(r.daysSentToSigned),
    ]),
    columnStyles: { 1: { cellWidth: 90 }, 4: { cellWidth: 110 }, 7: { cellWidth: 100 } },
    didParseCell: (d) => {
      if (d.section === "body" && d.column.index === 10) {
        const n = Number(d.cell.raw);
        if (!isNaN(n) && n < 14) { d.cell.styles.textColor = [200, 30, 30]; d.cell.styles.fontStyle = "bold"; }
      }
    },
    didDrawPage: () => {
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.text(`Page ${doc.getNumberOfPages()} · Days in red are under 14 · Read-only report from app records`, 40, h - 20);
    },
  });
  return doc.output("blob");
}
