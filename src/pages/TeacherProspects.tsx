import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { sampleTeachers, generateProspectsForCity, TeacherProspect } from "@/data/teacherData";
import { sampleCities } from "@/data/cityData";
import { FindProspectsModal } from "@/components/teacher-prospects/FindProspectsModal";
import { TeacherFilterBar } from "@/components/teacher-prospects/TeacherFilterBar";
import { TeacherTable } from "@/components/teacher-prospects/TeacherTable";
import { TeacherDetailPanel } from "@/components/teacher-prospects/TeacherDetailPanel";
import { BulkActionBar } from "@/components/teacher-prospects/BulkActionBar";
import { OutreachIntelligence } from "@/components/teacher-prospects/OutreachIntelligence";
import { PageHeader } from "@/components/PageHeader";

const TeacherProspects = () => {
  const [prospects, setProspects] = useState<TeacherProspect[]>(sampleTeachers);
  const [findOpen, setFindOpen] = useState(false);
  const [active, setActive] = useState<TeacherProspect | null>(null);
  const [selected, setSelected] = useState<number[]>([]);

  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("All");
  const [tagFilter, setTagFilter] = useState("All");
  const [gradeFilter, setGradeFilter] = useState("All");
  const [enrichmentFilter, setEnrichmentFilter] = useState("All");
  const [campOnly, setCampOnly] = useState(false);

  const cities = useMemo(() => Array.from(new Set(prospects.map(p => p.city))), [prospects]);

  const filtered = useMemo(() => {
    return prospects.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.school.toLowerCase().includes(search.toLowerCase())) return false;
      if (cityFilter !== "All" && p.city !== cityFilter) return false;
      if (tagFilter !== "All" && p.tag !== tagFilter) return false;
      if (gradeFilter !== "All" && p.gradeLevel !== gradeFilter) return false;
      if (enrichmentFilter !== "All" && p.enrichmentStatus !== enrichmentFilter) return false;
      if (campOnly && !p.hasSummerCampExp) return false;
      return true;
    });
  }, [prospects, search, cityFilter, tagFilter, gradeFilter, enrichmentFilter, campOnly]);

  const handleResults = (cityId: number) => {
    const city = sampleCities.find(c => c.id === cityId);
    if (!city) return;
    const startId = Math.max(...prospects.map(p => p.id), 0) + 1;
    const newOnes = generateProspectsForCity(cityId, city.city, city.state, startId);
    setProspects(prev => [...newOnes, ...prev]);
    toast.success(`Added 5 new prospects from ${city.city}`);
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    const visibleIds = filtered.map(p => p.id);
    const allSelected = visibleIds.every(id => selected.includes(id));
    setSelected(allSelected ? selected.filter(id => !visibleIds.includes(id)) : Array.from(new Set([...selected, ...visibleIds])));
  };

  const handlePromote = (p: TeacherProspect) => {
    toast.success(`${p.name} promoted to Candidate Pipeline`);
    setActive(null);
  };

  const handleMarkNotFit = (p: TeacherProspect) => {
    setProspects(prev => prev.map(x => x.id === p.id ? { ...x, tag: "Not a Fit" } : x));
    toast.info(`${p.name} marked as Not a Fit`);
    setActive(null);
  };

  const handleUpdate = (p: TeacherProspect) => {
    setProspects(prev => prev.map(x => x.id === p.id ? p : x));
  };

  return (
    <div className="-mx-4 md:-mx-8 -my-4 md:-my-8 px-4 md:px-8 py-4 md:py-8 min-h-screen" style={{ backgroundColor: "#f2f4f6" }}>
      <PageHeader
        title="Teacher Prospects"
        subtitle="Discover and evaluate potential franchisee candidates from the teaching community."
        action={
          <Button
            onClick={() => setFindOpen(true)}
            className="text-white w-full sm:w-auto"
            style={{ backgroundColor: "#fd7e14", minHeight: 44 }}
          >
            <Search size={16} /> Find Prospects
          </Button>
        }
      />

      <TeacherFilterBar
        cities={cities}
        cityFilter={cityFilter} setCityFilter={setCityFilter}
        tagFilter={tagFilter} setTagFilter={setTagFilter}
        gradeFilter={gradeFilter} setGradeFilter={setGradeFilter}
        campOnly={campOnly} setCampOnly={setCampOnly}
        enrichmentFilter={enrichmentFilter} setEnrichmentFilter={setEnrichmentFilter}
        search={search} setSearch={setSearch}
      />

      <BulkActionBar
        count={selected.length}
        onExport={() => toast.success(`Exported ${selected.length} prospects to CSV`)}
        onAddTag={() => toast.info("Add tag dialog (placeholder)")}
        onPromote={() => { toast.success(`Promoted ${selected.length} prospects`); setSelected([]); }}
        onClear={() => setSelected([])}
      />

      <TeacherTable
        prospects={filtered}
        selected={selected}
        onToggleSelect={toggleSelect}
        onToggleAll={toggleAll}
        onRowClick={setActive}
        onPromote={handlePromote}
      />

      <OutreachIntelligence />

      <FindProspectsModal open={findOpen} onOpenChange={setFindOpen} onResults={handleResults} />

      <TeacherDetailPanel
        prospect={active}
        onClose={() => setActive(null)}
        onUpdate={handleUpdate}
        onPromote={handlePromote}
        onMarkNotFit={handleMarkNotFit}
      />
    </div>
  );
};

export default TeacherProspects;
