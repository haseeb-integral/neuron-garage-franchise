import { Button } from "@/components/ui/button";
import { Download, Tag, MailPlus, X } from "lucide-react";

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
    <div className="rounded-xl border border-[#dbe4f2] bg-[#f8fbff] p-2.5 flex flex-wrap items-center gap-2 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <span className="px-2 text-sm font-bold text-[#174be8]">
        {count} selected
      </span>
      <div className="h-5 w-px hidden sm:block bg-[#dbe4f2]" />
      <Button variant="outline" size="sm" onClick={onExport} className="h-8 rounded-lg border-[#dbe4f2] bg-white text-[#174be8] shadow-none hover:bg-[#eef4ff]">
        <Download size={14} /> Export CSV
      </Button>
      <Button variant="outline" size="sm" onClick={onAddTag} className="h-8 rounded-lg border-[#dbe4f2] bg-white text-[#174be8] shadow-none hover:bg-[#eef4ff]">
        <Tag size={14} /> Add Tag
      </Button>
      <Button size="sm" onClick={onPromote} className="h-8 rounded-lg bg-[#174be8] text-white shadow-none hover:bg-[#123fc5]">
        <MailPlus size={14} /> Add to Outreach
      </Button>
      <button onClick={onClear} className="ml-auto p-1 rounded hover:bg-white text-[#66728a]" aria-label="Clear selection">
        <X size={16} />
      </button>
    </div>
  );
}
