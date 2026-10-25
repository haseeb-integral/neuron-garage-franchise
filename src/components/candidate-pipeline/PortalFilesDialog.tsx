import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Upload, Trash2, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PORTAL_STEPS } from "@/lib/portalPath";

const BUCKET = "portal_files";
const safeName = (n: string) => n.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);

/** Staff card: shared files every prospect gets when a step unlocks, plus the latest FDD. */
export function PortalFilesDialog() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
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

  const upload = async (step: number, file: File, title: string, isFdd: boolean) => {
    if (file.size > 50 * 1024 * 1024) { toast.error("File is over 50MB"); return false; }
    const { data: u } = await supabase.auth.getUser();
    const path = `step-${step}/${crypto.randomUUID()}-${safeName(file.name)}`;
    const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined });
    if (up.error) { toast.error("Upload failed", { description: up.error.message }); return false; }
    const ins = await supabase.from("portal_step_files").insert({
      step_num: step, title: title.trim() || file.name, bucket_path: path, file_name: file.name,
      mime_type: file.type || null, size_bytes: file.size, is_fdd: isFdd,
      uploaded_by: u.user?.id ?? null, uploaded_by_email: u.user?.email ?? null,
    });
    if (ins.error) {
      await supabase.storage.from(BUCKET).remove([path]);
      toast.error("Couldn't save the file", { description: ins.error.message });
      return false;
    }
    toast.success(isFdd ? "Latest FDD updated" : "File added");
    qc.invalidateQueries({ queryKey: ["portal-step-files-staff"] });
    return true;
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
              <div className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium truncate">{fdds[0].file_name}</span>
                <span className="text-xs text-muted-foreground">
                  · uploaded {formatDistanceToNow(new Date(fdds[0].created_at), { addSuffix: true })}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No FDD uploaded yet.</p>
            )}
            <UploadRow label={fdds[0] ? "Upload newer FDD" : "Upload FDD"} hideTitle onUpload={(f) => upload(2, f, "Latest FDD", true)} />
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
                      <li key={f.id} className="flex items-center gap-2 text-sm">
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
                <UploadRow label="Add file" onUpload={(f, t) => upload(s.num, f, t, false)} />
              </section>
            );
          })}
          {fdds.length > 1 && <p className="text-xs text-muted-foreground"><Badge variant="outline">Note</Badge> Older FDDs are kept but hidden from prospects.</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}

function UploadRow({ label, hideTitle, onUpload }: {
  label: string; hideTitle?: boolean; onUpload: (f: File, title: string) => Promise<boolean>;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-2">
      {!hideTitle && (
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name shown to prospect (optional)" className="h-8 text-sm" />
      )}
      <input ref={ref} type="file" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = "";
        if (!f) return;
        setBusy(true);
        if (await onUpload(f, title)) setTitle("");
        setBusy(false);
      }} />
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => ref.current?.click()} className="shrink-0">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} {label}
      </Button>
    </div>
  );
}
