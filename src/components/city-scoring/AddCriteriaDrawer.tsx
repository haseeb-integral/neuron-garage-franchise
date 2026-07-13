import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAddCustomCriterion } from "@/hooks/useCustomCriteria";

export const SCORING_CATEGORIES = [
  "Demand",
  "Operator & Venue Supply",
  "Competitive Opportunity",
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddCriteriaDrawer({ open, onClose }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(SCORING_CATEGORIES[0]);
  const [weight, setWeight] = useState<number>(5);
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const addCriterion = useAddCustomCriterion();

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Metric name is required");
      return;
    }
    try {
      await addCriterion.mutateAsync({
        category,
        name: name.trim(),
        weight: Math.max(0, Number(weight) || 0),
        data_source: source.trim() || null,
        notes: notes.trim() || null,
      });
      toast.success(`Added "${name}" under ${category}`, {
        description: "Saved to your team's scoring config. Open Configure metrics to see it.",
      });
      setName("");
      setSource("");
      setNotes("");
      setWeight(5);
      onClose();
    } catch (err: any) {
      toast.error("Failed to save custom criterion", { description: err?.message || String(err) });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-[520px]">
        <SheetHeader className="space-y-1 text-left">
          <SheetTitle className="text-[22px] font-black leading-tight text-[#07142f]">
            Add Custom Scoring Metric
          </SheetTitle>
          <p className="text-sm leading-snug text-[#66728a]">
            Add one metric inside an existing scoring category. Saved to your team's scoring config and
            included in the category score using a neutral value of 50 until a live data source is connected.
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
              <Label className="text-xs font-semibold text-[#526078]">Weight</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="h-10 rounded-lg border-[#dbe4f0] text-sm"
              />
              <p className="text-[10.5px] leading-snug text-[#8794ab]">
                Same scale as built-in sub-weights — auto-normalized to 100% within the category.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#526078]">Data Source (optional)</Label>
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

          <div className="rounded-xl border border-[#fde68a] bg-[#fffbe6] px-4 py-3">
            <p className="text-xs font-semibold text-[#854d0e]">⚠ Placeholder scoring</p>
            <p className="mt-1 text-[11px] leading-snug text-[#854d0e]">
              Until a live data source is wired, this metric contributes a neutral score of 50 to the
              category. The drawer and Show Formula table tag it so you always know which numbers are real.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="h-10 rounded-lg border-[#dbe4f0] px-5">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={addCriterion.isPending}
              className="h-10 rounded-lg bg-[#174be8] px-6 text-white hover:bg-[#1240c9]"
            >
              {addCriterion.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
