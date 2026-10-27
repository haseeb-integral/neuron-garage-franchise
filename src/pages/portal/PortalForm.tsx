import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, CloudOff, Download, Loader2, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { getPortalForm, missingRequired, formProgress, signatureMatches } from "@/lib/portalForms/logic";
import { formatFddIssuance } from "@/lib/portalForms/item23";
import type { Answers, FormField, PortalFormDef } from "@/lib/portalForms/types";
import { PORTAL_STEPS } from "@/lib/portalPath";
import { ESIGN_CONSENT_AGREE, ESIGN_CONSENT_FULL_TEXT, ESIGN_CONSENT_INTRO, ESIGN_CONSENT_POINTS, ESIGN_CONSENT_TITLE, ESIGN_CONSENT_VERSION } from "@/lib/portalForms/esign";
import { US_STATE_NAME_TO_ABBR } from "@/lib/usStates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
const STATE_ABBRS = [...new Set(Object.values(US_STATE_NAME_TO_ABBR))].sort();
import logo from "@/assets/neuron-garage-logo.png";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function PortalForm() {
  const { formKey = "" } = useParams();
  const form = getPortalForm(formKey);
  const { session, loading, accessChecked, portalCandidateId, user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();

  const row = useQuery({
    queryKey: ["portal-form", portalCandidateId, formKey],
    enabled: !!portalCandidateId && !!form,
    queryFn: async () => {
      const { data, error } = await supabase.from("candidate_portal_forms")
        .select("id, answers, status, last_section, submitted_at")
        .eq("candidate_id", portalCandidateId!).eq("form_key", formKey).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const path = useQuery({
    queryKey: ["portal-path", portalCandidateId],
    enabled: !!portalCandidateId,
    queryFn: async () => (await supabase.rpc("portal_my_path")).data as { first_name: string | null } | null,
  });
  // Receipts that name the FDD version received (Item 23): which FDD did this prospect actually get?
  const fddVersion = useQuery({
    queryKey: ["portal-fdd-version", portalCandidateId],
    enabled: !!portalCandidateId && !!form?.dynamicSignedText,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("portal_my_fdd_version");
      if (error) throw error;
      return (data as Array<{ fdd_file_id: string | null; issuance_date: string | null; source: string | null }> | null)?.[0] ?? null;
    },
  });

  const [answers, setAnswers] = useState<Answers>({});
  const [section, setSection] = useState(0);
  const [ready, setReady] = useState(false);
  const [save, setSave] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const dirty = useRef(false);
  const timer = useRef<number>();

  useEffect(() => {
    if (ready || !form || row.isLoading || !row.isFetched) return;
    const base: Answers = { ...(row.data?.answers as Answers | undefined) };
    if (!row.data) {
      if (path.data?.first_name) base[form.nameKeys.first] = path.data.first_name;
      if (user?.email) base.email = user.email;
    }
    setAnswers(base);
    setSection(Math.min(row.data?.last_section ?? 0, form.sections.length));
    setReady(true);
  }, [ready, form, row.isLoading, row.isFetched, row.data, path.data, user]);

  const locked = row.data?.status === "submitted";

  const persist = async (a: Answers, sec: number) => {
    if (!form || !portalCandidateId || locked) return;
    setSave("saving");
    const payload = {
      candidate_id: portalCandidateId, form_key: form.key, form_version: form.version,
      answers: a as never, progress: formProgress(form, a), last_section: sec,
    };
    const res = row.data?.id || (await supabase.from("candidate_portal_forms").select("id")
      .eq("candidate_id", portalCandidateId).eq("form_key", form.key).maybeSingle()).data?.id
      ? await supabase.from("candidate_portal_forms").update(payload).eq("candidate_id", portalCandidateId).eq("form_key", form.key)
      : await supabase.from("candidate_portal_forms").insert(payload);
    if (res.error) { setSave("error"); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => persist(a, sec), 4000); return; }
    dirty.current = false;
    setSave("saved");
    setSavedAt(new Date());
    if (!row.data?.id) qc.invalidateQueries({ queryKey: ["portal-form", portalCandidateId, formKey] });
    qc.invalidateQueries({ queryKey: ["portal-forms", portalCandidateId] });
  };

  const update = (next: Answers) => {
    setAnswers(next);
    dirty.current = true;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => persist(next, section), 1000);
  };

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const goTo = (i: number) => {
    setSection(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.clearTimeout(timer.current);
    void persist(answers, i);
  };

  if (loading || (session && !accessChecked)) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  if (!session) return <Navigate to="/auth" replace />;
  if (!portalCandidateId) return <Navigate to="/" replace />;
  if (!form) return <Navigate to="/portal" replace />;

  const needsConsent = !!form.esignConsent && !locked && ready && !answers.__esign_consent_at;
  if (needsConsent) {
    return (
      <ConsentGate title={form.title} onAgree={async () => {
        const next = { ...answers, __esign_consent_at: new Date().toISOString(), __esign_consent_version: ESIGN_CONSENT_VERSION };
        setAnswers(next);
        await persist(next, section);
      }} />
    );
  }

  const total = form.sections.length; // review screen index = total
  const pct = formProgress(form, answers);
  const onReview = section >= total || locked;
  const fddInfo = form.dynamicSignedText
    ? { fddFileId: fddVersion.data?.fdd_file_id ?? null, issuanceDate: fddVersion.data?.issuance_date ?? null, source: fddVersion.data?.source ?? null }
    : null;
  const dynamicText = form.dynamicSignedText && fddVersion.isFetched && fddInfo ? form.dynamicSignedText(fddInfo) : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-portal-navy text-portal-navy-foreground">
        <div className="mx-auto max-w-3xl px-5 py-4 flex items-center justify-between gap-3">
          <Link to="/portal" className="flex items-center gap-2 text-sm hover:underline"><ArrowLeft className="h-4 w-4" /> Back to my path</Link>
          <img src={logo} alt="Neuron Garage" className="h-8 w-auto rounded bg-background p-0.5" />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-6 space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-portal-navy">{form.title}</h1>
          {section === 0 && !locked && <p className="mt-2 text-sm text-muted-foreground">{form.intro}</p>}
          {section === 0 && !locked && <p className="mt-2 text-sm font-medium">{form.dueText}</p>}
        </div>

        {!locked && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{onReview ? "Review and sign" : `Section ${section + 1} of ${total} — ${form.sections[section].title}`}</span>
              <SaveNote state={save} at={savedAt} />
            </div>
            <Progress value={onReview ? 100 : ((section + 1) / (total + 1)) * 100} className="h-1.5" />
          </div>
        )}

        {!ready ? <p className="text-sm text-muted-foreground">Loading your answers…</p> : onReview ? (
          <ReviewAndSign form={form} answers={answers} locked={locked} submittedAt={row.data?.submitted_at ?? null} formId={row.data?.id ?? null}
            pct={pct} onEdit={goTo}
            fddInfo={fddInfo} fddPending={fddVersion.isLoading} dynamicPreText={dynamicText?.preText} dynamicSignedText={dynamicText?.signedText}
            onSubmitted={() => {
              dirty.current = false;
              qc.invalidateQueries({ queryKey: ["portal-form", portalCandidateId, formKey] });
              qc.invalidateQueries({ queryKey: ["portal-forms", portalCandidateId] });
              qc.invalidateQueries({ queryKey: ["portal-ticks", portalCandidateId] });
            }}
            onBeforeSubmit={async () => { window.clearTimeout(timer.current); await persist(answers, total); }}
          />
        ) : (
          <SectionView form={form} index={section} answers={answers} onChange={update} />
        )}

        {!locked && ready && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button variant="outline" disabled={section === 0} onClick={() => goTo(section - 1)}>Back</Button>
            <Button variant="outline" className="border-portal-navy text-portal-navy" onClick={async () => { window.clearTimeout(timer.current); await persist(answers, section); nav("/portal"); }}>
              Save and finish later
            </Button>
            {!onReview && (
              <Button className="bg-portal-navy text-portal-navy-foreground hover:bg-portal-navy/90" onClick={() => goTo(section + 1)}>
                {section === total - 1 ? "Review answers" : "Next"}
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function SaveNote({ state, at }: { state: SaveState; at: Date | null }) {
  if (state === "saving") return <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Saving…</span>;
  if (state === "error") return <span className="flex items-center gap-1 text-destructive"><CloudOff className="h-3 w-3" /> Not saved — retrying</span>;
  if (state === "saved" && at) return <span className="flex items-center gap-1 text-success"><Check className="h-3 w-3" /> Saved {at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>;
  return <span>Your work saves automatically</span>;
}

const widthCls = (w?: FormField["width"]) => (w === "half" ? "md:col-span-3" : w === "third" ? "md:col-span-2" : "md:col-span-6");

function FieldInput({ f, value, onChange, idPrefix }: { f: FormField; value: unknown; onChange: (v: unknown) => void; idPrefix: string }) {
  const id = `${idPrefix}-${f.key}`;
  const label = (
    <label htmlFor={id} className="block text-sm font-medium mb-1.5">
      {f.label}{f.optional && !f.requiredWhen ? <span className="text-muted-foreground font-normal"> (optional)</span> : null}
    </label>
  );
  if (f.type === "radio") {
    return (
      <fieldset className={widthCls(f.width)}>
        <legend className="text-sm font-medium mb-2">{f.label}</legend>
        <div className="flex flex-wrap gap-2">
          {f.options!.map((o) => (
            <button key={o} type="button" onClick={() => onChange(o)}
              className={`min-h-11 rounded-lg border px-4 text-sm transition-colors ${value === o ? "border-portal-navy bg-portal-navy text-portal-navy-foreground" : "hover:bg-muted"}`}>
              {o}
            </button>
          ))}
        </div>
      </fieldset>
    );
  }
  if (f.type === "checkboxes") {
    const arr = (value as string[] | undefined) ?? [];
    return (
      <fieldset className={widthCls(f.width)}>
        <legend className="text-sm font-medium mb-2">{f.label}</legend>
        <div className="space-y-2">
          {f.options!.map((o) => (
            <label key={o} className="flex items-start gap-2.5 text-sm cursor-pointer">
              <Checkbox checked={arr.includes(o)} onCheckedChange={(v) => onChange(v ? [...arr, o] : arr.filter((x) => x !== o))} className="mt-0.5" /> {o}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  if (f.type === "state") {
    return (
      <div className={widthCls(f.width)}>
        {label}
        <Select value={(value as string) || undefined} onValueChange={(v) => onChange(v)}>
          <SelectTrigger id={id} className="h-11"><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent className="max-h-72">
            {STATE_ABBRS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }
  if (f.type === "checkbox") {
    return (
      <label className={`flex items-start gap-2.5 text-sm cursor-pointer ${widthCls(f.width)}`}>
        <Checkbox checked={!!value} onCheckedChange={(v) => onChange(!!v)} className="mt-0.5" /> {f.label}
      </label>
    );
  }
  return (
    <div className={widthCls(f.width)}>
      {label}
      {f.type === "textarea"
        ? <Textarea id={id} rows={4} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        : <Input id={id} type={f.type} className="h-11" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}

function SectionView({ form, index, answers, onChange }: { form: PortalFormDef; index: number; answers: Answers; onChange: (a: Answers) => void }) {
  const s = form.sections[index];
  const rep = s.repeater;
  const items = rep ? ((answers[rep.key] as Answers[] | undefined) ?? []) : [];
  const shown = rep ? Math.max(rep.startWith, items.length) : 0;
  const setItem = (i: number, k: string, v: unknown) => {
    const next = Array.from({ length: shown }, (_, j) => ({ ...(items[j] ?? {}) }));
    next[i][k] = v;
    onChange({ ...answers, [rep!.key]: next });
  };
  return (
    <section className="rounded-xl border p-5 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-portal-navy">{s.title}</h2>
        {s.intro && <p className="text-sm text-muted-foreground mt-1">{s.intro}</p>}
      </div>
      {s.fields && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {s.fields.map((f) => (
            <FieldInput key={f.key} f={f} idPrefix={s.id} value={answers[f.key]} onChange={(v) => onChange({ ...answers, [f.key]: v })} />
          ))}
        </div>
      )}
      {rep && (
        <div className="space-y-4">
          {Array.from({ length: shown }, (_, i) => (
            <div key={i} className="rounded-lg bg-muted/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-portal-navy">
                  {rep.itemLabel} {i + 1}{i >= rep.requiredCount && <span className="font-normal normal-case text-muted-foreground"> (optional)</span>}
                </div>
                {i >= rep.startWith && (
                  <Button variant="ghost" size="sm" onClick={() => onChange({ ...answers, [rep.key]: items.filter((_, j) => j !== i) })}>
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                {rep.fields.map((f) => (
                  <FieldInput key={f.key} f={f} idPrefix={`${s.id}-${i}`} value={items[i]?.[f.key]} onChange={(v) => setItem(i, f.key, v)} />
                ))}
              </div>
            </div>
          ))}
          {shown < rep.max && (
            <Button variant="outline" size="sm" onClick={() => onChange({ ...answers, [rep.key]: [...Array.from({ length: shown }, (_, j) => items[j] ?? {}), {}] })}>
              <Plus className="h-3.5 w-3.5" /> {rep.addLabel ?? `Add another ${rep.itemLabel.toLowerCase()}`}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

function answerText(v: unknown) {
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return v == null || String(v).trim() === "" ? "—" : String(v);
}

function ConsentGate({ title, onAgree }: { title: string; onAgree: () => Promise<void> }) {
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-portal-navy text-portal-navy-foreground">
        <div className="mx-auto max-w-3xl px-5 py-4 flex items-center justify-between gap-3">
          <Link to="/portal" className="flex items-center gap-2 text-sm hover:underline"><ArrowLeft className="h-4 w-4" /> Back to my path</Link>
          <img src={logo} alt="Neuron Garage" className="h-8 w-auto rounded bg-background p-0.5" />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-5 py-8 space-y-5">
        <div className="text-sm text-muted-foreground">Before you start: {title}</div>
        <section className="rounded-xl border-2 border-portal-navy p-6 space-y-4">
          <div className="flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-portal-navy" /><h1 className="text-xl font-bold text-portal-navy">{ESIGN_CONSENT_TITLE}</h1></div>
          <p className="text-sm leading-relaxed">{ESIGN_CONSENT_INTRO}</p>
          <ul className="space-y-2 text-sm leading-relaxed list-disc pl-5">
            {ESIGN_CONSENT_POINTS.map((pt) => <li key={pt.label}><span className="font-semibold">{pt.label}{pt.label.endsWith("?") ? "" : ":"}</span> {pt.text}</li>)}
          </ul>
          <label className="flex items-start gap-2.5 text-sm cursor-pointer rounded-lg bg-muted/50 p-3">
            <Checkbox checked={ok} onCheckedChange={(v) => setOk(!!v)} className="mt-0.5" /> {ESIGN_CONSENT_AGREE}
          </label>
          <Button disabled={!ok || busy} className="w-full h-12 bg-portal-navy text-portal-navy-foreground hover:bg-portal-navy/90"
            onClick={async () => { setBusy(true); await onAgree(); setBusy(false); }}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} I agree — start the form
          </Button>
        </section>
      </main>
    </div>
  );
}

function SignedCopyButton({ formId, form }: { formId: string; form: PortalFormDef }) {
  const sig = useQuery({
    queryKey: ["portal-signature", formId],
    queryFn: async () => {
      const { data, error } = await supabase.from("candidate_portal_signatures").select("pdf_path, signed_at")
        .eq("form_id", formId).order("signed_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const pdfPath = sig.data?.pdf_path;
  const pdf = useQuery({
    queryKey: ["portal-signed-pdf", formId, pdfPath],
    enabled: !!pdfPath,
    retry: false,
    queryFn: async () => {
      if (!pdfPath) throw new Error("No signed copy is available.");
      const { data, error } = await supabase.storage.from("candidate_documents").download(pdfPath);
      if (error) throw error;
      if (!data?.size) throw new Error("The signed copy is empty.");
      return data;
    },
  });
  if (sig.isError || pdf.isError) return (
    <div className="mt-3 space-y-2">
      <p role="alert" className="text-sm text-destructive">Could not prepare your signed copy. Please try again.</p>
      <Button size="sm" variant="outline" disabled={sig.isFetching || pdf.isFetching}
        onClick={() => { if (sig.isError) void sig.refetch(); else void pdf.refetch(); }}>
        Try download again
      </Button>
    </div>
  );
  if (!pdfPath) return null;
  return (
    <Button size="sm" variant="outline" className="mt-3" disabled={!pdf.data} onClick={() => {
      if (!pdf.data) return;
      const url = URL.createObjectURL(new Blob([pdf.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      const signedDay = sig.data?.signed_at ? String(sig.data.signed_at).slice(0, 10) : "";
      const base = [form.title.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, ""), "Signed", signedDay]
        .filter(Boolean).join("-");
      link.download = `${base}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    }}>
      {pdf.data ? <Download className="h-3.5 w-3.5" /> : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {pdf.data ? "Download your signed copy" : "Preparing signed copy…"}
    </Button>
  );
}

function buildRows(form: PortalFormDef, a: Answers) {
  return form.sections.map((s) => {
    const rows = (s.fields ?? []).map((f) => ({ label: f.label, value: answerText(a[f.key]) }));
    if (s.repeater) {
      ((a[s.repeater.key] as Answers[] | undefined) ?? []).forEach((it, j) => {
        s.repeater!.fields.forEach((f) => rows.push({ label: `${s.repeater!.itemLabel} ${j + 1} - ${f.label}`, value: answerText(it?.[f.key]) }));
      });
    }
    return { title: s.title, rows };
  });
}

function ReviewAndSign({ form, answers, locked, submittedAt, formId, pct, onEdit, onSubmitted, onBeforeSubmit, fddInfo, fddPending, dynamicPreText, dynamicSignedText }: {
  form: PortalFormDef; answers: Answers; locked: boolean; submittedAt: string | null; formId: string | null; pct: number;
  fddInfo: { fddFileId: string | null; issuanceDate: string | null; source: string | null } | null; fddPending: boolean;
  dynamicPreText?: string; dynamicSignedText?: string;
  onEdit: (i: number) => void; onSubmitted: () => void; onBeforeSubmit: () => Promise<void>;
}) {
  const missing = useMemo(() => missingRequired(form, answers), [form, answers]);
  const [typed, setTyped] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const nameOk = signatureMatches(typed, answers[form.nameKeys.first], answers[form.nameKeys.last]);
  const fddKnown = !form.dynamicSignedText || !!fddInfo?.fddFileId;
  const canSign = !locked && missing.length === 0 && nameOk && agree && !busy && !fddPending && fddKnown;
  const item = PORTAL_STEPS.find((s) => s.num === form.stepNum)?.items.find((i) => i.key === form.itemKey);

  const submit = async () => {
    setBusy(true);
    await onBeforeSubmit();
    const { data, error } = await supabase.functions.invoke("portal-submit-form", {
      body: {
        form_key: form.key, signer_name: typed.trim(), signed_text: dynamicSignedText ?? form.signature.text, form_title: form.title,
        step_num: form.stepNum, item_key: form.itemKey, item_label: item?.label ?? form.title,
        first_key: form.nameKeys.first, last_key: form.nameKeys.last,
        pre_text: dynamicPreText ?? form.signature.preText, pdf_category: form.pdf.category, pdf_item_key: form.pdf.itemKey,
        esign_consent_text: form.esignConsent ? ESIGN_CONSENT_FULL_TEXT : undefined,
        fdd_issuance_date: form.dynamicSignedText ? fddInfo?.issuanceDate ?? null : undefined,
        paper_order: form.paperOrder === true,
        sections: buildRows(form, answers),
      },
    });
    setBusy(false);
    if (error || (data as { error?: string })?.error) {
      let msg = (data as { error?: string })?.error;
      try { msg = msg ?? (await (error as { context?: Response })?.context?.json())?.error; } catch { /* ignore */ }
      toast.error(msg ?? "Could not submit. Please try again.");
      return;
    }
    toast.success("Submitted — thank you!", { description: "The Neuron Garage team has your form.", duration: 8000 });
    onSubmitted();
  };

  return (
    <div className="space-y-5">
      {locked && (
        <div className="rounded-xl border border-success/40 bg-success/10 p-5 flex gap-3">
          <Check className="h-6 w-6 text-success shrink-0" />
          <div>
            <div className="font-semibold">Thank you — the team has it.</div>
            <div className="text-sm text-muted-foreground">
              Submitted {submittedAt ? new Date(submittedAt).toLocaleString() : ""}. If something needs to change, contact Skyler Bossen at 512-593-2750.
            </div>
            {formId && <SignedCopyButton formId={formId} form={form} />}
          </div>
        </div>
      )}
      {!locked && missing.length > 0 && (
        <div className="rounded-xl border border-portal-yellow bg-portal-yellow/10 p-4 text-sm">
          <div className="font-semibold mb-1">Almost there — {missing.length} {missing.length === 1 ? "answer is" : "answers are"} still needed ({pct}% done):</div>
          <ul className="list-disc pl-5 space-y-0.5">
            {missing.slice(0, 8).map((m) => (
              <li key={m.label}><button className="underline text-left" onClick={() => onEdit(m.sectionIndex)}>{m.label}</button></li>
            ))}
            {missing.length > 8 && <li>…and {missing.length - 8} more</li>}
          </ul>
        </div>
      )}
      {form.sections.map((s, i) => (
        <section key={s.id} className="rounded-xl border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-portal-navy">{s.title}</h3>
            {!locked && <Button variant="ghost" size="sm" onClick={() => onEdit(i)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>}
          </div>
          <dl className="grid gap-2 text-sm">
            {(s.fields ?? []).map((f) => (
              <div key={f.key} className="grid md:grid-cols-[1fr_1.4fr] gap-1">
                <dt className="text-muted-foreground">{f.label}</dt><dd className="whitespace-pre-wrap">{answerText(answers[f.key])}</dd>
              </div>
            ))}
            {s.repeater && ((answers[s.repeater.key] as Answers[] | undefined) ?? []).map((it, j) => (
              <div key={j} className="rounded-md bg-muted/40 p-2">
                <div className="text-xs font-semibold mb-1">{s.repeater!.itemLabel} {j + 1}</div>
                {s.repeater!.fields.map((f) => (
                  <div key={f.key} className="grid md:grid-cols-[1fr_1.4fr] gap-1">
                    <dt className="text-muted-foreground">{f.label}</dt><dd className="whitespace-pre-wrap">{answerText(it?.[f.key])}</dd>
                  </div>
                ))}
              </div>
            ))}
          </dl>
        </section>
      ))}
      {!locked && (
        <section className="rounded-xl border-2 border-portal-navy p-5 space-y-4">
          <h3 className="font-bold text-portal-navy uppercase tracking-wide">{form.signature.heading}</h3>
          {form.dynamicSignedText && (
            fddPending ? (
              <p className="text-sm text-muted-foreground">Checking which FDD version you received…</p>
            ) : !fddKnown ? (
              <div className="rounded-lg border border-portal-yellow bg-portal-yellow/10 p-3 text-sm">
                We can't confirm which FDD version you received yet. Please contact Skyler Bossen at 512-593-2750 so we can record it before you sign.
              </div>
            ) : (
              <div className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
                This receipt names the FDD you received: issued <strong>{formatFddIssuance(fddInfo?.issuanceDate)}</strong>.
              </div>
            )
          )}
          {(dynamicPreText ?? form.signature.preText) && <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{dynamicPreText ?? form.signature.preText}</p>}
          <p className="text-sm leading-relaxed rounded-lg bg-muted/50 p-3 whitespace-pre-wrap">{dynamicSignedText ?? form.signature.text}</p>
          <div>
            <label htmlFor="sig" className="block text-sm font-medium mb-1.5">Type your full name to sign</label>
            <Input id="sig" className="h-12 text-lg font-serif italic" value={typed} onChange={(e) => setTyped(e.target.value)}
              placeholder={`${answers[form.nameKeys.first] ?? ""} ${answers[form.nameKeys.last] ?? ""}`.trim() || "Full name"} />
            {typed && !nameOk && <p className="text-xs text-muted-foreground mt-1">Your typed name should match the first and last name on this form.</p>}
            <p className="text-xs text-muted-foreground mt-1">Date: {new Date().toLocaleDateString("en-US")}. {form.signature.note}</p>
          </div>
          <label className="flex items-start gap-2.5 text-sm cursor-pointer">
            <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
            {form.signature.agreeLabel ?? "I agree that my typed name is my electronic signature on this form."}
          </label>
          <Button disabled={!canSign} onClick={submit} className="w-full h-12 bg-portal-navy text-portal-navy-foreground hover:bg-portal-navy/90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Sign and Submit
          </Button>
          {missing.length > 0 && <p className="text-xs text-center text-muted-foreground">Finish the answers above to sign.</p>}
        </section>
      )}
    </div>
  );
}
