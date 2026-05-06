import { useEffect, useState } from "react";
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

type CustomCriterion = {
  name: string;
  category: string;
  weight: number;
  source: string;
  notes: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (criterion: CustomCriterion) => void;
}

export function AddCriteriaDrawer({ open, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(SCORING_CATEGORIES[0]);
  const [weight, setWeight] = useState<number>(5);
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [savedCriteria, setSavedCriteria] = useState<CustomCriterion[]>([]);
  const [metricDetails, setMetricDetails] = useState<{
    category: string;
    items: CustomCriterion[];
    left: number;
    top: number;
  } | null>(null);

  useEffect(() => {
    const enhanceCustomMetricLabels = () => {
      document.querySelectorAll("p").forEach((node) => {
        const text = node.textContent || "";
        if (!/^\+\d+ custom metric/.test(text.trim())) return;
        node.setAttribute("role", "button");
        node.setAttribute("tabindex", "0");
        node.setAttribute("title", "Click to view saved custom metric details");
        node.classList.add("cursor-pointer", "underline", "decoration-dotted", "underline-offset-2");
      });
    };

    enhanceCustomMetricLabels();
    const observer = new MutationObserver(enhanceCustomMetricLabels);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleMetricLabelClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (target.closest("[data-custom-metric-popover]")) return;

      const metricLabel = target.closest("p[role='button']") as HTMLElement | null;
      const labelText = metricLabel?.textContent?.trim() || "";

      if (!metricLabel || !/^\+\d+ custom metric/.test(labelText)) {
        setMetricDetails(null);
        return;
      }

      const cardText = metricLabel.parentElement?.textContent || "";
      const matchedCategory = SCORING_CATEGORIES.find((c) => cardText.includes(c));
      if (!matchedCategory) return;

      const items = savedCriteria.filter((criterion) => criterion.category === matchedCategory);
      if (!items.length) return;

      const rect = metricLabel.getBoundingClientRect();
      const popoverWidth = 320;
      const left = Math.min(Math.max(rect.left, 16), window.innerWidth - popoverWidth - 16);
      const top = Math.min(rect.bottom + 8, window.innerHeight - 260);

      setMetricDetails({ category: matchedCategory, items, left, top });
    };

    document.addEventListener("click", handleMetricLabelClick);
    return () => document.removeEventListener("click", handleMetricLabelClick);
  }, [savedCriteria]);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Metric name is required");
      return;
    }

    const criterion = { name: name.trim(), category, weight, source: source.trim(), notes: notes.trim() };
    onSave(criterion);
    setSavedCriteria((current) => [...current, criterion]);
    toast.success(`Added "${name}" under ${category}`);
    setName("");
    setSource("");
    setNotes("");
    setWeight(5);
    onClose();
  };

  return (
    <>
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

      {metricDetails && (
        <div
          data-custom-metric-popover
          className="fixed z-[80] w-[320px] rounded-xl border border-[#dbe4f0] bg-white p-3 text-left shadow-xl"
          style={{ left: metricDetails.left, top: metricDetails.top }}
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8794ab]">Custom metrics</p>
              <h4 className="text-sm font-black text-[#07142f]">{metricDetails.category}</h4>
            </div>
            <button
              type="button"
              onClick={() => setMetricDetails(null)}
              className="text-lg leading-none text-[#8794ab] hover:text-[#07142f]"
              aria-label="Close custom metric details"
            >
              ×
            </button>
          </div>

          <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
            {metricDetails.items.map((item, index) => (
              <div key={`${item.category}-${item.name}-${index}`} className="rounded-lg border border-[#eef2f7] bg-[#f7faff] p-2.5">
                <p className="text-sm font-bold text-[#07142f]">{item.name}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-[#526078]">
                  <div>
                    <span className="block font-semibold text-[#8794ab]">Weight</span>
                    <span className="font-bold text-[#07142f]">{item.weight}%</span>
                  </div>
                  <div>
                    <span className="block font-semibold text-[#8794ab]">Data Source</span>
                    <span className="font-bold text-[#07142f]">{item.source || "Not added"}</span>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-[#526078]">
                  <span className="block font-semibold text-[#8794ab]">Notes / Formula</span>
                  <p className="mt-0.5 leading-snug text-[#07142f]">{item.notes || "No notes added."}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
