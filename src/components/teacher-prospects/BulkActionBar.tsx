import { Button } from "@/components/ui/button";
import { Download, Tag, ArrowRight, X } from "lucide-react";

interface Props {
  count: number;
  onExport: () => void;
  onAddTag: () => void;
  onPromote: () => void;
  onClear: () => void;
}

export function BulkActionBar({ count, onExport, onAddTag, onPromote, onClear }: Props) {
  if (count === 0) return null;
  return (
    <div className="bg-white rounded-lg p-3 mb-4 flex flex-wrap items-center gap-2 sm:gap-3" style={{ border: "1px solid #fd7e14", boxShadow: "0 2px 8px rgba(253,126,20,0.15)" }}>
      <span className="text-sm font-medium" style={{ color: "#003c7e" }}>
        {count} selected
      </span>
      <div className="h-5 w-px hidden sm:block" style={{ backgroundColor: "#dee2e6" }} />
      <button onClick={onClear} className="ml-auto sm:hidden p-1 rounded hover:bg-gray-100" style={{ color: "#6c757d" }} aria-label="Clear selection">
        <X size={16} />
      </button>
      <Button variant="outline" size="sm" onClick={onExport} className="h-8">
        <Download size={14} /> Export CSV
      </Button>
      <Button variant="outline" size="sm" onClick={onAddTag} className="h-8">
        <Tag size={14} /> Add Tag
      </Button>
      <Button size="sm" onClick={onPromote} className="h-8 text-white" style={{ backgroundColor: "#fd7e14" }}>
        <ArrowRight size={14} /> Promote Selected
      </Button>
      <button onClick={onClear} className="ml-auto p-1 rounded hover:bg-gray-100 hidden sm:block" style={{ color: "#6c757d" }} aria-label="Clear selection">
        <X size={16} />
      </button>
    </div>
  );
}
