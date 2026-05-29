import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { X, Upload, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Step = 1 | 2 | 3 | 4;
type Segment = "Teacher" | "Retired Teacher" | "Camp/Enrichment" | "Other";
type QaStatus = "pending" | "approved" | "rejected";

type StagedRow = {
  email: string;
  first_name: string;
  last_name: string;
  company: string;
  city: string;
  segment: string;
  qa_status: QaStatus;
  rejection_reason?: string;
};

type SmartLeadCampaign = { id: number | string; name: string; status?: string };

const FIELDS = ["email", "first_name", "last_name", "company", "city", "segment"] as const;
type Field = (typeof FIELDS)[number];

const callProxy = async (endpoint: string, method: string, payload?: unknown) => {
  const { data, error } = await supabase.functions.invoke("smartlead-proxy", {
    body: { endpoint, method, payload },
  });
  if (error) throw error;
  return data;
};

const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export function ImportLeadsWizard({ open, onClose, onComplete }: { open: boolean; onClose: () => void; onComplete?: () => void }) {
  const [step, setStep] = useState<Step>(1);
  // Step 1
  const [batchName, setBatchName] = useState("");
  const [source, setSource] = useState("Apollo");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [segment, setSegment] = useState<Segment>("Teacher");
  // Step 2
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<Field, string>>({ email: "", first_name: "", last_name: "", company: "", city: "", segment: "" });
  // Step 3
  const [batchId, setBatchId] = useState<string | null>(null);
  const [staged, setStaged] = useState<StagedRow[]>([]);
  // Step 4
  const [campaigns, setCampaigns] = useState<SmartLeadCampaign[]>([]);
  const [destCampaignId, setDestCampaignId] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentSummary, setSentSummary] = useState<{ ok: number; total: number } | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 });

  useEffect(() => {
    if (!open) {
      setStep(1); setBatchName(""); setSource("Apollo"); setCity(""); setState(""); setSegment("Teacher");
      setCsvHeaders([]); setCsvRows([]); setMapping({ email: "", first_name: "", last_name: "", company: "", city: "", segment: "" });
      setBatchId(null); setStaged([]); setCampaigns([]); setDestCampaignId(""); setImporting(false); setSent(false); setSentSummary(null); setProgress({ done: 0, total: 0, errors: 0 });
    }
  }, [open]);

  const handleCsv = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const headers = res.meta.fields ?? [];
        setCsvHeaders(headers);
        setCsvRows(res.data);
        // auto-map by header name
        const next = { ...mapping };
        for (const f of FIELDS) {
          const m = headers.find((h) => h.toLowerCase().replace(/[^a-z]/g, "") === f.replace(/_/g, ""));
          if (m) next[f] = m;
        }
        setMapping(next);
      },
      error: (e) => toast.error(`CSV parse error: ${e.message}`),
    });
  };

  const goStep3 = async () => {
    if (!mapping.email) { toast.error("Map the 'email' column to continue."); return; }
    // create batch
    const { data: batch, error } = await supabase.from("teacher_import_batches").insert({
      batch_name: batchName || `${source} • ${city || "—"} • ${new Date().toISOString().slice(0, 10)}`,
      source, city, state, segment, status: "pending", record_count: csvRows.length, approved_count: 0,
    }).select("id").single();
    if (error || !batch) { toast.error(`Could not create batch: ${error?.message}`); return; }
    setBatchId(batch.id);

    // build staged rows with QA flags
    const seen = new Set<string>();
    const rows: StagedRow[] = csvRows.map((r) => {
      const email = (r[mapping.email] ?? "").trim().toLowerCase();
      let status: QaStatus = "approved"; let reason: string | undefined;
      if (!email) { status = "rejected"; reason = "Missing email"; }
      else if (!isValidEmail(email)) { status = "rejected"; reason = "Invalid email format"; }
      else if (seen.has(email)) { status = "rejected"; reason = "Duplicate in batch"; }
      seen.add(email);
      return {
        email,
        first_name: r[mapping.first_name] ?? "",
        last_name: r[mapping.last_name] ?? "",
        company: r[mapping.company] ?? "",
        city: r[mapping.city] ?? city,
        segment: r[mapping.segment] ?? segment,
        qa_status: status, rejection_reason: reason,
      };
    });
    setStaged(rows);
    setStep(3);
  };

  const goStep4 = async () => {
    if (!batchId) return;
    // persist staged + update approved_count
    const approved = staged.filter((r) => r.qa_status === "approved").length;
    const payload = staged.map((r) => ({
      batch_id: batchId, email: r.email, first_name: r.first_name, last_name: r.last_name,
      company: r.company, city: r.city, segment: r.segment, qa_status: r.qa_status, rejection_reason: r.rejection_reason ?? null,
    }));
    // chunk inserts to avoid huge single payload
    for (let i = 0; i < payload.length; i += 500) {
      const { error } = await supabase.from("prospects_staging").insert(payload.slice(i, i + 500));
      if (error) { toast.error(`Failed to save staged rows: ${error.message}`); return; }
    }
    await supabase.from("teacher_import_batches").update({ approved_count: approved }).eq("id", batchId);
    // fetch campaigns for destination dropdown
    try {
      const data = await callProxy("campaigns/", "GET");
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(`Could not list campaigns: ${(e as Error).message}`);
    }
    setStep(4);
  };

  const toggleRow = (i: number, status: QaStatus) => setStaged((prev) => prev.map((r, idx) => idx === i ? { ...r, qa_status: status, rejection_reason: status === "rejected" ? (r.rejection_reason ?? "Manually rejected") : undefined } : r));
  const bulkApprove = () => setStaged((prev) => prev.map((r) => r.qa_status === "rejected" && !r.rejection_reason?.match(/email|format/i) ? { ...r, qa_status: "approved", rejection_reason: undefined } : r));
  const bulkRejectInvalid = () => setStaged((prev) => prev.map((r) => !isValidEmail(r.email) ? { ...r, qa_status: "rejected", rejection_reason: r.rejection_reason ?? "Invalid email" } : r));

  const counts = useMemo(() => ({
    total: staged.length,
    approved: staged.filter((r) => r.qa_status === "approved").length,
    rejected: staged.filter((r) => r.qa_status === "rejected").length,
  }), [staged]);

  const runImport = async () => {
    if (!destCampaignId || !batchId) { toast.error("Pick a destination campaign."); return; }
    if (importing || sent) return; // hard guard against double-clicks / replays
    setImporting(true);
    await supabase.from("teacher_import_batches").update({ status: "importing", campaign_id: destCampaignId }).eq("id", batchId);
    const approved = staged.filter((r) => r.qa_status === "approved");
    const CHUNK = 400; let errors = 0;
    setProgress({ done: 0, total: approved.length, errors: 0 });
    for (let i = 0; i < approved.length; i += CHUNK) {
      const chunk = approved.slice(i, i + CHUNK).map((r) => ({
        first_name: r.first_name, last_name: r.last_name, email: r.email,
        company_name: r.company, location: r.city, custom_fields: { segment: r.segment },
      }));
      try {
        await callProxy(`campaigns/${destCampaignId}/leads`, "POST", { lead_list: chunk });
      } catch (e) {
        errors += chunk.length;
        console.error("SmartLead import chunk failed:", e);
      }
      setProgress({ done: Math.min(i + CHUNK, approved.length), total: approved.length, errors });
      if (i + CHUNK < approved.length) await new Promise((r) => setTimeout(r, 500));
    }
    const finalStatus = errors === approved.length && approved.length > 0 ? "failed" : "complete";
    await supabase.from("teacher_import_batches").update({ status: finalStatus }).eq("id", batchId);
    setImporting(false);
    setSent(true);
    setSentSummary({ ok: approved.length - errors, total: approved.length });
    toast.success(`Import ${finalStatus}: ${approved.length - errors}/${approved.length} sent to SmartLead.`);
    onComplete?.();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <aside className="h-full w-full max-w-[760px] overflow-y-auto border-l border-[#e7edf5] bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#edf2f8] bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-black">Import Leads to SmartLead</h2>
            <div className="mt-1 flex items-center gap-2 text-[11px] font-bold text-[#526078]">
              {(["Batch", "Upload + Map", "QA Review", "Import"] as const).map((label, i) => {
                const n = (i + 1) as Step;
                const active = step === n; const done = step > n;
                return <span key={label} className={`flex items-center gap-1 ${active ? "text-[#174be8]" : done ? "text-[#0a8f5a]" : "text-[#8794ab]"}`}>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${active ? "bg-[#174be8] text-white" : done ? "bg-[#0a8f5a] text-white" : "bg-[#eef2f7]"}`}>{n}</span>{label}
                </span>;
              })}
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-[#526078] hover:bg-[#f7faff]"><X size={18} /></button>
        </div>

        <div className="p-5">
          {step === 1 && (
            <div className="space-y-3">
              <Field label="Batch name"><input value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="e.g. Austin TX teachers — May 2026" className="input" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Source"><select value={source} onChange={(e) => setSource(e.target.value)} className="input">{["Test Leads (temp emails)", "Apollo", "Clay", "LinkedIn Navigator", "DonorsChoose", "Apify", "Manual CSV", "Other"].map((s) => <option key={s}>{s}</option>)}</select></Field>
                <Field label="Segment"><select value={segment} onChange={(e) => setSegment(e.target.value as Segment)} className="input">{(["Teacher", "Retired Teacher", "Camp/Enrichment", "Other"] as Segment[]).map((s) => <option key={s}>{s}</option>)}</select></Field>
                <Field label="City"><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Austin" className="input" /></Field>
                <Field label="State"><input value={state} onChange={(e) => setState(e.target.value)} placeholder="TX" className="input" /></Field>
              </div>
              <div className="flex justify-end pt-2"><button onClick={() => setStep(2)} className="btn-primary">Continue</button></div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#dbe4f2] bg-[#fbfdff] py-8 text-sm font-bold text-[#174be8] hover:bg-[#f7faff]">
                <Upload size={16} /> {csvRows.length ? `${csvRows.length} rows loaded — replace CSV` : "Upload CSV file"}
                <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleCsv(e.target.files[0])} />
              </label>
              {csvHeaders.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-black text-[#34445f]">Map columns</div>
                  {FIELDS.map((f) => (
                    <div key={f} className="grid grid-cols-[140px_1fr] items-center gap-2">
                      <label className="text-xs font-bold text-[#34445f]">{f}{f === "email" && <span className="text-[#ef4444]"> *</span>}</label>
                      <select value={mapping[f]} onChange={(e) => setMapping({ ...mapping, [f]: e.target.value })} className="input">
                        <option value="">— not mapped —</option>
                        {csvHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between pt-2"><button onClick={() => setStep(1)} className="btn-secondary">Back</button><button disabled={!csvRows.length} onClick={goStep3} className="btn-primary disabled:opacity-50">Continue</button></div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="rounded-md bg-[#eef4ff] px-2 py-1 font-bold text-[#174be8]">Total {counts.total}</span>
                <span className="rounded-md bg-[#e6f7ef] px-2 py-1 font-bold text-[#0a8f5a]">Approved {counts.approved}</span>
                <span className="rounded-md bg-[#fff1f1] px-2 py-1 font-bold text-[#ef4444]">Rejected {counts.rejected}</span>
                <div className="ml-auto flex gap-2">
                  <button onClick={bulkApprove} className="btn-secondary">Approve all manual rejects</button>
                  <button onClick={bulkRejectInvalid} className="btn-secondary">Reject invalid emails</button>
                </div>
              </div>
              <div className="max-h-[460px] overflow-y-auto rounded-lg border border-[#edf2f8]">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-[#f7faff]"><tr className="text-left text-[9px] uppercase text-[#8794ab]"><th className="px-2 py-2">Email</th><th>Name</th><th>City</th><th>Status</th><th className="text-right">Action</th></tr></thead>
                  <tbody>{staged.map((r, i) => (
                    <tr key={i} className="border-t border-[#edf2f8]">
                      <td className="px-2 py-1.5">{r.email || <span className="text-[#ef4444]">(missing)</span>}</td>
                      <td>{r.first_name} {r.last_name}</td>
                      <td>{r.city}</td>
                      <td>{r.qa_status === "approved" ? <span className="inline-flex items-center gap-1 font-bold text-[#0a8f5a]"><CheckCircle2 size={11} /> Approved</span> : <span className="inline-flex items-center gap-1 font-bold text-[#ef4444]" title={r.rejection_reason}><AlertTriangle size={11} /> Rejected</span>}</td>
                      <td className="text-right"><button onClick={() => toggleRow(i, r.qa_status === "approved" ? "rejected" : "approved")} className="rounded-md border border-[#dbe4f2] px-2 py-1 text-[10px] font-bold text-[#174be8]">{r.qa_status === "approved" ? "Reject" : "Approve"}</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="flex justify-between pt-2"><button onClick={() => setStep(2)} className="btn-secondary">Back</button><button disabled={counts.approved === 0} onClick={goStep4} className="btn-primary disabled:opacity-50">Continue</button></div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <Field label="Destination SmartLead campaign">
                <select value={destCampaignId} onChange={(e) => setDestCampaignId(e.target.value)} className="input">
                  <option value="">— pick a campaign —</option>
                  {campaigns.map((c) => <option key={c.id} value={String(c.id)}>{c.name} {c.status ? `(${c.status})` : ""}</option>)}
                </select>
                {campaigns.length === 0 && <p className="mt-2 text-[11px] text-[#b7791f]">No campaigns found in SmartLead. Create one first, then come back.</p>}
              </Field>
              <div className="rounded-lg border border-[#edf2f8] bg-[#fbfdff] p-3 text-xs">
                <div className="font-black">Ready to import</div>
                <div className="mt-1 text-[#526078]">{counts.approved} approved leads · chunks of 400 · 500ms gap</div>
              </div>
              {importing && (
                <div className="rounded-lg border border-[#dbe4f2] p-3 text-xs">
                  <div className="flex items-center justify-between font-bold"><span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Importing…</span><span>{progress.done}/{progress.total} {progress.errors > 0 && <span className="text-[#ef4444]">· {progress.errors} errors</span>}</span></div>
                  <div className="mt-2 h-2 rounded-full bg-[#eef2f7]"><div className="h-2 rounded-full bg-[#174be8] transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
                </div>
              )}
              {sent && sentSummary && (
                <div className="rounded-lg border border-[#bce5cf] bg-[#e6f7ef] p-3 text-xs text-[#0a8f5a]">
                  <div className="flex items-center gap-2 font-black"><CheckCircle2 size={14} /> Sent — {sentSummary.ok}/{sentSummary.total} imported to SmartLead</div>
                  <div className="mt-1 text-[#0a8f5a]/80">This batch is locked. Close the wizard and start a new import to send more.</div>
                </div>
              )}
              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(3)} disabled={importing || sent} className="btn-secondary disabled:opacity-50">Back</button>
                {sent ? (
                  <button onClick={onClose} className="btn-primary">Close</button>
                ) : (
                  <button onClick={runImport} disabled={importing || !destCampaignId} className="btn-primary disabled:opacity-50">{importing ? <span className="inline-flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Sending…</span> : `Send ${counts.approved} to SmartLead`}</button>
                )}
              </div>
            </div>
          )}
        </div>
        <style>{`
          .input{height:36px;width:100%;border:1px solid #dbe4f2;border-radius:8px;padding:0 10px;font-size:13px;background:#fff;outline:none}
          .input:focus{border-color:#174be8}
          .btn-primary{background:#174be8;color:#fff;font-weight:700;font-size:12px;padding:8px 14px;border-radius:8px}
          .btn-secondary{background:#fff;border:1px solid #dbe4f2;color:#174be8;font-weight:700;font-size:12px;padding:8px 12px;border-radius:8px}
        `}</style>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-xs font-bold text-[#34445f]">{label}</label>{children}</div>;
}
