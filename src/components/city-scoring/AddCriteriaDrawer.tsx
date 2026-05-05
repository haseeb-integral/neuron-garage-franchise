import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const SCORING_CATEGORIES = [
  "Demand",
  "Pricing Power",
  "Competitive Landscape",
  "Franchisee Supply",
  "Ease of Operations",
  "Parent Mindset Indicators",
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (criterion: {
    name: string;
    category: string;
    weight: number;
    source: string;
    notes: string;
  }) => void;
}

export function AddCriteriaDrawer({ open, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(SCORING_CATEGORIES[0]);
  const [weight, setWeight] = useState<number>(5);
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Metric name is required");
      return;
    }
    onSave({ name: name.trim(), category, weight, source: source.trim(), notes: notes.trim() });
    toast.success(`Added "${name}" under ${category}`);
    setName(""); setSource(""); setNotes(""); setWeight(5);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[440px] overflow-y-auto bg-white">
        <SheetHeader>
          <SheetTitle className="text-[#07142f]">Add Custom Scoring Metric</SheetTitle>
        </SheetHeader>
        <div className="mt-5 space-y-4">
          <div>
            <Label className="text-xs text-[#526078]">Metric Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Walkability Index" />
          </div>
          <div>
            <Label className="text-xs text-[#526078]">Category</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-md border border-[#e5eaf2] bg-white px-3 py-2 text-sm"
            >
              {SCORING_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <p className="mt-1 text-[11px] text-[#8794ab]">Custom metrics are nested inside one of the six fixed categories.</p>
          </div>
          <div>
            <Label className="text-xs text-[#526078]">Weight %</Label>
            <Input type="number" min={0} max={100} value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs text-[#526078]">Data Source</Label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Walk Score API" />
          </div>
          <div>
            <Label className="text-xs text-[#526078]">Notes / Formula</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Describe how this metric is computed…" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} className="bg-[#174be8] hover:bg-[#1240c9] text-white">Save</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
