import { CityData } from "@/data/cityData";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TierBadge } from "./TierBadge";
import { Download, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Props {
  city: CityData | null;
  open: boolean;
  onClose: () => void;
}

const breakdownLabels: Record<string, string> = {
  summerCampDemand: "Summer Camp Demand",
  schoolDensity: "School Density",
  childPopulation: "Child Population",
  dualIncomeFamilies: "Dual-Income Families",
  stemJobs: "STEM Jobs",
  competitionScore: "Competition Score",
};

export function CityDetailDrawer({ city, open, onClose }: Props) {
  const [notes, setNotes] = useState(city?.notes ?? "");
  const navigate = useNavigate();

  if (!city) return null;

  const handleFindTeachers = () => {
    onClose();
    navigate(`/teacher-prospects?city=${encodeURIComponent(city.city)}`);
    toast.success(`Showing prospects for ${city.city}, ${city.state}.`);
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[420px] overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-3" style={{ color: '#003c7e' }}>
            {city.city}, {city.state} <TierBadge tier={city.tier} />
          </SheetTitle>
          <p className="text-sm" style={{ color: '#6c757d' }}>Composite Score: <strong>{city.compositeScore}</strong></p>
        </SheetHeader>

        <div className="mb-6">
          <h4 className="text-sm font-semibold mb-3" style={{ color: '#343a40' }}>Score Breakdown</h4>
          <div className="space-y-3">
            {Object.entries(city.scoreBreakdown).map(([key, val]) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: '#6c757d' }}>{breakdownLabels[key]}</span>
                  <span className="font-medium" style={{ color: '#343a40' }}>{val}</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#e9ecef' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, backgroundColor: '#fd7e14' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h4 className="text-sm font-semibold mb-3" style={{ color: '#343a40' }}>Competitive Landscape</h4>
          <div className="space-y-2">
            {city.competitors.map((comp, i) => (
              <div key={i} className="p-3 rounded-lg text-xs" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                <p className="font-semibold" style={{ color: '#343a40' }}>{comp.name}</p>
                <p style={{ color: '#6c757d' }}>{comp.type} · {comp.pricing} · Cap: {comp.capacity}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h4 className="text-sm font-semibold mb-2" style={{ color: '#343a40' }}>Notes</h4>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes about this city..." rows={3} />
        </div>

        <Button
          className="w-full text-white font-semibold mb-2"
          style={{ backgroundColor: '#fd7e14', minHeight: 44 }}
          onClick={handleFindTeachers}
        >
          Find Teachers in this City <ArrowRight size={14} className="ml-2" />
        </Button>

        <Button variant="outline" className="w-full" onClick={() => {}}>
          <Download size={14} className="mr-2" /> Download PDF Report
        </Button>
      </SheetContent>
    </Sheet>
  );
}
