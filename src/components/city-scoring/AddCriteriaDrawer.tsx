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
    setName("");
    setSource("");
    setNotes("");
    setWeight(5);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-[520px]">
        <SheetHeader className="space-y-1 text-left">
          <SheetTitle className="text-[22px] font-black leading-tight text-[#07142f]">
            Add Custom Scoring Metric
          </SheetTitle>
          <p className="text-sm leading-snug text-[#66728a]">
            Add one metric inside an existing scoring category. This does not create a new top-level card.
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#526078]">Metric Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Walkability Index"
              className="h-10 rounded-lg border-[#dbe4f0] text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#526078]">Category</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#dbe4f0] bg-white px-3 text-sm text-[#273142] outline-none focus:border-[#174be8] focus:ring-2 focus:ring-[#174be8]/10"
            >
              {SCORING_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <p className="text-[11px] leading-snug text-[#8794ab]">
              Custom metrics are nested inside one of the six fixed categories.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_1fr]">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#526078]">Weight %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="h-10 rounded-lg border-[#dbe4f0] text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#526078]">Data Source</Label>
              <Input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. Walk Score API"
                className="h-10 rounded-lg border-[#dbe4f0] text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#526078]">Notes / Formula</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Describe how this metric is computed…"
              className="min-h-[92px] rounded-lg border-[#dbe4f0] text-sm"
            />
          </div>

          <div className="rounded-xl border border-[#dbe6ff] bg-[#f5f8ff] px-4 py-3">
            <p className="text-xs font-medium text-[#66728a]">This will appear under:</p>
            <p className="mt-0.5 text-sm font-bold text-[#174be8]">{category}</p>
            <p className="mt-1 text-[11px] leading-snug text-[#66728a]">
              After saving, that scoring card will show a small “+1 custom metric” note.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="h-10 rounded-lg border-[#dbe4f0] px-5">
              Cancel
            </Button>
            <Button onClick={handleSave} className="h-10 rounded-lg bg-[#174be8] px-6 text-white hover:bg-[#1240c9]">
              Save
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
