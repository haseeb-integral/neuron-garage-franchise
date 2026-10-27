import { useRef, useState } from "react";
import { Download, Upload, Loader2, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toastUploadSuccess, useUploadFlash } from "@/lib/uploadFeedback";

export interface StepFile { id: string; step_num: number; title: string; bucket_path: string; file_name: string; is_fdd: boolean }
export interface MyUpload { id: string; portal_step: number | null; file_name: string; created_at: string }

const safeName = (n: string) => n.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);

async function openSigned(bucket: string, path: string, fileName: string) {
  const w = window.open("", "_blank");
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300, { download: fileName });
  if (error || !data?.signedUrl) { w?.close(); toast.error("Couldn't open the file. Please try again."); return; }
  if (w) w.location.href = data.signedUrl; else window.location.href = data.signedUrl;
}

/** FDD download goes through the backend so each download is logged for the FDD audit trail. */
async function openFdd() {
  const w = window.open("", "_blank");
  const { data, error } = await supabase.functions.invoke("portal-fdd-download", { body: {} });
  const url = (data as { url?: string } | null)?.url;
  if (error || !url) { w?.close(); toast.error((data as { error?: string } | null)?.error ?? "Couldn't open the FDD. Please try again."); return; }
  if (w) w.location.href = url; else window.location.href = url;
}

/** Downloads + uploads for one unlocked step on the prospect's path. */
export function PortalStepFiles({ stepNum, candidateId, files, uploads, onUploaded }: {
  stepNum: number; candidateId: string; files: StepFile[]; uploads: MyUpload[]; onUploaded: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [lastSent, setLastSent] = useState<{ count: number; names: string[] } | null>(null);
  const { isFlashed, flash } = useUploadFlash();

  const handle = async (list: FileList) => {
    const arr = Array.from(list);
    if (arr.some((f) => f.size > 25 * 1024 * 1024)) { toast.error("Each file must be under 25MB."); return; }
    setBusy(true);
    setLastSent(null);
    const { data: u } = await supabase.auth.getUser();
    let ok = 0;
    const landedNames: string[] = [];
    for (const file of arr) {
      const path = `candidates/${candidateId}/portal/step-${stepNum}/${crypto.randomUUID()}-${safeName(file.name)}`;
      const up = await supabase.storage.from("candidate_documents").upload(path, file, { contentType: file.type || undefined });
      if (up.error) { toast.error(`Upload failed: ${file.name}`); continue; }
      const ins = await supabase.from("candidate_files").insert({
        candidate_id: candidateId, bucket_path: path, file_name: file.name, mime_type: file.type || null,
        size_bytes: file.size, category: "general", uploaded_by: u.user?.id ?? null,
        uploaded_by_email: u.user?.email ?? null, uploaded_by_prospect: true, portal_step: stepNum,
      });
      if (ins.error) { toast.error(`Upload failed: ${file.name}`); continue; }
      ok++;
      landedNames.push(file.name);
    }
    setBusy(false);
    if (ok) {
      setLastSent({ count: ok, names: landedNames });
      flash(landedNames);
      toastUploadSuccess(
        `${ok} file${ok > 1 ? "s" : ""} sent`,
        landedNames,
        `The Neuron Garage team can see ${ok > 1 ? "them" : "it"} now.`,
      );

      onUploaded();
    }
  };

  const fdd = files.find((f) => f.is_fdd);
  const shared = files.filter((f) => !f.is_fdd);

  return (
    <div className="mt-4 border-t pt-4 space-y-3">
      {(fdd || shared.length > 0) && (
        <div className="space-y-1.5">
          <div className="text-xs font-bold uppercase tracking-wider text-portal-navy">Files for you</div>
          {fdd && (
            <Button size="sm" className="bg-portal-navy text-portal-navy-foreground hover:bg-portal-navy/90"
              onClick={() => openFdd()}>
              <Download className="h-3.5 w-3.5" /> Download latest FDD
            </Button>
          )}
          {shared.map((f) => (
            <button key={f.id} onClick={() => openSigned("portal_files", f.bucket_path, f.file_name)}
              className="flex items-center gap-2 text-sm hover:underline text-left">
              <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> {f.title}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-1.5">
        <div className="text-xs font-bold uppercase tracking-wider text-portal-navy">Send us a file</div>
        <input ref={ref} type="file" multiple className="hidden"
          onChange={(e) => { if (e.target.files?.length) void handle(e.target.files); e.target.value = ""; }} />
        <Button size="sm" variant="outline" disabled={busy} onClick={() => ref.current?.click()}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload a file
        </Button>
        {lastSent && (
          <div className="flex items-start gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm font-semibold text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="min-w-0">
              {lastSent.count} file{lastSent.count > 1 ? "s" : ""} sent — the Neuron Garage team can see {lastSent.count > 1 ? "them" : "it"} now
              <span className="block font-normal text-xs text-success/90 truncate">
                {lastSent.names.slice(0, 2).join(", ")}
                {lastSent.names.length > 2 ? ` +${lastSent.names.length - 2} more` : ""}
              </span>
            </span>
          </div>
        )}
        {uploads.length > 0 && (
          <ul className="space-y-1">
            {uploads.map((u) => (
              <li key={u.id} className={`flex items-center gap-2 text-xs rounded-md px-2 py-1 ${
                isFlashed(u.file_name) ? "border border-success/50 bg-success/10 text-success font-semibold" : "text-muted-foreground"
              }`}>
                <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${isFlashed(u.file_name) ? "text-success" : "text-portal-navy"}`} />
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{u.file_name}</span>
                <span>· sent {new Date(u.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
