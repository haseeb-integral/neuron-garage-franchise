import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { X, Upload, CheckCircle2, AlertTriangle, Loader2, Info, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CANDIDATE_CSV_COLUMNS, parseStage } from "@/lib/candidatePipelineCsv";
import { toDbStage } from "@/lib/stageDbMapping";
import { FIT_TAGS } from "@/constants/fitTags";
import { candidatesToCsv } from "@/lib/candidatePipelineCsv";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type StagedRow = {
  db: Record<string, any>;
  display: { name: string; email: string; city: string; stage: string };
  qa: "approved" | "rejected";
  reason?: string;
  warnings: string[];
};

const IMPORTABLE = CANDIDATE_CSV_COLUMNS.filter((c) => c.importable && c.dbField);

/** Loose header match: ignore case, spaces, underscores. */
const norm = (s: string) => (s ?? "").toLowerCase().replace(/[\s_-]/g, "");

function buildHeaderMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const col of IMPORTABLE) {
    const hit = headers.find((h) => norm(h) === norm(col.header) || norm(h) === norm(col.dbField!));
    if (hit) map[col.dbField!] = hit;
  }
  return map;
}

function templateCsv(): string {
  return candidatesToCsv([]);
}

export function CandidateImportWizard({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
}) {
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [staged, setStaged] = useState<StagedRow[]>([]);
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [done, setDone] = useState<{ inserted: number; rejected: number } | null>(null);
  const [undoing, setUndoing] = useState(false);

  useEffect(() => {
    if (!open) {
      setRawRows([]); setHeaders([]); setStaged([]); setChecking(false);
      setImporting(false); setBatchId(null); setDone(null); setUndoing(false);
    }
  }, [open]);

  const handleCsv = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setRawRows(res.data);
        setHeaders(res.meta.fields ?? Object.keys(res.data[0] ?? {}));
        setStaged([]);
        setDone(null);
        toast.success(`Loaded ${res.data.length} rows`);
      },
      error: (e) => toast.error(`CSV parse error: ${e.message}`),
    });
  };

  const review = async () => {
    if (!rawRows.length) { toast.error("Upload a CSV first."); return; }
    setChecking(true);
    const map = buildHeaderMap(headers);
    const missingRequired = ["first_name", "last_name", "email"].filter((f) => !map[f]);
    if (missingRequired.length) {
      setChecking(false);
      toast.error(`CSV is missing required columns: ${missingRequired.join(", ")}`);
      return;
    }

    const rows: StagedRow[] = [];
    const seen = new Set<string>();
    for (const r of rawRows) {
      const get = (field: string) => (map[field] ? String(r[map[field]] ?? "").trim() : "");
      const warnings: string[] = [];
      const db: Record<string, any> = {};

      for (const col of IMPORTABLE) {
        const field = col.dbField!;
        const v = get(field);
        if (field === "current_stage") {
          const { stage, warning } = parseStage(v);
          if (warning) warnings.push(warning);
          db.current_stage = toDbStage(stage);
        } else if (field === "partner_involved") {
          db.partner_involved = /^(y|yes|true|1)$/i.test(v);
        } else if (field === "fit_tag") {
          if (!v) db.fit_tag = "Untagged";
          else if ((FIT_TAGS as readonly string[]).includes(v)) db.fit_tag = v;
          else { db.fit_tag = "Untagged"; warnings.push(`Unknown tag "${v}" — left untagged`); }
        } else if (field === "email") {
          db.email = v.toLowerCase();
        } else {
          db[field] = v;
        }
      }
      db.email_source = "manual";

      const name = `${db.first_name ?? ""} ${db.last_name ?? ""}`.trim();
      const display = { name: name || "(no name)", email: db.email ?? "", city: [db.city, db.state].filter(Boolean).join(", "), stage: db.current_stage ?? "new_lead" };

      let qa: StagedRow["qa"] = "approved";
      let reason: string | undefined;
      if (!db.first_name || !db.last_name) { qa = "rejected"; reason = "Missing first or last name"; }
      else if (!db.email) { qa = "rejected"; reason = "Missing email"; }
      else if (!EMAIL_RE.test(db.email)) { qa = "rejected"; reason = "Email looks wrong"; }
      else if (seen.has(db.email)) { qa = "rejected"; reason = "Duplicate email in this file"; }
      if (db.email) seen.add(db.email);

      rows.push({ db, display, qa, reason, warnings });
    }

    // Duplicate check against existing candidates
    const emails = rows.filter((r) => r.qa === "approved" && r.db.email).map((r) => r.db.email as string);
    if (emails.length) {
      try {
        const existing = new Set<string>();
        const CHUNK = 300;
        for (let i = 0; i < emails.length; i += CHUNK) {
          const { data } = await supabase.from("candidates").select("email").in("email", emails.slice(i, i + CHUNK));
          (data ?? []).forEach((d: any) => d.email && existing.add(String(d.email).toLowerCase()));
        }
        for (const r of rows) {
          if (r.qa === "approved" && existing.has(r.db.email)) { r.qa = "rejected"; r.reason = "Already in the pipeline"; }
        }
      } catch (e) {
        toast.error(`Duplicate check failed: ${(e as Error).message}`);
      }
    }

    setStaged(rows);
    setChecking(false);
  };

  const counts = useMemo(() => ({
    total: staged.length,
    approved: staged.filter((r) => r.qa === "approved").length,
    rejected: staged.filter((r) => r.qa === "rejected").length,
  }), [staged]);

  const toggleRow = (i: number) =>
    setStaged((prev) => prev.map((r, idx) => idx === i
      ? { ...r, qa: r.qa === "approved" ? "rejected" : "approved", reason: r.qa === "approved" ? "Manually rejected" : undefined }
      : r));

  const runImport = async () => {
    if (importing || done) return;
    const approved = staged.filter((r) => r.qa === "approved");
    if (!approved.length) { toast.error("Nothing to import."); return; }
    const batch = `csv-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    setImporting(true);
    let inserted = 0;
    const CHUNK = 500;
    const payload = approved.map((r) => ({ ...r.db, import_batch_id: batch }));
    for (let i = 0; i < payload.length; i += CHUNK) {
      const slice = payload.slice(i, i + CHUNK);
      const { error, count } = await supabase.from("candidates").insert(slice as any, { count: "exact" });
      if (error) { toast.error(`Import failed: ${error.message}`); break; }
      inserted += count ?? slice.length;
    }
    setImporting(false);
    setBatchId(batch);
    setDone({ inserted, rejected: counts.rejected });
    if (inserted > 0) {
      toast.success(`Imported ${inserted} candidates.`);
      onImported?.();
    }
  };

  const undoImport = async () => {
    if (!batchId) return;
    setUndoing(true);
    const { error } = await supabase.from("candidates").delete().eq("import_batch_id", batchId);
    setUndoing(false);
    if (error) { toast.error(`Undo failed: ${error.message}`); return; }
    toast.success("Import undone — those candidates were removed.");
    setDone(null);
    setBatchId(null);
    onImported?.();
    onClose();
  };

  const downloadTemplate = () => {
    const blob = new Blob(["\uFEFF" + templateCsv()], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "candidate-import-template.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <aside className="h-full w-full max-w-[860px] overflow-y-auto border-l bg-white shadow-xl" style={{ borderColor: "#e7edf5" }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4" style={{ borderColor: "#edf2f8" }}>
          <div>
            <h2 className="text-lg font-black">Import Candidates from CSV</h2>
            <div className="mt-0.5 text-[11px]" style={{ color: "#526078" }}>
              New candidates only. Rows that already exist are skipped, never overwritten.
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-[#f7faff]" style={{ color: "#526078" }}><X size={18} /></button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-lg border p-3 text-[11px]" style={{ borderColor: "#fde9b8", backgroundColor: "#fffbef", color: "#7c5a08" }}>
            <div className="flex items-start gap-2">
              <Info size={13} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-bold">How it works</div>
                <div className="mt-0.5">First Name, Last Name and Email are required. Column names are matched to the download format (spaces and case are ignored). Score and date columns are ignored.</div>
                <button onClick={downloadTemplate} className="mt-1 font-bold underline">Download a blank template</button>
              </div>
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 text-sm font-bold hover:bg-[#f7faff]" style={{ borderColor: "#dbe4f2", backgroundColor: "#fbfdff", color: "#174be8" }}>
            <Upload size={16} /> {rawRows.length ? `${rawRows.length} rows loaded — replace CSV` : "Upload CSV file"}
            <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleCsv(e.target.files[0])} />
          </label>

          {rawRows.length > 0 && staged.length === 0 && (
            <div className="flex justify-end">
              <button disabled={checking} onClick={review} className="rounded-lg px-4 py-2 text-xs font-black text-white disabled:opacity-50" style={{ backgroundColor: "#174be8" }}>
                {checking ? <span className="flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Checking…</span> : "Review rows"}
              </button>
            </div>
          )}

          {staged.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md px-2 py-1 font-bold" style={{ backgroundColor: "#eef4ff", color: "#174be8" }}>Rows {counts.total}</span>
                <span className="rounded-md px-2 py-1 font-bold" style={{ backgroundColor: "#e6f7ef", color: "#0a8f5a" }}>Will import {counts.approved}</span>
                <span className="rounded-md px-2 py-1 font-bold" style={{ backgroundColor: "#fff1f1", color: "#ef4444" }}>Skipped {counts.rejected}</span>
              </div>

              <div className="max-h-[420px] overflow-y-auto rounded-lg border" style={{ borderColor: "#edf2f8" }}>
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0" style={{ backgroundColor: "#f7faff" }}>
                    <tr className="text-left text-[9px] uppercase" style={{ color: "#8794ab" }}>
                      <th className="px-2 py-2">Name</th><th>Email</th><th>Location</th><th>Stage</th><th>Status</th><th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staged.map((r, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #edf2f8" }}>
                        <td className="px-2 py-1.5 font-bold" style={{ color: "#07142f" }}>{r.display.name}</td>
                        <td style={{ color: "#526078" }}>{r.display.email || "—"}</td>
                        <td style={{ color: "#526078" }}>{r.display.city || "—"}</td>
                        <td style={{ color: "#526078" }}>{r.display.stage}</td>
                        <td>
                          {r.qa === "approved"
                            ? <span className="inline-flex items-center gap-1 font-bold" style={{ color: "#0a8f5a" }}><CheckCircle2 size={11} /> {r.warnings.length ? r.warnings[0] : "Ready"}</span>
                            : <span className="inline-flex items-center gap-1 font-bold" style={{ color: "#ef4444" }} title={r.reason}><AlertTriangle size={11} /> {r.reason}</span>}
                        </td>
                        <td className="text-right">
                          <button disabled={!!done} onClick={() => toggleRow(i)} className="rounded-md border px-2 py-1 text-[10px] font-bold disabled:opacity-40" style={{ borderColor: "#dbe4f2", color: "#174be8" }}>
                            {r.qa === "approved" ? "Skip" : "Include"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {done ? (
                <div className="rounded-lg border p-3 text-xs" style={{ borderColor: "#bce5cf", backgroundColor: "#e6f7ef", color: "#0a8f5a" }}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-black"><CheckCircle2 size={14} /> Imported {done.inserted}, skipped {done.rejected}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={undoImport} disabled={undoing} className="flex items-center gap-1 rounded-lg border px-3 py-1.5 font-black disabled:opacity-50" style={{ borderColor: "#ef4444", color: "#ef4444", backgroundColor: "#ffffff" }}>
                        {undoing ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />} Undo this import
                      </button>
                      <button onClick={onClose} className="rounded-lg px-3 py-1.5 font-black text-white" style={{ backgroundColor: "#174be8" }}>Close</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <button onClick={runImport} disabled={importing || counts.approved === 0} className="rounded-lg px-4 py-2 text-xs font-black text-white disabled:opacity-50" style={{ backgroundColor: "#174be8" }}>
                    {importing ? <span className="flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Importing…</span> : `Import ${counts.approved} candidates`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
