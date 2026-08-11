import { useMemo, useState } from "react";
import { ArrowUpDown, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Candidate } from "@/data/pipelineData";
import { STAGES } from "@/data/pipelineData";
import { computeComposite } from "@/lib/candidateScoring";
import { downloadCandidatesCsv } from "@/lib/candidatePipelineCsv";

type SortKey = "name" | "email" | "city" | "stage" | "assignedTo" | "tag" | "qual" | "days" | "created";

const stageLabel = (id: string) => STAGES.find((s) => s.id === id)?.short ?? id;

export function CandidatesTable({
  candidates,
  allCandidates,
  onOpenCandidate,
  onImportClick,
}: {
  /** Rows after the page filters. */
  candidates: Candidate[];
  /** Every candidate, used by the "Download all" button. */
  allCandidates: Candidate[];
  onOpenCandidate: (c: Candidate) => void;
  onImportClick?: () => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [asc, setAsc] = useState(false);

  const sorted = useMemo(() => {
    const val = (c: Candidate): string | number => {
      switch (sortKey) {
        case "name": return c.name?.toLowerCase() ?? "";
        case "email": return c.email?.toLowerCase() ?? "";
        case "city": return `${c.state ?? ""} ${c.city ?? ""}`.toLowerCase();
        case "stage": return STAGES.findIndex((s) => s.id === c.stage);
        case "assignedTo": return c.assignedTo?.toLowerCase() ?? "";
        case "tag": return c.tag?.toLowerCase() ?? "";
        case "qual": return computeComposite(c.qualificationScores);
        case "days": return c.daysInStage ?? 0;
        default: return c.createdDate ?? "";
      }
    };
    return [...candidates].sort((a, b) => {
      const va = val(a); const vb = val(b);
      if (va === vb) return 0;
      return (va > vb ? 1 : -1) * (asc ? 1 : -1);
    });
  }, [candidates, sortKey, asc]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setAsc((v) => !v);
    else { setSortKey(k); setAsc(true); }
  };

  const cols: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "city", label: "Location" },
    { key: "stage", label: "Stage" },
    { key: "assignedTo", label: "Owner" },
    { key: "tag", label: "Tag" },
    { key: "qual", label: "Qual", align: "right" },
    { key: "days", label: "Days", align: "right" },
    { key: "created", label: "Created", align: "right" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm" style={{ border: "1px solid #cfe0ff" }}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5" style={{ borderBottom: "1px solid #e7edf5" }}>
        <div className="text-xs font-semibold" style={{ color: "#526078" }}>
          {sorted.length} candidate{sorted.length === 1 ? "" : "s"}
          {sorted.length !== allCandidates.length && ` (of ${allCandidates.length})`}
        </div>
        <div className="flex items-center gap-2">
          {onImportClick && (
            <Button size="sm" variant="outline" onClick={onImportClick}>
              <Upload size={14} /> Import CSV
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => downloadCandidatesCsv(sorted)}>
            <Download size={14} /> Download CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadCandidatesCsv(allCandidates, "candidate-pipeline-backup")}
            title="Full backup of every candidate, ignoring filters"
          >
            <Download size={14} /> Download all (backup)
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ backgroundColor: "#f7faff", color: "#526078" }}>
              {cols.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  className={`px-3 py-2 font-semibold uppercase tracking-wide text-[10px] cursor-pointer select-none whitespace-nowrap ${c.align === "right" ? "text-right" : "text-left"}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    <ArrowUpDown size={10} style={{ opacity: sortKey === c.key ? 1 : 0.3 }} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr
                key={(c as any).dbId ?? c.id}
                onClick={() => onOpenCandidate(c)}
                className="cursor-pointer hover:bg-[#f7faff]"
                style={{ borderTop: "1px solid #edf2f8" }}
              >
                <td className="px-3 py-2 font-semibold" style={{ color: "#07142f" }}>{c.name}</td>
                <td className="px-3 py-2" style={{ color: "#526078" }}>{c.email}</td>
                <td className="px-3 py-2" style={{ color: "#526078" }}>{[c.city, c.state].filter(Boolean).join(", ")}</td>
                <td className="px-3 py-2" style={{ color: "#526078" }}>{stageLabel(c.stage)}</td>
                <td className="px-3 py-2" style={{ color: "#526078" }}>{c.assignedTo || "—"}</td>
                <td className="px-3 py-2" style={{ color: "#526078" }}>{c.tag || "—"}</td>
                <td className="px-3 py-2 text-right font-semibold" style={{ color: "#07142f" }}>{computeComposite(c.qualificationScores)}</td>
                <td className="px-3 py-2 text-right" style={{ color: "#526078" }}>{c.daysInStage}</td>
                <td className="px-3 py-2 text-right" style={{ color: "#526078" }}>{c.createdDate ? c.createdDate.slice(0, 10) : "—"}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={cols.length} className="px-3 py-8 text-center" style={{ color: "#8794ab" }}>No candidates match the current filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
