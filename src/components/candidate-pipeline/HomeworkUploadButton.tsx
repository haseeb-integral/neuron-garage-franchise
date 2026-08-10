import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

const BUCKET = "candidate_documents";
const MAX_BYTES = 25 * 1024 * 1024;

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

interface Props {
  candidateDbId: string;
  /** Stable key for the homework item, e.g. "rfc_part1". */
  itemKey: string;
  /** Human label, stored so the Documents tab shows what the file is for. */
  itemLabel: string;
}

interface FileRow {
  id: string;
  file_name: string;
  bucket_path: string;
}

/**
 * Small "Upload" button rendered next to a homework item. Files land in the
 * shared candidate_documents bucket under the "homework" category, so they
 * appear in the Documents tab alongside everything else.
 */
export function HomeworkUploadButton({ candidateDbId, itemKey, itemLabel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<FileRow[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("candidate_files")
      .select("id, file_name, bucket_path")
      .eq("candidate_id", candidateDbId)
      .eq("category", "homework")
      .is("deleted_at", null)
      .like("bucket_path", `%/homework/${itemKey}/%`)
      .order("created_at", { ascending: false });
    setFiles((data ?? []) as FileRow[]);
  }, [candidateDbId, itemKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleFiles = async (list: FileList) => {
    const arr = Array.from(list);
    if (!arr.length) return;
    const big = arr.find((f) => f.size > MAX_BYTES);
    if (big) {
      toast.error("File too large", { description: `${big.name} is over 25MB` });
      return;
    }
    setUploading(true);
    const { data: userData } = await supabase.auth.getUser();
    let ok = 0;
    for (const file of arr) {
      const path = `candidates/${candidateDbId}/homework/${itemKey}/${crypto.randomUUID()}-${safeName(file.name)}`;
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
        file_name: `${itemLabel} — ${file.name}`,
        mime_type: file.type || null,
        size_bytes: file.size,
        category: "homework",
        uploaded_by: userData.user?.id ?? null,
        uploaded_by_email: userData.user?.email ?? null,
      });
      if (ins.error) {
        await supabase.storage.from(BUCKET).remove([path]);
        toast.error(`Couldn't save file: ${file.name}`, { description: ins.error.message });
        continue;
      }
      ok += 1;
    }
    setUploading(false);
    if (ok > 0) {
      toast.success(`Uploaded ${ok} file${ok > 1 ? "s" : ""} — see the Documents tab`);
      void load();
    }
  };

  const open = async (row: FileRow) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.bucket_path, 60 * 60);
    if (error || !data?.signedUrl) {
      toast.error("Couldn't open file", { description: error?.message });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <span className="shrink-0 flex items-center gap-1">
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
      {files.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-[11px]"
          onClick={() => open(files[0])}
          title={files[0].file_name}
        >
          <FileText className="h-3 w-3 mr-1" />
          {files.length}
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-6 px-2 text-[11px]"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
        {uploading ? "" : "Upload"}
      </Button>
    </span>
  );
}
