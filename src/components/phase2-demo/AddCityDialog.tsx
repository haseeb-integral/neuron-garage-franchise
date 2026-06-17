import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AddCityDialogProps {
  onAdd: (city: string, state: string) => Promise<void>;
}

export function AddCityDialog({ onAdd }: AddCityDialogProps) {
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onAdd(city, state);
      toast.success(`Added ${city.trim()}, ${state.trim().toUpperCase()} to the shortlist.`);
      setCity("");
      setState("");
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md bg-[#174be8] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:bg-[#1240c8]"
        >
          <Plus className="h-3.5 w-3.5" /> Add city
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a city to the shortlist</DialogTitle>
          <DialogDescription>
            The city appears on this page and in the City Scoring Console. Open the console and
            click <strong>Run</strong> to generate its live composite score (≈1–2 min).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#526078]">
              City
            </label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Denver"
              maxLength={80}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#526078]">
              State (2-letter)
            </label>
            <Input
              value={state}
              onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
              placeholder="CO"
              maxLength={2}
              required
              className="uppercase"
            />
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !city.trim() || state.trim().length !== 2}>
              {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Add to shortlist
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
