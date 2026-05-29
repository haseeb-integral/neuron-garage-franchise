import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { X, Upload, CheckCircle2, AlertTriangle, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Step = 1 | 2 | 3;
type SourceKey = "smartlead_csv" | "linkedin_danish";

type StagedRow = {
  // canonical
  name: string;
  email: string | null;
  school: string | null;
  city: string;
  state: string;
  linkedin_url: string | null;
  teacher_type: "active";
  enrichment_source: SourceKey;
  verification_status: string | null;
  needs_email_enrichment: boolean;
  status: string;
  raw: Record<string, unknown>;
  // QA
  qa_status: "approved" | "rejected";
  rejection_reason?: string;
};

const TEACHER_RE = /\b(teacher|kindergarten|instructor|educator|paraprofessional)\b/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeLinkedin = (u: string | null | undefined): string | null => {
  if (!u) return null;
  const s = u.trim().toLowerCase();
  if (!s) return null;
  return s.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
};

const splitCity = (raw: string | null | undefined): string => {
  if (!raw) return "";
  return raw.split(",")[0].trim();
};

const trimAll = (v: string | null | undefined) => (v ?? "").trim();

// Map a CSV row to a StagedRow given the source preset
function mapRow(source: SourceKey, r: Record<string, string>): StagedRow | { skip: true; reason: string } {
  if (source === "smartlead_csv") {
    const title = trimAll(r["title"]);
    const first = trimAll(r["firstName"]);
    const last = trimAll(r["lastName"]);
    const email = trimAll(r["email"]).toLowerCase() || null;
    const verification = trimAll(r["verificationStatus"]).toLowerCase() || null;
    const city = trimAll(r["city"]);
    const state = trimAll(r["state"]);
    const linkedin = normalizeLinkedin(r["linkedin"]);
    const school = trimAll(r["companyName"]) || null;

    if (!TEACHER_RE.test(title)) return { skip: true, reason: `Title not teacher-like: "${title}"` };
    if (!city || !state) return { skip: true, reason: "Missing city/state" };

    let qa: StagedRow["qa_status"] = "approved";
    let reason: string | undefined;
    let status = "new";
    let needsEnrich = false;
    if (!email) {
      needsEnrich = true;
      status = "linkedin_only";
    } else if (verification === "invalid" || verification === "not_found") {
      // Import but exclude from campaigns
      status = "email_unverified";
    } else if (!EMAIL_RE.test(email)) {
      qa = "rejected";
      reason = "Email malformed";
    }

    return {
      name: `${first} ${last}`.trim() || "(Unknown)",
      email,
      school,
      city,
      state,
      linkedin_url: linkedin,
      teacher_type: "active",
      enrichment_source: "smartlead_csv",
      verification_status: verification,
      needs_email_enrichment: needsEnrich,
      status,
      raw: r,
      qa_status: qa,
      rejection_reason: reason,
    };
  }

  // linkedin_danish
  const title = trimAll(r["Job title"]);
  const first = trimAll(r["First Name"]);
  const last = trimAll(r["Last Name"]);
  const city = splitCity(r["City"]);
  const state = trimAll(r["State"]);
  const linkedin = normalizeLinkedin(r["Linkedin"]);
  const school = trimAll(r["Company name"]) || null;

  if (!TEACHER_RE.test(title)) return { skip: true, reason: `Title not teacher-like: "${title}"` };
  if (!city || !state) return { skip: true, reason: "Missing city/state" };
  if (!linkedin) return { skip: true, reason: "Missing LinkedIn URL (no dedup key)" };

  return {
    name: `${first} ${last}`.trim() || "(Unknown)",
    email: null,
    school,
    city,
    state,
    linkedin_url: linkedin,
    teacher_type: "active",
    enrichment_source: "linkedin_danish",
    verification_status: null,
    needs_email_enrichment: true,
    status: "linkedin_only",
    raw: r,
    qa_status: "approved",
  };
}

export function TeacherImportWizard({ open, onClose, onComplete }: { open: boolean; onClose: () => void; onComplete?: () => void }) {
  const [step, setStep] = useState<Step>(1);
  const [source, setSource] = useState<SourceKey>("smartlead_csv");
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [staged, setStaged] = useState<StagedRow[]>([]);
  const [skipped, setSkipped] = useState<{ reason: string; row: Record<string, string> }[]>([]);
  const [dupes, setDupes] = useState<{ emails: Set<string>; linkedins: Set<string> }>({ emails: new Set(), linkedins: new Set() });
  const [checkingDupes, setCheckingDupes] = useState(false);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<{ inserted: number; skipped: number; rejected: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setStep(1); setSource("smartlead_csv"); setRawRows([]); setStaged([]); setSkipped([]);
      setDupes({ emails: new Set(), linkedins: new Set() }); setImporting(false); setDone(null);
    }
  }, [open]);

  const handleCsv = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        setRawRows(res.data);
        toast.success(`Loaded ${res.data.length} rows`);
      },
      error: (e) => toast.error(`CSV parse error: ${e.message}`),
    });
  };

  const goReview = async () => {
    if (!rawRows.length) { toast.error("Upload a CSV first."); return; }
    setCheckingDupes(true);

    // 1. Map + auto-skip non-teachers
    const mapped: StagedRow[] = [];
    const skip: typeof skipped = [];
    const seenEmail = new Set<string>();
    const seenLinkedin = new Set<string>();
    for (const r of rawRows) {
      const out = mapRow(source, r);
      if ("skip" in out) { skip.push({ reason: out.reason, row: r }); continue; }
      // intra-file dedup
      if (out.email && seenEmail.has(out.email)) { skip.push({ reason: `Duplicate email in file: ${out.email}`, row: r }); continue; }
      if (!out.email && out.linkedin_url && seenLinkedin.has(out.linkedin_url)) { skip.push({ reason: `Duplicate LinkedIn in file: ${out.linkedin_url}`, row: r }); continue; }
      if (out.email) seenEmail.add(out.email);
      if (out.linkedin_url) seenLinkedin.add(out.linkedin_url);
      mapped.push(out);
    }

    // 2. Cross-file dedup: query DB for existing emails + linkedins
    const emails = mapped.map((m) => m.email).filter(Boolean) as string[];
    const linkedins = mapped.map((m) => m.linkedin_url).filter(Boolean) as string[];
    const existingEmails = new Set<string>();
    const existingLinkedins = new Set<string>();
    try {
      if (emails.length) {
        const { data } = await supabase.from("teacher_prospects").select("email").in("email", emails);
        (data ?? []).forEach((d: any) => d.email && existingEmails.add(String(d.email).toLowerCase()));
      }
      if (linkedins.length) {
        const { data } = await supabase.from("teacher_prospects").select("linkedin_url").in("linkedin_url", linkedins);
        (data ?? []).forEach((d: any) => d.linkedin_url && existingLinkedins.add(String(d.linkedin_url).toLowerCase()));
      }
    } catch (e) {
      toast.error(`Dedup check failed: ${(e as Error).message}`);
    }

    // Mark DB dupes as rejected
    const withDupes = mapped.map((m) => {
      const eDupe = m.email && existingEmails.has(m.email);
      const lDupe = !m.email && m.linkedin_url && existingLinkedins.has(m.linkedin_url);
      if (eDupe || lDupe) {
        return { ...m, qa_status: "rejected" as const, rejection_reason: eDupe ? "Email already in DB" : "LinkedIn already in DB" };
      }
      return m;
    });

    setStaged(withDupes);
    setSkipped(skip);
    setDupes({ emails: existingEmails, linkedins: existingLinkedins });
    setCheckingDupes(false);
    setStep(3);
  };

  const counts = useMemo(() => ({
    total: staged.length,
    approved: staged.filter((r) => r.qa_status === "approved").length,
    rejected: staged.filter((r) => r.qa_status === "rejected").length,
    linkedinOnly: staged.filter((r) => r.qa_status === "approved" && !r.email).length,
    unverified: staged.filter((r) => r.qa_status === "approved" && r.status === "email_unverified").length,
  }), [staged]);

  const toggleRow = (i: number) => setStaged((prev) => prev.map((r, idx) => idx === i ? { ...r, qa_status: r.qa_status === "approved" ? "rejected" : "approved", rejection_reason: r.qa_status === "approved" ? "Manually rejected" : undefined } : r));

  const runImport = async () => {
    if (importing || done) return;
    const approved = staged.filter((r) => r.qa_status === "approved");
    if (!approved.length) { toast.error("Nothing to import."); return; }
    setImporting(true);
    const payload = approved.map((r) => ({
      name: r.name, email: r.email, school: r.school, city: r.city, state: r.state,
      linkedin_url: r.linkedin_url, teacher_type: r.teacher_type,
      enrichment_source: r.enrichment_source, verification_status: r.verification_status,
      needs_email_enrichment: r.needs_email_enrichment, status: r.status,
      raw: r.raw as any, last_enriched_at: new Date().toISOString(),
    }));
    let inserted = 0;
    const CHUNK = 500;
    for (let i = 0; i < payload.length; i += CHUNK) {
      const slice = payload.slice(i, i + CHUNK);
      const { error, count } = await supabase.from("teacher_prospects").insert(slice, { count: "exact" });
      if (error) { toast.error(`Insert failed at chunk ${i}: ${error.message}`); break; }
      inserted += count ?? slice.length;
    }
    setImporting(false);
    setDone({ inserted, skipped: skipped.length, rejected: counts.rejected });
    toast.success(`Imported ${inserted} teacher prospects.`);
    onComplete?.();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <aside className="h-full w-full max-w-[820px] overflow-y-auto border-l border-[#e7edf5] bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#edf2f8] bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-black">Import Teacher Prospects</h2>
            <div className="mt-1 flex items-center gap-2 text-[11px] font-bold text-[#526078]">
              {(["Source", "Upload", "Review & Import"] as const).map((label, i) => {
                const n = (i + 1) as Step;
                const active = step === n; const stepDone = step > n;
                return <span key={label} className={`flex items-center gap-1 ${active ? "text-[#174be8]" : stepDone ? "text-[#0a8f5a]" : "text-[#8794ab]"}`}>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${active ? "bg-[#174be8] text-white" : stepDone ? "bg-[#0a8f5a] text-white" : "bg-[#eef2f7]"}`}>{n}</span>{label}
                </span>;
              })}
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-[#526078] hover:bg-[#f7faff]"><X size={18} /></button>
        </div>

        <div className="p-5">
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-xs font-black text-[#34445f]">Pick the CSV format you're uploading</div>
              {([
                { key: "smartlead_csv" as const, title: "SmartLead enriched export", desc: "20 columns including firstName, lastName, title, companyName, email, linkedin, verificationStatus.", expectsEmail: true },
                { key: "linkedin_danish" as const, title: "LinkedIn scrape (Danish)", desc: "8 columns: First Name, Last Name, Linkedin, Job title, City, State, Location, Company name. No email — leads will be queued for email enrichment.", expectsEmail: false },
              ]).map((opt) => (
                <label key={opt.key} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${source === opt.key ? "border-[#174be8] bg-[#f4f7ff]" : "border-[#e7edf5] hover:bg-[#fbfdff]"}`}>
                  <input type="radio" checked={source === opt.key} onChange={() => setSource(opt.key)} className="mt-1" />
                  <div className="flex-1">
                    <div className="text-sm font-black text-[#07142f]">{opt.title}</div>
                    <div className="mt-0.5 text-[11px] text-[#526078]">{opt.desc}</div>
                  </div>
                </label>
              ))}
              <div className="rounded-lg border border-[#fde9b8] bg-[#fffbef] p-3 text-[11px] text-[#7c5a08]">
                <div className="flex items-start gap-2"><Info size={13} className="mt-0.5 shrink-0" /><div>
                  <div className="font-bold">Auto-skip rule</div>
                  <div className="mt-0.5">Rows whose job title doesn't contain "teacher", "kindergarten", "instructor", "educator", or "paraprofessional" are skipped (with reason logged).</div>
                </div></div>
              </div>
              <div className="flex justify-end pt-2"><button onClick={() => setStep(2)} className="rounded-lg bg-[#174be8] px-4 py-2 text-xs font-black text-white">Continue</button></div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#dbe4f2] bg-[#fbfdff] py-8 text-sm font-bold text-[#174be8] hover:bg-[#f7faff]">
                <Upload size={16} /> {rawRows.length ? `${rawRows.length} rows loaded — replace CSV` : "Upload CSV file"}
                <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleCsv(e.target.files[0])} />
              </label>
              {rawRows.length > 0 && (
                <div className="rounded-lg border border-[#edf2f8] bg-[#fbfdff] p-3 text-[11px] text-[#526078]">
                  <div className="font-bold text-[#34445f]">Detected columns:</div>
                  <div className="mt-1 break-all">{Object.keys(rawRows[0] ?? {}).join(", ") || "(none)"}</div>
                </div>
              )}
              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(1)} className="rounded-lg border border-[#dbe4f2] px-4 py-2 text-xs font-black text-[#174be8]">Back</button>
                <button disabled={!rawRows.length || checkingDupes} onClick={goReview} className="rounded-lg bg-[#174be8] px-4 py-2 text-xs font-black text-white disabled:opacity-50">
                  {checkingDupes ? <span className="flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Checking dupes…</span> : "Review"}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md bg-[#eef4ff] px-2 py-1 font-bold text-[#174be8]">Mapped {counts.total}</span>
                <span className="rounded-md bg-[#e6f7ef] px-2 py-1 font-bold text-[#0a8f5a]">Approved {counts.approved}</span>
                <span className="rounded-md bg-[#fff1f1] px-2 py-1 font-bold text-[#ef4444]">Rejected {counts.rejected}</span>
                <span className="rounded-md bg-[#fff4df] px-2 py-1 font-bold text-[#f59e0b]" title="Auto-skipped non-teachers / missing required cols">Skipped {skipped.length}</span>
                {counts.linkedinOnly > 0 && <span className="rounded-md bg-[#eef2f7] px-2 py-1 font-bold text-[#526078]" title="No email — queued for enrichment">LinkedIn-only {counts.linkedinOnly}</span>}
                {counts.unverified > 0 && <span className="rounded-md bg-[#eef2f7] px-2 py-1 font-bold text-[#526078]" title="Email present but invalid/not_found — excluded from campaigns">Unverified {counts.unverified}</span>}
              </div>

              <div className="max-h-[440px] overflow-y-auto rounded-lg border border-[#edf2f8]">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-[#f7faff]">
                    <tr className="text-left text-[9px] uppercase text-[#8794ab]">
                      <th className="px-2 py-2">Name</th><th>Email</th><th>School</th><th>City</th><th>Status</th><th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staged.map((r, i) => (
                      <tr key={i} className="border-t border-[#edf2f8]">
                        <td className="px-2 py-1.5 font-bold text-[#07142f]">{r.name}</td>
                        <td className="text-[#526078]">{r.email || <span className="text-[#8794ab]">(linkedin-only)</span>}</td>
                        <td className="text-[#526078]">{r.school || "—"}</td>
                        <td className="text-[#526078]">{r.city}, {r.state}</td>
                        <td>
                          {r.qa_status === "approved"
                            ? <span className="inline-flex items-center gap-1 font-bold text-[#0a8f5a]"><CheckCircle2 size={11} /> {r.status}</span>
                            : <span className="inline-flex items-center gap-1 font-bold text-[#ef4444]" title={r.rejection_reason}><AlertTriangle size={11} /> {r.rejection_reason}</span>}
                        </td>
                        <td className="text-right"><button onClick={() => toggleRow(i)} className="rounded-md border border-[#dbe4f2] px-2 py-1 text-[10px] font-bold text-[#174be8]">{r.qa_status === "approved" ? "Reject" : "Approve"}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {skipped.length > 0 && (
                <details className="rounded-lg border border-[#edf2f8] bg-[#fbfdff] p-2 text-[11px]">
                  <summary className="cursor-pointer font-bold text-[#34445f]">{skipped.length} skipped rows (click to expand)</summary>
                  <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-[#526078]">
                    {skipped.slice(0, 50).map((s, i) => <li key={i}>• {s.reason}</li>)}
                    {skipped.length > 50 && <li className="text-[#8794ab]">… and {skipped.length - 50} more</li>}
                  </ul>
                </details>
              )}

              {done && (
                <div className="rounded-lg border border-[#bce5cf] bg-[#e6f7ef] p-3 text-xs text-[#0a8f5a]">
                  <div className="flex items-center gap-2 font-black"><CheckCircle2 size={14} /> Done — inserted {done.inserted}, rejected {done.rejected}, skipped {done.skipped}</div>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(2)} disabled={importing || !!done} className="rounded-lg border border-[#dbe4f2] px-4 py-2 text-xs font-black text-[#174be8] disabled:opacity-50">Back</button>
                {done ? (
                  <button onClick={onClose} className="rounded-lg bg-[#174be8] px-4 py-2 text-xs font-black text-white">Close</button>
                ) : (
                  <button onClick={runImport} disabled={importing || counts.approved === 0} className="rounded-lg bg-[#174be8] px-4 py-2 text-xs font-black text-white disabled:opacity-50">
                    {importing ? <span className="flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Importing…</span> : `Import ${counts.approved} teachers`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
