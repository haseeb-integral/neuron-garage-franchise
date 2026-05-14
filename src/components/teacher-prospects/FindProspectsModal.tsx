import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import { sampleCities } from "@/data/cityData";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResults: (cityId: number) => void;
}

export function FindProspectsModal({ open, onOpenChange, onResults }: Props) {
  const [selectedCityId, setSelectedCityId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleRun = () => {
    if (!selectedCityId) return;
    setLoading(true);
    setTimeout(() => {
      onResults(Number(selectedCityId));
      setLoading(false);
      setSelectedCityId("");
      onOpenChange(false);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle style={{ color: "#003c7e" }}>Find Teachers</DialogTitle>
          <DialogDescription>
            Select a scored city to discover potential teacher franchisees in that area.
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
                {sampleCities.map(c => (
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
              <><Loader2 className="animate-spin" /> Searching...</>
            ) : (
              <><Search size={16} /> Run Search</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
