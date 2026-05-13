import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois",
  "Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts",
  "Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota",
  "Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming",
];

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded: (city: string, state: string) => void;
}

export function AddCityModal({ open, onClose, onAdded }: Props) {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [county, setCounty] = useState("");
  const [metro, setMetro] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setCity(""); setState(""); setCounty(""); setMetro(""); };

  const handleSubmit = async () => {
    const c = city.trim();
    const s = state.trim();
    if (!c || !s) {
      toast.error("City and State are required");
      return;
    }
    setSaving(true);
    try {
      // Check for existing
      const { data: existing } = await supabase
        .from("cities").select("id").eq("city", c).eq("state", s).maybeSingle();
      if (existing) {
        toast.info(`${c}, ${s} is already in your list`);
        onAdded(c, s);
        reset();
        onClose();
        return;
      }
      const { error } = await supabase.from("cities").insert({
        city: c,
        state: s,
        county: county.trim() || null,
        metro_area: metro.trim() || null,
      });
      if (error) throw error;
      toast.success(`Added ${c}, ${s}. Click "Refresh This Market" to fetch data.`);
      onAdded(c, s);
      reset();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not add city");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add City</DialogTitle>
          <DialogDescription>
            Add a new market to the Ranked list. It will appear with "No data" until you refresh it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="add-city-name">City *</Label>
            <Input id="add-city-name" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Carmel" />
          </div>
          <div>
            <Label htmlFor="add-city-state">State *</Label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger id="add-city-state"><SelectValue placeholder="Select a state" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="add-city-county">County (optional)</Label>
            <Input id="add-city-county" value={county} onChange={(e) => setCounty(e.target.value)} placeholder="e.g. Hamilton" />
          </div>
          <div>
            <Label htmlFor="add-city-metro">Metro Area (optional)</Label>
            <Input id="add-city-metro" value={metro} onChange={(e) => setMetro(e.target.value)} placeholder="e.g. Indianapolis" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "Adding..." : "Add City"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
