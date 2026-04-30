import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createManualOnboarding } from "@/lib/onboardingService";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string) => void;
}

type Status = "on_track" | "stalled" | "overdue" | "completed";

export function NewOnboardingModal({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [status, setStatus] = useState<Status>("on_track");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setCity("");
    setState("");
    setStatus("on_track");
  };

  const handleSubmit = async () => {
    if (!name.trim() || !city.trim() || !state.trim()) {
      toast.error("Name, City, and State are required");
      return;
    }
    setSubmitting(true);
    try {
      const { id } = await createManualOnboarding({
        franchiseeName: name.trim(),
        city: city.trim(),
        state: state.trim(),
        status,
      });
      toast.success(`Onboarding created for ${name.trim()}.`);
      reset();
      onOpenChange(false);
      onCreated(id);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create onboarding");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Onboarding</DialogTitle>
          <DialogDescription>
            Manually create an onboarding record (not linked to a candidate).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="ob-name">Name *</Label>
            <Input id="ob-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ob-city">City *</Label>
              <Input id="ob-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Frisco" />
            </div>
            <div>
              <Label htmlFor="ob-state">State *</Label>
              <Input id="ob-state" value={state} onChange={(e) => setState(e.target.value)} placeholder="TX" />
            </div>
          </div>
          <div>
            <Label>Initial Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on_track">On Track</SelectItem>
                <SelectItem value="stalled">Stalled</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="text-white"
            style={{ backgroundColor: "#fd7e14" }}
          >
            {submitting ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
