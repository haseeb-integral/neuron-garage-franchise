import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { formCopyFilename, staffAnswerSections } from "@/lib/portalForms/staffView";
import type { Answers, PortalFormDef } from "@/lib/portalForms/types";

function Copy({ path, title, date }: { path: string; title: string; date: string }) {
  const file = useQuery({ queryKey: ["submission-history-pdf", path], gcTime: 0, retry: false, queryFn: async () => {
    const { data, error } = await supabase.storage.from("candidate_documents").download(path);
    if (error || !data?.size) throw error ?? new Error("Empty PDF");
    return data;
  } });
  if (file.isError) return <Button variant="outline" size="sm" onClick={() => file.refetch()}>Retry PDF</Button>;
  return <Button variant="outline" size="sm" disabled={!file.data} onClick={() => {
    if (!file.data) return;
    const url = URL.createObjectURL(file.data); const a = document.createElement("a");
    a.href = url; a.download = formCopyFilename(title, date); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }}>{file.data ? <Download className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}Download this submission</Button>;
}

export function FormSubmissionHistory({ formId, form }: { formId: string; form: PortalFormDef }) {
  const history = useQuery({ queryKey: ["form-submission-history", formId], gcTime: 0, queryFn: async () => {
    const { data, error } = await supabase.from("candidate_portal_signatures").select("*").eq("form_id", formId).order("signed_at", { ascending: false });
    if (error) throw error;
    return data;
  } });
  if (history.isPending) return <p className="text-sm text-muted-foreground">Loading submission history…</p>;
  if (history.isError) return <Button variant="outline" onClick={() => history.refetch()}>Retry submission history</Button>;
  if (!history.data.length) return null;
  return <section className="space-y-3"><h3 className="font-semibold">Previous submissions</h3>{history.data.map((s) => <details key={s.id} className="border rounded-lg p-3">
    <summary className="cursor-pointer text-sm font-medium">{s.correction_request_id ? "Corrected submission" : "Original submission"} · {new Date(s.signed_at).toLocaleString()}</summary>
    <div className="space-y-3 mt-3">{staffAnswerSections(form, s.answers_snapshot as Answers).map((section) => <div key={section.title}><h4 className="text-sm font-semibold">{section.title}</h4><dl className="text-sm space-y-2">{section.rows.map((r) => <div key={r.label}><dt className="text-muted-foreground">{r.label}</dt><dd className="whitespace-pre-wrap break-words">{Array.isArray(r.value) ? r.value.join(", ") : String(r.value ?? "—")}</dd></div>)}</dl></div>)}
    <p className="text-sm whitespace-pre-wrap">{s.signed_text}</p>{s.pdf_path && <Copy path={s.pdf_path} title={form.title} date={s.signed_at} />}</div>
  </details>)}</section>;
}