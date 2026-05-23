import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import { sampleCities } from "@/data/cityData";
import { buildMarketView } from "@/lib/marketView";
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
    const stateCode = stateAbbr(city.state);
    setLoading(true);
    const tId = toast.loading(`Searching schools in ${city.city}, ${stateCode}…`);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-teacher-prospects", {
        body: { city: city.city, state: stateCode, limit: 100 },
      });
      if (error || data?.error) {
        toast.error(`Search failed: ${error?.message ?? data?.error}`, { id: tId });
        return;
      }
      const schools: Array<{ school_name: string; website: string; district: string | null; apify_run_id: string }> =
        data?.schools ?? [];
      if (schools.length === 0) {
        toast.success(`Found 0 schools in ${city.city}`, { id: tId });
        onResults(Number(selectedCityId));
        setSelectedCityId("");
        onOpenChange(false);
        return;
      }

      // Chain: enrich each school via Firecrawl, max 5 in flight
      toast.loading(`Found ${schools.length} schools → enriching staff (0/${schools.length})…`, { id: tId });
      let done = 0;
      let totalInserted = 0;
      let totalUpdated = 0;
      const concurrency = 5;
      let cursor = 0;

      const runOne = async (s: typeof schools[number]) => {
        try {
          const { data: r, error: e } = await supabase.functions.invoke("enrich-school-staff", {
            body: {
              school_website: s.website,
              school_name: s.school_name,
              district: s.district,
              city: city.city,
              state: stateCode,
              apify_run_id: s.apify_run_id,
            },
          });
          if (!e && r && !r.error) {
            totalInserted += r.inserted ?? 0;
            totalUpdated += r.updated ?? 0;
          }
        } catch {
          /* swallow per-school */
        } finally {
          done++;
          toast.loading(`Enriching staff (${done}/${schools.length})…`, { id: tId });
        }
      };

      const workers: Promise<void>[] = [];
      for (let w = 0; w < concurrency; w++) {
        workers.push((async () => {
          while (cursor < schools.length) {
            const i = cursor++;
            await runOne(schools[i]);
          }
        })());
      }
      await Promise.all(workers);

      toast.success(
        `${totalInserted + totalUpdated} teachers across ${schools.length} schools in ${city.city}, ${stateCode}`,
        { id: tId }
      );
      onResults(Number(selectedCityId));
      setSelectedCityId("");
      onOpenChange(false);
    } catch (e) {
      toast.error(`Search failed: ${(e as Error).message}`, { id: tId });
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
              <><Loader2 className="animate-spin" /> Searching + enriching (up to ~5 min)...</>
            ) : (
              <><Search size={16} /> Run Search</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
