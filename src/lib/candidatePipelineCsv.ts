import type { Candidate, StageId } from "@/data/pipelineData";
import { STAGES } from "@/data/pipelineData";
import { computeComposite } from "@/lib/candidateScoring";

/**
 * Single source of truth for the candidate CSV. Export and import both read this
 * list so the two can never drift apart.
 *
 * `importable: false` columns are written on download (useful for a human reading
 * the backup) but ignored when a CSV is imported back in.
 */
export interface CandidateCsvColumn {
  header: string;
  /** Value written to the CSV for a candidate. */
  get: (c: Candidate) => string;
  /** Database column this maps to on import. Omit for read-only columns. */
  dbField?: string;
  importable?: boolean;
}

const stageLabel = (id: StageId): string =>
  STAGES.find((s) => s.id === id)?.label ?? id;

const splitName = (name: string) => {
  const parts = (name ?? "").trim().split(/\s+/);
  const first = parts.shift() ?? "";
  return { first, last: parts.join(" ") };
};

export const CANDIDATE_CSV_COLUMNS: CandidateCsvColumn[] = [
  { header: "First Name", get: (c) => splitName(c.name).first, dbField: "first_name", importable: true },
  { header: "Last Name", get: (c) => splitName(c.name).last, dbField: "last_name", importable: true },
  { header: "Email", get: (c) => c.email ?? "", dbField: "email", importable: true },
  { header: "Other Email", get: (c) => c.otherEmail ?? "", dbField: "other_email", importable: true },
  { header: "Phone", get: (c) => c.phone ?? "", dbField: "phone", importable: true },
  { header: "City", get: (c) => c.city ?? "", dbField: "city", importable: true },
  { header: "State", get: (c) => c.state ?? "", dbField: "state", importable: true },
  { header: "Stage", get: (c) => stageLabel(c.stage), dbField: "current_stage", importable: true },
  { header: "Assigned To", get: (c) => c.assignedTo ?? "", dbField: "assigned_to", importable: true },
  { header: "Tag", get: (c) => c.tag ?? "", dbField: "fit_tag", importable: true },
  { header: "Source Type", get: (c) => c.sourceType ?? "", dbField: "source_type", importable: true },
  { header: "Source Name", get: (c) => c.sourceName ?? "", dbField: "source_name", importable: true },
  { header: "Source Campaign", get: (c) => c.sourceCampaign ?? "", dbField: "source_campaign", importable: true },
  { header: "Source Notes", get: (c) => c.sourceNotes ?? "", dbField: "source_notes", importable: true },
  { header: "Mailing Street", get: (c) => c.mailingStreet ?? "", dbField: "mailing_street", importable: true },
  { header: "Mailing City", get: (c) => c.mailingCity ?? "", dbField: "mailing_city", importable: true },
  { header: "Mailing State", get: (c) => c.mailingState ?? "", dbField: "mailing_state", importable: true },
  { header: "Mailing Zip", get: (c) => c.mailingZip ?? "", dbField: "mailing_zip", importable: true },
  { header: "Partner Involved", get: (c) => (c.partnerInvolved ? "yes" : "no"), dbField: "partner_involved", importable: true },
  { header: "Partner Name", get: (c) => c.partnerName ?? "", dbField: "partner_name", importable: true },
  { header: "Partner Email", get: (c) => c.partnerEmail ?? "", dbField: "partner_email", importable: true },
  { header: "Partner Phone", get: (c) => c.partnerPhone ?? "", dbField: "partner_phone", importable: true },
  { header: "Other Opportunities", get: (c) => c.otherOpportunities ?? "", dbField: "other_opportunities", importable: true },
  // Read-only / informational columns
  { header: "Qualification Score", get: (c) => String(computeComposite(c.qualificationScores)) },
  { header: "Responsiveness", get: (c) => String(c.qualificationScores?.teaching ?? 0) },
  { header: "Elementary Experience", get: (c) => String(c.qualificationScores?.leadership ?? 0) },
  { header: "Process Alignment", get: (c) => String(c.qualificationScores?.financial ?? 0) },
  { header: "Philosophical Alignment", get: (c) => String(c.qualificationScores?.cultureFit ?? 0) },
  { header: "Market Fit", get: (c) => String(c.qualificationScores?.marketFit ?? 0) },
  { header: "Days In Stage", get: (c) => String(c.daysInStage ?? 0) },
  { header: "Created Date", get: (c) => (c.createdDate ? c.createdDate.slice(0, 10) : "") },
];

const escapeCell = (v: string): string => {
  const s = (v ?? "").replace(/\r?\n/g, " ").trim();
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function candidatesToCsv(rows: Candidate[]): string {
  const header = CANDIDATE_CSV_COLUMNS.map((c) => escapeCell(c.header)).join(",");
  const body = rows.map((r) =>
    CANDIDATE_CSV_COLUMNS.map((c) => escapeCell(c.get(r))).join(","),
  );
  return [header, ...body].join("\n");
}

export function downloadCandidatesCsv(rows: Candidate[], filenamePrefix = "candidate-pipeline") {
  const csv = candidatesToCsv(rows);
  // BOM so Excel opens UTF-8 correctly
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Map a CSV stage label (or id) back to a StageId. Falls back to new_lead. */
export function parseStage(value: string): { stage: StageId; warning?: string } {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return { stage: "new_lead" };
  const hit = STAGES.find(
    (s) => s.label.toLowerCase() === v || s.short.toLowerCase() === v || s.id === v,
  );
  if (hit) return { stage: hit.id };
  return { stage: "new_lead", warning: `Unknown stage "${value}" — set to New Lead` };
}
