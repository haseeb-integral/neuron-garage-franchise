import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Sparkles, Loader2, CheckCircle2, ArrowRight, ArrowLeft, Database, Send } from "lucide-react";

type Step = 1 | 2 | 3 | 4;
type Destination = "master_only" | "master_and_smartlead";

const TARGET_FIELDS = [
  "first_name", "last_name", "name", "email", "school", "district",
  "city", "state", "grade", "subject", "teacher_type", "experience_years",
  "linkedin_url", "phone",
] as const;
type TargetField = (typeof TARGET_FIELDS)[number];

const REQUIRED: TargetField[] = ["state", "city"]; // teacher_prospects requires city+state NOT NULL

type Mapping = Partial<Record<TargetField, string | null>>;

interface SLCampaign { id: string; name: string; status?: string }

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export function MasterPoolImportWizard({ open, onClose, onComplete }: { open: boolean; onClose: () => void; onComplete?: () => void }) {
  const [step, setStep] = useState<Step>(1);
  // Step 1
  const [batchName, setBatchName] = useState("");
  const [source, setSource] = useState("Manus");
  const [destination, setDestination] = useState<Destination>("master_only");
  const [defaultCity, setDefaultCity] = useState("");
  const [defaultState, setDefaultState] = useState("");
  // Step 2
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [unmapped, setUnmapped] = useState<string[]>([]);
  const [aiReasoning, setAiReasoning] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  // Step 3
  const [qa, setQa] = useState<{ total: number; withEmail: number; validEmail: number; inBatchDupes: number; existingInMaster: number; missingRequired: number } | null>(null);
  const [qaLoading, setQaLoading] = useState(false);
  // Step 4
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; batch_id: string } | null>(null);
  // Step 5
  const [campaigns, setCampaigns] = useState<SLCampaign[]>([]);
  const [destCampaignId, setDestCampaignId] = useState("");
  const [includeCatchAll, setIncludeCatchAll] = useState(false);
  const [pushing, setPushing] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1); setBatchName(""); setSource("Manus"); setDestination("master_only");
      setDefaultCity(""); setDefaultState("");
      setCsvHeaders([]); setCsvRows([]); setMapping({}); setUnmapped([]); setAiReasoning("");
      setQa(null); setImportResult(null); setDestCampaignId(""); setIncludeCatchAll(false);
    }
  }, [open]);

  // Auto-run QA the moment user lands on Review step
  useEffect(() => {
    if (step === 3 && !qa && !qaLoading) {
      computeQa();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---------- Step 2: CSV + AI mapping ---------- */
  const handleCsv = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true,
      complete: async (res) => {
        const headers = res.meta.fields ?? [];
        setCsvHeaders(headers);
        setCsvRows(res.data);
        // Naive auto-map first so user sees something instantly
        const naive: Mapping = {};
        for (const f of TARGET_FIELDS) {
          const m = headers.find((h) => norm(h) === norm(f) || norm(h) === norm(f.replace(/_/g, "")));
          if (m) naive[f] = m;
        }
        setMapping(naive);
        setUnmapped(headers.filter((h) => !Object.values(naive).includes(h)));
        // Then ask Lovable AI for a better mapping in the background
        setAiLoading(true);
        try {
          const { data, error } = await supabase.functions.invoke("csv-suggest-mapping", {
            body: { headers, sample_rows: res.data.slice(0, 5) },
          });
          if (!error && data?.mapping) {
            setMapping(data.mapping as Mapping);
            setUnmapped(data.unmapped ?? []);
            setAiReasoning(data.reasoning ?? "");
          }
        } catch (e) {
          console.warn("AI mapping failed, keeping naive mapping", e);
        } finally {
          setAiLoading(false);
        }
      },
      error: (e) => toast.error(`CSV parse error: ${e.message}`),
    });
  };

  /* ---------- Step 3: QA preview ---------- */
  const computeQa = async () => {
    setQaLoading(true);
    const tId = toast.loading(`Running QA on ${csvRows.length.toLocaleString()} rows…`);
    try {
      const emailCol = mapping.email;
      const fnCol = mapping.first_name;
      const lnCol = mapping.last_name;
      const stateCol = mapping.state;
      const cityCol = mapping.city;
      const seen = new Set<string>();
      const dedupeKeys: string[] = [];
      let withEmail = 0, validEmail = 0, inBatchDupes = 0, missingRequired = 0;
      for (const row of csvRows) {
        const email = (emailCol ? (row[emailCol] ?? "") : "").trim().toLowerCase();
        const cityV = cityCol ? (row[cityCol] ?? "").trim() : defaultCity.trim();
        const stateV = stateCol ? (row[stateCol] ?? "").trim() : defaultState.trim();
        if (!cityV || !stateV) missingRequired++;
        if (email) {
          withEmail++;
          if (isEmail(email)) validEmail++;
          if (seen.has(email)) inBatchDupes++; else seen.add(email);
          dedupeKeys.push(`email:${email}`);
        } else {
          const fn = (fnCol ? (row[fnCol] ?? "") : "").trim().toLowerCase();
          const ln = (lnCol ? (row[lnCol] ?? "") : "").trim().toLowerCase();
          dedupeKeys.push(`name:${fn}|${ln}||${stateV.toLowerCase()}|${cityV.toLowerCase()}`);
        }
      }
      const unique = Array.from(new Set(dedupeKeys));
      const CHUNK = 500;
      const CONCURRENCY = 8;
      const chunks = Array.from({ length: Math.ceil(unique.length / CHUNK) }, (_, index) =>
        unique.slice(index * CHUNK, (index + 1) * CHUNK),
      ).filter((chunk) => chunk.length > 0);

      let existingInMaster = 0;
      let completed = 0;

      for (let i = 0; i < chunks.length; i += CONCURRENCY) {
        const wave = chunks.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
          wave.map(async (chunk) => {
            const { data, error } = await supabase
              .from("teacher_prospects")
              .select("dedupe_key")
              .in("dedupe_key", chunk);
            if (error) throw new Error(`Dedupe check failed: ${error.message}`);
            return (data ?? []).length;
          }),
        );

        existingInMaster += results.reduce((sum, count) => sum + count, 0);
        completed += wave.length;
        toast.loading(`Checking duplicates… ${completed}/${chunks.length} batches`, { id: tId });
      }

      setQa({ total: csvRows.length, withEmail, validEmail, inBatchDupes, existingInMaster, missingRequired });
      toast.success(`QA complete — ${csvRows.length.toLocaleString()} rows analyzed.`, { id: tId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("QA preview failed", e);
      toast.error(`QA preview failed: ${msg}`, { id: tId });
    } finally {
      setQaLoading(false);
    }
  };

  /* ---------- Step 4: Insert into master pool ---------- */
  const runImport = async () => {
    setImporting(true);
    try {
      const { data: batch, error: bErr } = await supabase.from("teacher_import_batches").insert({
        batch_name: batchName || `${source} • ${defaultCity || "—"} • ${new Date().toISOString().slice(0, 10)}`,
        source,
        city: defaultCity || null,
        state: defaultState || null,
        destination,
        column_mapping: mapping as Record<string, string | null>,
        unmapped_columns: unmapped,
        status: "importing",
        record_count: csvRows.length,
      }).select("id").single();
      if (bErr || !batch) throw new Error(bErr?.message ?? "batch insert failed");

      const targetRows = csvRows.map((r) => {
        const get = (f: TargetField): string | null => {
          const col = mapping[f]; if (!col) return null;
          const v = (r[col] ?? "").trim(); return v === "" ? null : v;
        };
        const rawUnmapped: Record<string, string> = {};
        for (const col of unmapped) if (r[col]) rawUnmapped[col] = r[col];
        const email = (get("email") ?? "").toLowerCase() || null;
        const city = get("city") ?? (defaultCity || null);
        const state = get("state") ?? (defaultState || null);
        if (!city || !state) return null;
        const exp = get("experience_years");
        return {
          first_name: get("first_name"),
          last_name: get("last_name"),
          name: get("name") ?? ([get("first_name"), get("last_name")].filter(Boolean).join(" ") || null),
          email,
          school: get("school"),
          district: get("district"),
          city, state,
          grade: get("grade"),
          subject: get("subject"),
          teacher_type: get("teacher_type"),
          experience_years: exp && /^\d+$/.test(exp) ? parseInt(exp, 10) : null,
          linkedin_url: get("linkedin_url"),
          needs_email_enrichment: !email,
          status: "new",
          enrichment_source: source,
          import_batch_id: batch.id,
          raw: Object.keys(rawUnmapped).length ? rawUnmapped : null,
        };
      }).filter(Boolean) as Array<Record<string, unknown>>;

      // Chunked insert with progress
      const CHUNK = 500;
      const totalChunks = Math.max(1, Math.ceil(targetRows.length / CHUNK));
      const tId = toast.loading(`Importing ${targetRows.length.toLocaleString()} rows… 0/${totalChunks}`);
      let inserted = 0;
      try {
        for (let i = 0; i < targetRows.length; i += CHUNK) {
          const chunk = targetRows.slice(i, i + CHUNK);
          const { error } = await supabase.from("teacher_prospects").insert(chunk as never);
          if (error) throw new Error(`chunk starting at row ${i}: ${error.message}`);
          inserted += chunk.length;
          const done = Math.floor(i / CHUNK) + 1;
          toast.loading(`Importing… ${done}/${totalChunks} (${inserted.toLocaleString()} rows)`, { id: tId });
        }
      } catch (e) {
        await supabase.from("teacher_import_batches")
          .update({ status: "failed", approved_count: inserted, record_count: targetRows.length, dedupe_stats: { error: (e as Error).message, inserted_before_failure: inserted } })
          .eq("id", batch.id);
        toast.error(`Import failed after ${inserted.toLocaleString()} rows: ${(e as Error).message}`, { id: tId });
        throw e;
      }

      await supabase.from("teacher_import_batches")
        .update({ status: "complete", approved_count: inserted, record_count: targetRows.length })
        .eq("id", batch.id);

      setImportResult({ inserted, batch_id: batch.id });
      toast.success(`Imported ${inserted.toLocaleString()} teachers into Master Pool`, { id: tId });

      if (destination === "master_and_smartlead") {
        const { data } = await supabase.from("campaign_cache").select("id, name, status").order("name");
        setCampaigns((data ?? []) as SLCampaign[]);
        setStep(4);
      } else {
        onComplete?.();
        onClose();
      }
    } catch (e) {
      console.error("Master pool import failed", e);
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  /* ---------- Step 5: Optional push to SmartLead ---------- */
  const runPush = async () => {
    if (!destCampaignId || !importResult) return;
    setPushing(true);
    try {
      // Pull back the prospects we just inserted (with valid email)
      const { data: rows } = await supabase
        .from("teacher_prospects")
        .select("id")
        .eq("import_batch_id", importResult.batch_id)
        .not("email", "is", null).neq("email", "")
        .limit(5000);
      const ids = (rows ?? []).map((r) => r.id);
      if (!ids.length) { toast.warning("No emails to push"); return; }
      const { data, error } = await supabase.functions.invoke("smartlead-push-leads", {
        body: { campaign_id: destCampaignId, teacher_prospect_ids: ids, include_catch_all: includeCatchAll },
      });
      if (error) throw error;
      toast.success(`Pushed ${(data as { pushed: number }).pushed.toLocaleString()} leads to SmartLead`);
      onComplete?.();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPushing(false);
    }
  };

  /* ---------- Render ---------- */
  const canNext2 = csvRows.length > 0;
  const canNext3 = !!mapping.email || (!!defaultCity && !!defaultState); // at minimum geo OR email
  const canNext4 = !!qa;
  const canImport = qa && qa.total > 0 && qa.missingRequired < qa.total;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database size={16} className="text-[#174be8]" /> Import to Master Teacher Pool
          </DialogTitle>
        </DialogHeader>

        <StepBar step={step} destination={destination} />

        {step === 1 && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Batch name (optional)">
                <Input value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="e.g. Manus TX elementary batch 3" />
              </Field>
              <Field label="Source">
                <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Manus, Apollo, manual…" />
              </Field>
              <Field label="Default city (used if CSV has no city column)">
                <Input value={defaultCity} onChange={(e) => setDefaultCity(e.target.value)} />
              </Field>
              <Field label="Default state (used if CSV has no state column)">
                <Input value={defaultState} onChange={(e) => setDefaultState(e.target.value.toUpperCase().slice(0, 2))} placeholder="TX" />
              </Field>
            </div>
            <div>
              <Label className="text-xs font-bold">Destination</Label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <DestCard active={destination === "master_only"} onClick={() => setDestination("master_only")}
                  icon={<Database size={14} />} title="Master Pool only"
                  desc="Store in our database. Most rows won't have emails yet — that's OK." />
                <DestCard active={destination === "master_and_smartlead"} onClick={() => setDestination("master_and_smartlead")}
                  icon={<Send size={14} />} title="Master Pool + push to SmartLead"
                  desc="Store + send rows with verified emails to a SmartLead campaign." />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 text-sm">
            {csvRows.length === 0 ? (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#dbe4f2] bg-[#f7faff] p-8 text-center">
                <Upload size={20} className="mb-2 text-[#174be8]" />
                <div className="text-sm font-bold">Drop or pick a CSV</div>
                <div className="mt-1 text-xs text-[#526078]">Any column layout — Lovable AI will figure out the mapping.</div>
                <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleCsv(e.target.files[0])} />
              </label>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-[#526078]">{csvRows.length.toLocaleString()} rows · {csvHeaders.length} columns</div>
                  {aiLoading ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#174be8]"><Loader2 size={12} className="animate-spin" /> AI mapping…</span>
                  ) : aiReasoning ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#16a34a]"><Sparkles size={12} /> AI mapped</span>
                  ) : null}
                </div>
                {aiReasoning && <div className="rounded-md bg-[#eef4ff] p-2 text-[11px] italic text-[#0d3aa8]">{aiReasoning}</div>}
                <div className="max-h-72 overflow-auto rounded-lg border border-[#e7edf5]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[#f7faff]">
                      <tr><th className="p-2 text-left font-bold">Target field</th><th className="p-2 text-left font-bold">CSV column</th></tr>
                    </thead>
                    <tbody>
                      {TARGET_FIELDS.map((f) => (
                        <tr key={f} className="border-t border-[#edf2f8]">
                          <td className="p-2 font-mono">{f}{REQUIRED.includes(f) ? <span className="text-[#ef4444]">*</span> : ""}</td>
                          <td className="p-2">
                            <Select value={mapping[f] ?? "__none__"} onValueChange={(v) => setMapping({ ...mapping, [f]: v === "__none__" ? null : v })}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">— skip —</SelectItem>
                                {csvHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {unmapped.length > 0 && (
                  <div className="rounded-md border border-[#dbe4f2] bg-white p-2 text-[11px]">
                    <span className="font-bold">{unmapped.length} unmapped column{unmapped.length === 1 ? "" : "s"}:</span>{" "}
                    <span className="text-[#526078]">{unmapped.join(", ")}</span>
                    <div className="mt-1 text-[10px] text-[#8794ab]">These will be saved to the row's raw JSON field.</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 3 — Review & Import (QA runs automatically) */}
        {step === 3 && (
          <div className="space-y-3 text-sm">
            {qaLoading && !qa && (
              <div className="flex items-center justify-center gap-2 p-8 text-[#526078]">
                <Loader2 size={16} className="animate-spin text-[#174be8]" />
                <span className="text-xs">Running QA on {csvRows.length.toLocaleString()} rows…</span>
              </div>
            )}

            {qa && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                  <QaCard label="Total rows" value={qa.total} />
                  <QaCard label="With email" value={qa.withEmail} />
                  <QaCard label="Valid emails" value={qa.validEmail} tone="good" />
                  <QaCard label="In-batch dupes" value={qa.inBatchDupes} tone={qa.inBatchDupes > 0 ? "warn" : undefined} />
                  <QaCard label="Already in master" value={qa.existingInMaster} tone={qa.existingInMaster > 0 ? "warn" : undefined} />
                  <QaCard label="Missing city/state" value={qa.missingRequired} tone={qa.missingRequired > 0 ? "warn" : undefined} />
                </div>

                {qa.existingInMaster > 0 && (
                  <div className="rounded-md border border-[#fed7aa] bg-[#fff7ed] p-2 text-[11px] text-[#9a3412]">
                    {qa.existingInMaster.toLocaleString()} row{qa.existingInMaster === 1 ? "" : "s"} already exist in the Master Pool (matched by dedupe_key). Importing will create duplicate rows.
                  </div>
                )}
                {qa.missingRequired > 0 && (
                  <div className="rounded-md border border-[#fed7aa] bg-[#fff7ed] p-2 text-[11px] text-[#9a3412]">
                    {qa.missingRequired} row{qa.missingRequired === 1 ? "" : "s"} missing city/state will be skipped. Go Back and set defaults on Setup to keep them.
                  </div>
                )}

                {!importResult ? (
                  <div className="flex flex-col items-center gap-2 border-t border-[#edf2f8] pt-3">
                    <div className="text-xs text-[#526078]">
                      Ready to insert <strong className="text-[#07142f]">{(qa.total - qa.missingRequired).toLocaleString()}</strong> teachers into the Master Pool.
                    </div>
                    <Button onClick={runImport} disabled={importing || !canImport} className="bg-[#174be8] hover:bg-[#0d3aa8]">
                      {importing ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Database size={14} className="mr-1" />}
                      Import to Master Pool
                    </Button>
                    <button onClick={computeQa} disabled={qaLoading} className="text-[10px] text-[#8794ab] underline hover:text-[#526078]">
                      Re-run QA
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 border-t border-[#edf2f8] pt-3">
                    <CheckCircle2 size={28} className="text-[#16a34a]" />
                    <div className="text-sm font-bold">Inserted {importResult.inserted.toLocaleString()} rows</div>
                    {destination === "master_only" && <div className="text-xs text-[#526078]">Done. Close this window to continue.</div>}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 4 — SmartLead push (only when destination = master_and_smartlead) */}
        {step === 4 && importResult && (
          <div className="space-y-3 text-sm">
            <div className="text-xs text-[#526078]">Pick a SmartLead campaign to send the rows with valid emails into.</div>
            <Field label="Destination campaign">
              <Select value={destCampaignId} onValueChange={setDestCampaignId}>
                <SelectTrigger><SelectValue placeholder="Pick a SmartLead campaign…" /></SelectTrigger>
                <SelectContent>{campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div className="flex items-center gap-2">
              <Checkbox id="catchall2" checked={includeCatchAll} onCheckedChange={(v) => setIncludeCatchAll(!!v)} />
              <Label htmlFor="catchall2" className="cursor-pointer text-xs">Also include catch-all emails</Label>
            </div>
            <Button onClick={runPush} disabled={pushing || !destCampaignId} className="bg-[#174be8] hover:bg-[#0d3aa8]">
              {pushing ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Send size={14} className="mr-1" />}
              Push to SmartLead
            </Button>
          </div>
        )}

        {/* Footer nav */}
        <div className="mt-2 flex items-center justify-between border-t border-[#edf2f8] pt-3">
          <Button variant="ghost" size="sm" disabled={step === 1 || importing || pushing || qaLoading} onClick={() => setStep((s) => (s - 1) as Step)}>
            <ArrowLeft size={14} className="mr-1" /> Back
          </Button>
          <div className="text-[10px] text-[#8794ab]">Step {step} of {destination === "master_and_smartlead" ? 4 : 3}</div>
          {step < 3 && (
            <Button size="sm" disabled={(step === 1 && (!defaultState && !defaultCity ? false : false)) || (step === 2 && (!canNext2 || !canNext3))} onClick={() => setStep((s) => (s + 1) as Step)}>
              Next <ArrowRight size={14} className="ml-1" />
            </Button>
          )}
          {step === 3 && importResult && destination === "master_only" && (
            <Button size="sm" onClick={onClose}>Done</Button>
          )}
          {step === 3 && !importResult && <div className="w-[72px]" />}
          {step === 4 && (
            <Button size="sm" variant="ghost" onClick={() => { onComplete?.(); onClose(); }}>Skip push</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- subcomponents ---------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs font-bold">{label}</Label><div className="mt-1">{children}</div></div>;
}
function DestCard({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-lg border p-2.5 text-left transition ${active ? "border-[#174be8] bg-[#eef4ff]" : "border-[#dbe4f2] bg-white hover:border-[#94a3b8]"}`}>
      <div className="flex items-center gap-1.5 text-xs font-black text-[#07142f]">{icon} {title}</div>
      <div className="mt-1 text-[11px] text-[#526078]">{desc}</div>
    </button>
  );
}
function QaCard({ label, value, tone }: { label: string; value: number; tone?: "good" | "warn" }) {
  const cls = tone === "good" ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]" : tone === "warn" ? "border-[#fed7aa] bg-[#fff7ed] text-[#9a3412]" : "border-[#dbe4f2] bg-white text-[#07142f]";
  return (
    <div className={`rounded-md border p-2 text-center ${cls}`}>
      <div className="text-[9px] font-bold uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-base font-black">{value.toLocaleString()}</div>
    </div>
  );
}
function StepBar({ step, destination }: { step: Step; destination: Destination }) {
  const labels = destination === "master_and_smartlead"
    ? ["Setup", "Map columns", "Review & Import", "Push to SmartLead"]
    : ["Setup", "Map columns", "Review & Import"];
  return (
    <div className="mb-2">
      <div className="flex gap-1">
        {labels.map((l, i) => (
          <div key={l} className={`h-1 flex-1 rounded ${i < step ? "bg-[#174be8]" : "bg-[#e7edf5]"}`} title={l} />
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        {labels.map((l, i) => (
          <div key={l} className={`flex-1 text-center text-[9px] font-bold uppercase tracking-wide ${i + 1 === step ? "text-[#174be8]" : "text-[#8794ab]"}`}>{l}</div>
        ))}
      </div>
    </div>
  );
}
