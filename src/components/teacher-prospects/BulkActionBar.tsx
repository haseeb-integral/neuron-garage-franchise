import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, Tag, MailPlus, X, Plus } from "lucide-react";

interface Props {
  count: number;
  onExport: () => void;
  onAddTag: (tag: string) => Promise<void> | void;
  onPromote: () => void;
  onClear: () => void;
}

export function BulkActionBar({ count, onExport, onAddTag, onPromote, onClear }: Props) {
  const [tagValue, setTagValue] = useState("");
  const [tagOpen, setTagOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (count === 0) return null;

  const apply = async () => {
    const t = tagValue.trim();
    if (!t) return;
    setSaving(true);
    try { await onAddTag(t); setTagValue(""); setTagOpen(false); }
    finally { setSaving(false); }
  };

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-[#dbe4f2] bg-[#f8fbff] p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <span className="px-2 text-sm font-bold text-[#174be8]">{count} selected</span>
      <div className="hidden h-5 w-px bg-[#dbe4f2] sm:block" />
      <Button variant="outline" size="sm" onClick={onExport} className="h-8 rounded-lg border-[#dbe4f2] bg-white text-[#174be8] shadow-none hover:bg-[#eef4ff]">
        <Download size={14} /> Export CSV
      </Button>

      <Popover open={tagOpen} onOpenChange={setTagOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 rounded-lg border-[#dbe4f2] bg-white text-[#174be8] shadow-none hover:bg-[#eef4ff]">
            <Tag size={14} /> Add Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 bg-white p-3">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#66728a]">Apply tag to {count} {count === 1 ? "row" : "rows"}</div>
          <div className="flex gap-2">
            <Input autoFocus value={tagValue} onChange={(e) => setTagValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && apply()} placeholder="e.g. follow-up" className="h-9 rounded-lg border-[#dbe4f2] text-sm" />
            <Button size="sm" disabled={saving || !tagValue.trim()} onClick={apply} className="h-9 rounded-lg bg-[#174be8] text-white"><Plus size={14} /></Button>
          </div>
          <p className="mt-2 text-[11px] text-[#8794ab]">Saved instantly. Use short labels like <code>shortlist</code> or <code>warm</code>.</p>
        </PopoverContent>
      </Popover>

      <Button size="sm" onClick={onPromote} className="h-8 rounded-lg bg-[#174be8] text-white shadow-none hover:bg-[#123fc5]">
        <MailPlus size={14} /> Add to Outreach
      </Button>
      <button onClick={onClear} className="ml-auto rounded-md p-1.5 text-[#66728a] hover:bg-white" aria-label="Clear selection">
        <X size={16} />
      </button>
    </div>
  );
}
