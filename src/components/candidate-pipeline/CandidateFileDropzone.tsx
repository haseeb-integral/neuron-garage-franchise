import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export interface CandidateFileRow {
  id: string;
  candidate_id: string;
  bucket_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  category: string;
  uploaded_by: string | null;
  uploaded_by_email: string | null;
  created_at: string;
  deleted_at: string | null;
}

export type DocumentCategory =
  | "general"
  | "background_check"
  | "credit_check"
  | "facility_form"
  | "marketing_plan"
  | "fdd_proof"
  | "fa_proof";

const BUCKET = "candidate_documents";
const MAX_BYTES = 25 * 1024 * 1024; // 25MB per file

interface Props {
  candidateDbId: string;
  category?: DocumentCategory;
  /** If true, render just the dropzone + inline list (no headings). Used inline next to checklist items. */
  compact?: boolean;
  /** Limit listing to a single category (default: show all when not compact). */
  filterCategory?: DocumentCategory;
}

function formatBytes(n: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export function CandidateFileDropzone({
  candidateDbId,
  category = "general",
  compact = false,
  filterCategory,
}: Props) {
  const [files, setFiles] = useState<CandidateFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("candidate_files")
      .select("*")
      .eq("candidate_id", candidateDbId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (filterCategory) q = q.eq("category", filterCategory);
    const { data, error } = await q;
    if (error) {
      toast.error("Couldn't load files", { description: error.message });
    } else {
      setFiles((data ?? []) as CandidateFileRow[]);
    }
    setLoading(false);
  }, [candidateDbId, filterCategory]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const arr = Array.from(fileList);
      if (!arr.length) return;

      const oversize = arr.find((f) => f.size > MAX_BYTES);
      if (oversize) {
        toast.error("File too large", {
          description: `${oversize.name} is over 25MB`,
        });
        return;
      }

      setUploading(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      const uemail = userData.user?.email ?? null;

      let ok = 0;
      for (const file of arr) {
        const uniq = crypto.randomUUID();
        const path = `candidates/${candidateDbId}/${category}/${uniq}-${safeName(file.name)}`;

        const up = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type || undefined, upsert: false });

        if (up.error) {
          toast.error(`Upload failed: ${file.name}`, { description: up.error.message });
          continue;
        }

        const ins = await supabase.from("candidate_files").insert({
          candidate_id: candidateDbId,
          bucket_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
          category,
          uploaded_by: uid,
          uploaded_by_email: uemail,
        });

        if (ins.error) {
          // best-effort cleanup
          await supabase.storage.from(BUCKET).remove([path]);
          toast.error(`Couldn't save metadata: ${file.name}`, { description: ins.error.message });
          continue;
        }
        ok += 1;
      }

      setUploading(false);
      if (ok > 0) {
        toast.success(`Uploaded ${ok} file${ok > 1 ? "s" : ""}`);
        void loadFiles();
      }
    },
    [candidateDbId, category, loadFiles]
  );

  const handleDownload = async (row: CandidateFileRow) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.bucket_path, 60 * 60);
    if (error || !data?.signedUrl) {
      toast.error("Couldn't open file", { description: error?.message });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const handleSoftDelete = async (row: CandidateFileRow) => {
    if (!confirm(`Remove "${row.file_name}" from this candidate?`)) return;
    const { error } = await supabase
      .from("candidate_files")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) {
      toast.error("Delete failed", { description: error.message });
      return;
    }
    toast.success("File removed");
    void loadFiles();
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-lg ${
          compact ? "p-3" : "p-6"
        } text-center transition-colors cursor-pointer ${
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-sm text-muted-foreground">
            <Upload className="h-5 w-5" />
            <div>
              <span className="font-medium text-foreground">Click to upload</span> or drag &amp; drop
            </div>
            {!compact && <div className="text-xs">PDF, DOCX, PNG, JPG · max 25MB each</div>}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground">Loading files…</div>
      ) : files.length === 0 ? (
        !compact && <div className="text-xs text-muted-foreground italic">No documents yet.</div>
      ) : (
        <ul className="space-y-1.5">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
            >
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <button
                onClick={() => handleDownload(f)}
                className="flex-1 min-w-0 text-left hover:underline truncate"
                title={f.file_name}
              >
                {f.file_name}
              </button>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {formatBytes(f.size_bytes)} ·{" "}
                {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                {f.uploaded_by_email ? ` · ${f.uploaded_by_email}` : ""}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleDownload(f)}
                title="Download"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => handleSoftDelete(f)}
                title="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
