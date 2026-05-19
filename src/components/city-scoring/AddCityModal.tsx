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

// Per cityScoringLiveData.ts — currently only TX + FL flagged as non-registration.
// Keep in sync with src/lib/cityScoringLiveData.ts.
const NON_REGISTRATION_STATES = new Set(["Texas", "Florida"]);

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded: (city: string, state: string) => void;
}

export function AddCityModal({ open, onClose, onAdded }: Props) {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setCity(""); setState(""); };

  const handleSubmit = async () => {
    const c = city.trim();
    const s = state.trim();
    if (!c || !s) {
      toast.error("City and State are required");
      return;
    }
    setSaving(true);
    try {
      // 1. Look up geo row (case-insensitive on city/city_ascii + state_name)
      const { data: geoRows, error: geoErr } = await supabase
        .from("us_cities_geo")
        .select("city, city_ascii, state_name, state_id, county_name, lat, lng, population")
        .ilike("state_name", s)
        .or(`city.ilike.${c},city_ascii.ilike.${c}`)
        .limit(1);
      if (geoErr) throw geoErr;
      const geo = geoRows?.[0];
      if (!geo) {
        toast.error(`We don't have geographic data for "${c}, ${s}". Please check spelling or contact Haseeb.`);
        return;
      }

      // 2. Check for existing scored row
      const { data: existing } = await supabase
        .from("us_cities_scored")
        .select("id")
        .eq("city_name", geo.city)
        .eq("state_name", geo.state_name)
        .maybeSingle();
      if (existing) {
        toast.info(`${geo.city}, ${geo.state_name} is already in your list`);
        onAdded(geo.city, geo.state_name);
        reset();
        onClose();
        return;
      }

      // 3. Insert into canonical scored cities table (scores blank until next seed run)
      const { error } = await supabase.from("us_cities_scored").insert({
        city_name: geo.city,
        state_name: geo.state_name,
        state_abbr: geo.state_id,
        county_name: geo.county_name ?? null,
        latitude: geo.lat ?? null,
        longitude: geo.lng ?? null,
        population: geo.population ?? null,
        is_registration_state: !NON_REGISTRATION_STATES.has(geo.state_name),
      });
      if (error) throw error;
      toast.success(`Added ${geo.city}, ${geo.state_name}. Scores will populate on the next seed run.`);
      onAdded(geo.city, geo.state_name);
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
            Look up a US city by name + state. County, metro area, and coordinates are filled
            automatically from our geo database. Scores will be blank until the next seed run.
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
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "Adding..." : "Add City"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
