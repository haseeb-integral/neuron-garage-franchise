import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Upload, Trash2, Loader2, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PORTAL_STEPS } from "@/lib/portalPath";
import { toastUploadSuccess, useUploadFlash } from "@/lib/uploadFeedback";

const BUCKET = "portal_files";
const safeName = (n: string) => n.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);

/** Staff card: shared files every prospect gets when a step unlocks, plus the latest FDD. */
export function PortalFilesDialog() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { isFlashed, flash } = useUploadFlash();
  const files = useQuery({
    queryKey: ["portal-step-files-staff"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("portal_step_files").select("*")
        .is("deleted_at", null).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  /** Returns the stored path on success so the caller can confirm it in the row. */
  const upload = async (step: number, file: File, title: string, isFdd: boolean): Promise<string | null> => {
    if (file.size > 50 * 1024 * 1024) { toast.error("File is over 50MB"); return null; }
    const { data: u } = await supabase.auth.getUser();
    const path = `step-${step}/${crypto.randomUUID()}-${safeName(file.name)}`;
    const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined });
    if (up.error) { toast.error("Upload failed", { description: up.error.message }); return null; }
    const ins = await supabase.from("portal_step_files").insert({
      step_num: step, title: title.trim() || file.name, bucket_path: path, file_name: file.name,
      mime_type: file.type || null, size_bytes: file.size, is_fdd: isFdd,
      uploaded_by: u.user?.id ?? null, uploaded_by_email: u.user?.email ?? null,
    });
    if (ins.error) {
      await supabase.storage.from(BUCKET).remove([path]);
      toast.error("Couldn't save the file", { description: ins.error.message });
      return null;
    }
    flash([path]);
    toastUploadSuccess(
      isFdd ? "Latest FDD updated" : "File added to the portal",
      [file.name],
      isFdd
        ? "Every prospect's FDD link now points to this file."
        : `Prospects at Step ${step} can see it now.`,
    );
    qc.invalidateQueries({ queryKey: ["portal-step-files-staff"] });
    return path;
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from the prospect portal?`)) return;
    const { error } = await supabase.from("portal_step_files").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error("Remove failed", { description: error.message });
    qc.invalidateQueries({ queryKey: ["portal-step-files-staff"] });
  };

  const list = files.data ?? [];
  const fdds = list.filter((f) => f.is_fdd);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="w-full sm:w-auto">
        <FolderOpen size={14} /> Portal files
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Portal files</DialogTitle>
            <DialogDescription>
              Files you add here show up for every prospect as soon as they reach that step. No need to tick anything per person.
            </DialogDescription>
          </DialogHeader>

          <section className="rounded-lg border p-4 space-y-2">
            <h3 className="text-sm font-semibold">Latest FDD</h3>
            <p className="text-xs text-muted-foreground">
              Every prospect at Step 2 or later gets a "Download latest FDD" link. Uploading a new one replaces the link for everyone.
            </p>
            {fdds[0] ? (
              <div className={`text-sm flex items-center gap-2 rounded-md px-2 py-1 ${
                isFlashed(fdds[0].bucket_path) ? "border border-success/50 bg-success/10 text-success" : ""
              }`}>
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium truncate">{fdds[0].file_name}</span>
                <span className="text-xs text-muted-foreground">
                  · uploaded {formatDistanceToNow(new Date(fdds[0].created_at), { addSuffix: true })}
                </span>
                {isFlashed(fdds[0].bucket_path) && (
                  <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-success">
                    <CheckCircle2 className="h-3 w-3" /> Uploaded
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No FDD uploaded yet.</p>
            )}
            <UploadRow
              label={fdds[0] ? "Upload newer FDD" : "Upload FDD"}
              hideTitle
              doneLabel="Uploaded — every prospect's FDD link now points to it"
              onUpload={(f) => upload(2, f, "Latest FDD", true)}
            />
          </section>

          {PORTAL_STEPS.map((s) => {
            const stepFiles = list.filter((f) => f.step_num === s.num && !f.is_fdd);
            return (
              <section key={s.num} className="rounded-lg border p-4 space-y-2">
                <h3 className="text-sm font-semibold">Step {s.num} — {s.title}</h3>
                {stepFiles.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No files for this step.</p>
                ) : (
                  <ul className="space-y-1">
                    {stepFiles.map((f) => (
                      <li key={f.id} className={`flex items-center gap-2 text-sm rounded-md px-2 py-1 ${
                        isFlashed(f.bucket_path) ? "border border-success/50 bg-success/10" : ""
                      }`}>
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate"><span className="font-medium">{f.title}</span>
                          {f.title !== f.file_name && <span className="text-xs text-muted-foreground"> · {f.file_name}</span>}
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(f.id, f.title)} title="Remove">

                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <UploadRow label="Add file" doneLabel={`Uploaded — prospects at Step ${s.num} can see it`} onUpload={(f, t) => upload(s.num, f, t, false)} />
              </section>
            );
          })}
          {fdds.length > 1 && <p className="text-xs text-muted-foreground"><Badge variant="outline">Note</Badge> Older FDDs are kept but hidden from prospects.</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}

function UploadRow({ label, hideTitle, doneLabel = "Uploaded — prospects can see it", onUpload }: {
  label: string; hideTitle?: boolean; doneLabel?: string; onUpload: (f: File, title: string) => Promise<string | null>;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!hideTitle && (
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name shown to prospect (optional)" className="h-8 text-sm" />
      )}
      <input ref={ref} type="file" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = "";
        if (!f) return;
        setBusy(true);
        setDone(false);
        const path = await onUpload(f, title);
        if (path) { setTitle(""); setDone(true); }
        setBusy(false);
      }} />
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => ref.current?.click()} className="shrink-0">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} {label}
      </Button>
      {done && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
          <CheckCircle2 className="h-3.5 w-3.5" /> {doneLabel}
        </span>
      )}
    </div>
  );
}
