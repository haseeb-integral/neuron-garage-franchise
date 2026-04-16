import { Upload, FileText, X } from "lucide-react";
import { useRef } from "react";

interface FileItem { id: string; name: string; size: string }

interface Props {
  files: FileItem[];
  onAdd: (name: string, size: string) => void;
  onRemove: (id: string) => void;
}

export function DocumentUpload({ files, onAdd, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    Array.from(list).forEach((f) => onAdd(f.name, `${(f.size / 1024).toFixed(1)} KB`));
  };

  return (
    <div>
      <h4 className="text-sm font-semibold mb-2" style={{ color: "#003c7e" }}>Documents</h4>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        className="rounded-lg p-6 text-center cursor-pointer transition-colors hover:bg-[#f8f9fa]"
        style={{ border: "2px dashed #ced4da" }}
      >
        <Upload size={20} className="mx-auto mb-1" style={{ color: "#6c757d" }} />
        <p className="text-sm" style={{ color: "#6c757d" }}>Drop files here or click to upload</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {files.length > 0 && (
        <div className="mt-2 space-y-1">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-2 p-2 rounded text-sm" style={{ backgroundColor: "#f8f9fa" }}>
              <FileText size={14} style={{ color: "#003c7e" }} />
              <span className="flex-1 truncate">{f.name}</span>
              <span className="text-xs" style={{ color: "#6c757d" }}>{f.size}</span>
              <button onClick={() => onRemove(f.id)} className="hover:bg-white p-1 rounded">
                <X size={12} style={{ color: "#6c757d" }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
