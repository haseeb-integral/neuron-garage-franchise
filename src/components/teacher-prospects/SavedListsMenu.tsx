import { useEffect, useState } from "react";
import { Bookmark, BookmarkPlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SourceFilter } from "@/lib/teacherSourceLabels";

export type TeacherListFilters = {
  cityFilter: string;
  sourceFilter: SourceFilter;
  search: string;
  hideInOutreach: boolean;
};

type SavedRow = {
  id: string;
  name: string;
  notes: string | null;
  filters: TeacherListFilters;
  created_at: string;
};

interface Props {
  current: TeacherListFilters;
  onApply: (f: TeacherListFilters) => void;
}

export function SavedListsMenu({ current, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<SavedRow[] | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setRows(null);
    const { data, error } = await supabase
      .from("teacher_saved_lists")
      .select("id, name, notes, filters, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(`Couldn't load saved lists: ${error.message}`);
      setRows([]);
      return;
    }
    setRows((data ?? []) as unknown as SavedRow[]);
  };

  useEffect(() => { if (open && rows === null) load(); }, [open]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Give the list a name."); return; }
    setSaving(true);
    const { error } = await supabase.from("teacher_saved_lists").insert({
      name: name.trim(),
      notes: notes.trim() || null,
      filters: current as unknown as Record<string, unknown>,
    });
    setSaving(false);
    if (error) { toast.error(`Save failed: ${error.message}`); return; }
    toast.success(`Saved "${name.trim()}"`);
    setName(""); setNotes(""); setSaveOpen(false);
    setRows(null); // force reload next open
  };

  const handleDelete = async (id: string, n: string) => {
    const { error } = await supabase.from("teacher_saved_lists").delete().eq("id", id);
    if (error) { toast.error(`Delete failed: ${error.message}`); return; }
    toast.success(`Deleted "${n}"`);
    setRows((prev) => (prev ?? []).filter((r) => r.id !== id));
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="h-9 rounded-lg border-[#dbe4f2] bg-white px-3 text-[#174be8] shadow-none hover:bg-[#f4f7ff]">
            <Bookmark size={14} className="mr-1" /> Saved Lists
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 bg-white">
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-[#8794ab]">Your saved views</DropdownMenuLabel>
          {rows === null && (
            <div className="flex items-center gap-2 px-2 py-3 text-xs text-[#8794ab]">
              <Loader2 size={12} className="animate-spin" /> Loading…
            </div>
          )}
          {rows && rows.length === 0 && (
            <div className="px-2 py-3 text-xs text-[#8794ab]">No saved lists yet.</div>
          )}
          {rows && rows.map((r) => (
            <DropdownMenuItem key={r.id} className="group flex items-start justify-between gap-2 py-1.5">
              <button
                onClick={() => { onApply(r.filters); setOpen(false); toast.success(`Loaded "${r.name}"`); }}
                className="min-w-0 flex-1 text-left"
              >
                <div className="truncate text-sm font-medium text-[#07142f]">{r.name}</div>
                <div className="truncate text-[10.5px] text-[#8794ab]">
                  {r.filters?.cityFilter && r.filters.cityFilter !== "All" ? r.filters.cityFilter : "All cities"}
                  {r.filters?.sourceFilter && r.filters.sourceFilter !== "all" ? ` · ${r.filters.sourceFilter}` : ""}
                  {r.filters?.search ? ` · "${r.filters.search}"` : ""}
                </div>
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(r.id, r.name); }}
                className="opacity-0 transition-opacity group-hover:opacity-100"
                title="Delete saved list"
              >
                <Trash2 size={12} className="text-[#b0bbd0] hover:text-red-500" />
              </button>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={(e) => { e.preventDefault(); setSaveOpen(true); setOpen(false); }} className="text-[#174be8]">
            <BookmarkPlus size={13} className="mr-2" /> Save current view…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save current view</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[#34445f]">List name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bethesda elementary" className="mt-1" autoFocus />
            </div>
            <div>
              <label className="text-xs font-medium text-[#34445f]">Notes (optional)</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
            </div>
            <div className="rounded-md border border-[#e7edf5] bg-[#f8fafc] p-2 text-[11px] text-[#526078]">
              <div className="mb-1 font-semibold text-[#34445f]">Filters being saved</div>
              <div>City: <strong className="text-[#07142f]">{current.cityFilter || "All"}</strong></div>
              <div>Source: <strong className="text-[#07142f]">{current.sourceFilter}</strong></div>
              {current.search && <div>Search: <strong className="text-[#07142f]">"{current.search}"</strong></div>}
              <div>Hide in outreach: <strong className="text-[#07142f]">{current.hideInOutreach ? "yes" : "no"}</strong></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#174be8] text-white hover:bg-[#1240c9]">
              {saving ? <Loader2 size={14} className="animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
