import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PORTAL_FORMS } from "@/lib/portalForms/logic";
import { staffFormView, staffAnswerSections, formCopyFilename } from "@/lib/portalForms/staffView";
import type { PortalFormDef } from "@/lib/portalForms/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Download, Loader2, RefreshCw } from "lucide-react";
import { RequestFormCorrection } from "../RequestFormCorrection";
import { FormSubmissionHistory } from "@/components/portal/FormSubmissionHistory";

function dateLabel(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Date not recorded";
}
function answerLabel(value: unknown): string {
  if (Array.isArray(value)) return value.map(answerLabel).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return value == null || value === "" ? "—" : String(value);
}

function PdfDownload({ candidateId, path, title, date }: { candidateId: string; path: string; title: string; date: string }) {
  const pdf = useQuery({
    queryKey: ["staff-form-pdf", candidateId, path],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("candidate_documents").download(path);
      if (error) throw error;
      return data;
    },
    retry: false,
    gcTime: 0,
  });
  if (pdf.isError) return <div className="flex items-center gap-2 text-sm text-destructive"><span>Could not load the PDF.</span><Button variant="outline" size="sm" onClick={() => pdf.refetch()}><RefreshCw className="h-4 w-4" /> Retry</Button></div>;
  return <Button variant="outline" size="sm" disabled={!pdf.data} onClick={() => {
    if (!pdf.data) return;
    const url = URL.createObjectURL(pdf.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = formCopyFilename(title, date);
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }}>{pdf.data ? <Download className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}{pdf.data ? "Download PDF" : "Preparing PDF…"}</Button>;
}

export function ProspectFormsTab({ candidateId }: { candidateId?: string }) {
  return candidateId ? <CandidateForms key={candidateId} candidateId={candidateId} /> : <p className="py-6 text-sm text-muted-foreground">Prospect forms are available for saved candidates.</p>;
}

function CandidateForms({ candidateId }: { candidateId: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const data = useQuery({
    queryKey: ["staff-prospect-forms", candidateId],
    queryFn: async () => {
      const [forms, signatures] = await Promise.all([
        supabase.from("candidate_portal_forms").select("*").eq("candidate_id", candidateId),
        supabase.from("candidate_portal_signatures").select("*").eq("candidate_id", candidateId),
      ]);
      if (forms.error) throw forms.error;
      if (signatures.error) throw signatures.error;
      return { forms: forms.data, signatures: signatures.data };
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  if (data.isPending) return <div className="flex items-center gap-2 py-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading prospect forms…</div>;
  if (data.isError) return <div className="space-y-3 py-6"><p className="text-sm text-destructive">Could not load prospect forms.</p><Button variant="outline" onClick={() => data.refetch()}><RefreshCw className="h-4 w-4" /> Retry</Button></div>;
  return <div className="space-y-3 pt-4">
    <div className="flex items-center justify-between"><h2 className="font-semibold">Prospect Forms</h2><Button size="sm" variant="ghost" aria-label="Refresh prospect forms" title="Refresh prospect forms" onClick={() => data.refetch()}><RefreshCw className="h-4 w-4" /></Button></div>
    {PORTAL_FORMS.map((form: PortalFormDef) => {
      const view = staffFormView(candidateId, form.key, data.data.forms, data.data.signatures);
      const open = expanded === form.key;
      return <section key={form.key} className="rounded-lg border overflow-hidden">
        <Button variant="ghost" className="h-auto w-full rounded-none justify-between whitespace-normal text-left px-4 py-4 gap-3" aria-expanded={open} onClick={() => setExpanded(open ? null : form.key)}>
          <span className="min-w-0 space-y-1"><span className="block font-semibold">{form.title}</span><span className="block text-xs font-normal text-muted-foreground">Step {form.stepNum}{view.record ? ` · ${view.submitted ? "Submitted" : "Last saved"} ${dateLabel(view.submitted ? view.signature?.signed_at ?? view.record.submitted_at : view.record.updated_at)}` : ""}</span></span>
          <span className="flex shrink-0 items-center gap-2"><Badge variant={view.submitted ? "default" : "secondary"}>{!view.record ? "Not started" : view.submitted ? "Submitted" : `Draft · ${view.record.progress}%`}</Badge>{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
        </Button>
        {open && <div className="border-t p-4 space-y-5">
          {view.record?.status === "reopened" && <p className="text-sm font-medium">Correction requested: {view.record.reopen_reason}</p>}
          {view.submitted && view.record && view.signature && <RequestFormCorrection formId={view.record.id} onRequested={() => { void data.refetch(); }} />}
          {!view.record ? <p className="text-sm text-muted-foreground">This form has not been started.</p> : !view.answers ? <p className="text-sm text-muted-foreground">The saved submission copy is unavailable. No draft has been substituted.</p> : <>
            {!view.submitted && <Badge variant="secondary">Draft — not submitted</Badge>}
            {staffAnswerSections(form, view.answers).map((s) => <div key={s.title} className="space-y-2"><h3 className="font-semibold text-sm">{s.title}</h3><dl className="divide-y">{s.rows.map((r) => <div key={r.label} className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-4 py-2 text-sm"><dt className="text-muted-foreground break-words">{r.label}</dt><dd className="whitespace-pre-wrap break-words min-w-0">{answerLabel(r.value)}</dd></div>)}</dl></div>)}
          </>}
          {view.signature && <div className="space-y-3 border-t pt-4"><h3 className="text-sm font-semibold">{form.noSignature ? "Submission record" : "Signature record"}</h3><p className="text-sm">{view.signature.signer_name} · {dateLabel(view.signature.signed_at)}</p><p className="text-sm whitespace-pre-wrap break-words">{view.signature.signed_text}</p>{view.signature.pdf_path ? <PdfDownload key={view.signature.id} candidateId={candidateId} path={view.signature.pdf_path} title={form.title} date={view.signature.signed_at} /> : <p className="text-sm text-muted-foreground">PDF not available.</p>}</div>}
          {view.record && <FormSubmissionHistory formId={view.record.id} form={form} />}
        </div>}
      </section>;
    })}
  </div>;
}