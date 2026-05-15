import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import { sampleCities } from "@/data/cityData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResults: (cityId: number) => void;
}

const stateAbbr = (state: string) => {
  if (!state) return "";
  if (state.length === 2) return state.toUpperCase();
  const map: Record<string, string> = { Texas: "TX", Florida: "FL", California: "CA", Georgia: "GA", Arizona: "AZ", Colorado: "CO" };
  return map[state] ?? state;
};

export function FindProspectsModal({ open, onOpenChange, onResults }: Props) {
  const [selectedCityId, setSelectedCityId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    if (!selectedCityId) return;
    const city = sampleCities.find((c) => c.id === Number(selectedCityId));
    if (!city) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-teacher-prospects", {
        body: { city: city.city, state: stateAbbr(city.state), limit: 100 },
      });
      if (error) {
        toast.error(`Search failed: ${error.message}`);
      } else if (data?.error) {
        toast.error(`Search failed: ${data.error}`);
      } else {
        const total = (data?.inserted ?? 0) + (data?.updated ?? 0);
        toast.success(`Found ${total} prospects in ${city.city}, ${stateAbbr(city.state)}`);
        onResults(Number(selectedCityId));
        setSelectedCityId("");
        onOpenChange(false);
      }
    } catch (e) {
      toast.error(`Search failed: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle style={{ color: "#003c7e" }}>Find Teachers</DialogTitle>
          <DialogDescription>
            Select a scored city to discover real K-12 teacher prospects via Apify.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: "#343a40" }}>City</label>
            <Select value={selectedCityId} onValueChange={setSelectedCityId} disabled={loading}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Choose a scored city..." />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {sampleCities.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.city}, {c.state} — Tier {c.tier} ({c.compositeScore})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleRun}
            disabled={!selectedCityId || loading}
            className="w-full text-white"
            style={{ backgroundColor: "#fd7e14" }}
          >
            {loading ? (
              <><Loader2 className="animate-spin" /> Searching Apify (up to ~2 min)...</>
            ) : (
              <><Search size={16} /> Run Search</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
