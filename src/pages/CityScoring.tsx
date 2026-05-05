import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { sampleCities, CityData } from "@/data/cityData";
import { StatCards } from "@/components/city-scoring/StatCards";
import { FilterBar } from "@/components/city-scoring/FilterBar";
import { CityTable } from "@/components/city-scoring/CityTable";
import { CityDetailDrawer } from "@/components/city-scoring/CityDetailDrawer";
import { ScoringWeights } from "@/components/city-scoring/ScoringWeights";
import { CompareModal } from "@/components/city-scoring/CompareModal";
import { Button } from "@/components/ui/button";
import { GitCompare } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const CityScoring = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [nonRegOnly, setNonRegOnly] = useState(true);
  const [stateFilter, setStateFilter] = useState("All");
  const [tierFilter, setTierFilter] = useState("All");
  const [minScore, setMinScore] = useState(0);
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [weights, setWeights] = useState<Record<string, number>>({
    summerCampDemand: 20, schoolDensity: 15, childPopulation: 20,
    dualIncomeFamilies: 15, stemJobs: 15, competitionScore: 15,
  });

  // Open city drawer when arriving via global search (?city=ID)
  useEffect(() => {
    const id = searchParams.get("city");
    if (!id) return;
    const found = sampleCities.find((c) => c.id === Number(id));
    if (found) {
      setSelectedCity(found);
      setDrawerOpen(true);
      setNonRegOnly(false); // ensure city is visible if filter would hide it
    }
    searchParams.delete("city");
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filtered = useMemo(() => {
    return sampleCities.filter(c => {
      if (nonRegOnly && !c.isNonRegistration) return false;
      if (stateFilter !== "All" && c.state !== stateFilter) return false;
      if (tierFilter !== "All" && c.tier !== tierFilter) return false;
      if (c.compositeScore < minScore) return false;
      return true;
    });
  }, [nonRegOnly, stateFilter, tierFilter, minScore]);

  const handleSelectCity = (city: CityData) => {
    setSelectedCity(city);
    setDrawerOpen(true);
  };

  const handleToggleCompare = (id: number) => {
    setSelectedForCompare(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  };

  const compareCities = sampleCities.filter(c => selectedForCompare.includes(c.id));

  return (
    <div className="-mx-3 md:-mx-5 lg:-mx-6 -my-3 px-3 md:px-5 lg:px-6 py-3 min-h-screen" style={{ backgroundColor: '#f2f4f6' }}>
      <div className="max-w-[1280px] mx-auto w-full">
      <PageHeader
        title="City Scoring"
        subtitle="Analyze and rank U.S. cities to find the best markets for new Neuron Garage franchises."
      />

      <StatCards cities={filtered} nonRegOnly={nonRegOnly} onToggleNonReg={setNonRegOnly} />
      <FilterBar
        stateFilter={stateFilter} tierFilter={tierFilter} minScore={minScore}
        onStateChange={setStateFilter} onTierChange={setTierFilter} onMinScoreChange={setMinScore}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <p className="text-sm" style={{ color: '#6c757d' }}>{filtered.length} cities found</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={compareMode ? "default" : "outline"}
            size="sm"
            onClick={() => { setCompareMode(!compareMode); setSelectedForCompare([]); }}
            style={{ minHeight: 44 }}
          >
            <GitCompare size={14} className="mr-1" /> {compareMode ? "Cancel Compare" : "Compare"}
          </Button>
          {compareMode && selectedForCompare.length === 2 && (
            <Button size="sm" className="text-white" style={{ backgroundColor: '#fd7e14', minHeight: 44 }} onClick={() => setCompareOpen(true)}>
              Compare Selected
            </Button>
          )}
        </div>
      </div>

      <CityTable
        cities={filtered}
        onSelectCity={handleSelectCity}
        compareMode={compareMode}
        selectedForCompare={selectedForCompare}
        onToggleCompare={handleToggleCompare}
      />

      <ScoringWeights weights={weights} onChangeWeight={(k, v) => setWeights(prev => ({ ...prev, [k]: v }))} />

      <CityDetailDrawer city={selectedCity} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <CompareModal open={compareOpen} onClose={() => setCompareOpen(false)} cities={compareCities} />
      </div>
    </div>
  );
};

export default CityScoring;
