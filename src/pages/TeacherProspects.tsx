import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const TeacherProspects = () => {
  const { user } = useAuth();
  const [prospects, setProspects] = useState<TeacherProspect[]>(sampleTeachers);
  const [findOpen, setFindOpen] = useState(false);
  const [active, setActive] = useState<TeacherProspect | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [promotedIds, setPromotedIds] = useState<Set<number>>(new Set());
  const [promotingId, setPromotingId] = useState<number | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState(searchParams.get("city") ?? "All");

  useEffect(() => {
    const city = searchParams.get("city");
    if (city) setCityFilter(city);
    const prospectId = searchParams.get("prospect");
    if (prospectId) {
      const found = prospects.find((p) => p.id === Number(prospectId));
      if (found) setActive(found);
      searchParams.delete("prospect");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, prospects, setSearchParams]);
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

  // Load already-promoted prospects (by email) so the button stays disabled across reloads
  useEffect(() => {
    (async () => {
      const emails = prospects.map((p) => p.email).filter(Boolean);
      if (emails.length === 0) return;
      const { data } = await supabase
        .from("candidates")
        .select("email")
        .in("email", emails);
      if (!data) return;
      const taken = new Set(data.map((r: any) => r.email));
      setPromotedIds(new Set(prospects.filter((p) => taken.has(p.email)).map((p) => p.id)));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePromote = async (p: TeacherProspect) => {
    if (promotedIds.has(p.id) || promotingId === p.id) return;
    setPromotingId(p.id);

    const [first_name, ...rest] = p.name.trim().split(/\s+/);
    const last_name = rest.join(" ") || "";

    const { data: inserted, error } = await supabase
      .from("candidates")
      .insert({
        prospect_id: null,
        first_name,
        last_name,
        email: p.email,
        city: p.city,
        state: p.state,
        current_stage: "new_lead",
        fit_score: p.fitScore ?? 0,
        fit_tag: p.tag ?? "Untagged",
        status: "active",
        assigned_to: null,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      setPromotingId(null);
      const msg = error?.message ?? "Failed to promote";
      if (msg.toLowerCase().includes("duplicate") || msg.includes("unique")) {
        setPromotedIds((prev) => new Set(prev).add(p.id));
        toast.info(`${p.name} is already in the Candidate Pipeline`);
      } else {
        toast.error(`Could not promote ${p.name}: ${msg}`);
      }
      return;
    }

    await supabase.from("candidate_stage_history").insert({
      candidate_id: inserted.id,
      from_stage: null,
      to_stage: "new_lead",
      changed_by: user?.email ?? null,
      notes: "Promoted from Teacher Prospects",
    });

    setPromotedIds((prev) => new Set(prev).add(p.id));
    setPromotingId(null);
    toast.success("Promoted to Candidate Pipeline");
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
            size="sm"
            onClick={() => setFindOpen(true)}
            className="text-white w-full sm:w-auto"
            style={{ backgroundColor: "#fd7e14" }}
          >
            <Search size={14} /> Find Prospects
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
        promotedIds={promotedIds}
        promotingId={promotingId}
      />

      <OutreachIntelligence />

      <FindProspectsModal open={findOpen} onOpenChange={setFindOpen} onResults={handleResults} />

      <TeacherDetailPanel
        prospect={active}
        onClose={() => setActive(null)}
        onUpdate={handleUpdate}
        onPromote={handlePromote}
        onMarkNotFit={handleMarkNotFit}
        isPromoted={active ? promotedIds.has(active.id) : false}
        isPromoting={active ? promotingId === active.id : false}
      />
    </div>
  );
};

export default TeacherProspects;
