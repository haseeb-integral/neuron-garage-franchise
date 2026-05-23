import type { TeacherProspect } from "@/data/teacherData";
import { sourceKeyFor, sourceLabelFor } from "@/lib/teacherSourceLabels";

const CSV_HEADERS = [
  "Name", "Title", "School", "School URL", "District", "Grade", "City", "State",
  "Email", "LinkedIn", "Source", "Verification", "Needs Email Enrichment", "Tags", "Notes",
];

const rowToCsvCells = (p: TeacherProspect) => [
  p.name, p.title ?? "", p.school, p.schoolUrl ?? "", p.district ?? "", p.gradeRaw ?? "",
  p.city, p.state, p.email, p.linkedinUrl ?? "",
  sourceLabelFor(sourceKeyFor(p.enrichmentSource)),
  p.verificationStatus ?? "",
  p.needsEmailEnrichment ? "Yes" : "No",
  (p.tags ?? []).join("; "),
  p.notes ?? "",
];

export const downloadProspectsCsv = (rows: TeacherProspect[], filenameSuffix = "") => {
  const escape = (v: string | number | boolean | null | undefined) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    CSV_HEADERS.join(","),
    ...rows.map((p) => rowToCsvCells(p).map(escape).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const date = new Date().toISOString().slice(0, 10);
  link.download = `teacher-prospects-${date}${filenameSuffix ? `-${filenameSuffix}` : ""}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
