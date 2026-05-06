import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BarChart3,
  Download,
  Mail,
  RefreshCw,
  Search,
  School,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { sampleTeachers, generateProspectsForCity, TeacherProspect } from "@/data/teacherData";
import { sampleCities } from "@/data/cityData";
import { FindProspectsModal } from "@/components/teacher-prospects/FindProspectsModal";
import { TeacherFilterBar } from "@/components/teacher-prospects/TeacherFilterBar";
import { TeacherTable } from "@/components/teacher-prospects/TeacherTable";
import { TeacherDetailPanel } from "@/components/teacher-prospects/TeacherDetailPanel";
import { BulkActionBar } from "@/components/teacher-prospects/BulkActionBar";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { deriveFitTag } from "@/utils/fitScore";
import { useQueryClient } from "@tanstack/react-query";

const stateAbbr = (state?: string | null) => {
  if (!state) return "";
  if (state.length === 2) return state.toUpperCase();
  if (state === "Texas") return "TX";
  if (state === "Florida") return "FL";
  return state;
};

const downloadCsv = (rows: TeacherProspect[]) => {
  const headers = ["Name", "School", "City", "State", "Email", "Phone", "LinkedIn", "Fit Score", "Tag", "Enrichment", "Grade Level", "Years Experience", "Camp Experience"];
  const escape = (value: string | number | boolean) => `"${String(value).replace(/"/g, '""')}"`;
  const csv = [
    headers.join(","),
    ...rows.map((p) => [
      p.name,
      p.school,
      p.city,
      p.state,
      p.email,
      p.phone,
      p.linkedin,
      p.fitScore,
      p.tag,
      p.enrichmentStatus,
      p.gradeLevel,
      p.yearsExperience,
      p.hasSummerCampExp ? "Yes" : "No",
    ].map(escape).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `teacher-prospects-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const MetricCard = ({
  title,
  value,
  delta,
  icon,
  tone = "blue",
}: {
  title: string;
  value: string | number;
  delta: string;
  icon: React.ReactNode;
  tone?: "blue" | "gold" | "green" | "cyan";
}) => {
  const tones = {
    blue: "bg-[#eef4ff] text-[#174be8]",
    gold: "bg-[#fff4df] text-[#f59e0b]",
    green: "bg-[#e6f7ef] text-[#0ea66e]",
    cyan: "bg-[#e6f9ff] text-[#0891b2]",
  };

  return (
    <div className="rounded-2xl border border-[#e7edf5] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-[#34445f]">{title}</div>
          <div className="mt-1 text-2xl font-black leading-none text-[#07142f]">{value}</div>
          <div className="mt-2 text-[11px] font-semibold text-[#0ea66e]">↑ {delta}</div>
        </div>
      </div>
    </div>
  );
};

const SourcingInsights = () => {
  const channels = [
    { label: "LinkedIn", count: "145 prospects", pct: 41, color: "#174be8" },
    { label: "Referrals", count: "85 prospects", pct: 24, color: "#7c3aed" },
    { label: "School Sites", count: "60 prospects", pct: 17, color: "#0891b2" },
    { label: "Facebook Groups", count: "35 prospects", pct: 10, color: "#ef4444" },
    { label: "Others", count: "29 prospects", pct: 8, color: "#8794ab" },
  ];

  return (
    <aside className="rounded-2xl border border-[#e7edf5] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-black text-[#07142f]">Sourcing Insights</h3>
        <button className="text-xs font-bold text-[#174be8]">View All</button>
      </div>

      <div className="mb-6">
        <div className="mb-3 text-xs font-bold text-[#34445f]">Top Sourcing Channels</div>
        <div className="space-y-4">
          {channels.map((c) => (
            <div key={c.label}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#eef4ff] text-[10px] font-black" style={{ color: c.color }}>
                    {c.label[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-[#07142f]">{c.label}</div>
                    <div className="text-[10px] text-[#8794ab]">{c.count}</div>
                  </div>
                </div>
                <div className="text-xs font-bold text-[#07142f]">{c.pct}%</div>
              </div>
              <div className="ml-8 h-1.5 rounded-full bg-[#edf2f8]">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, c.pct * 2)}%`, backgroundColor: c.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <div className="mb-3 text-xs font-bold text-[#34445f]">Quick Stats</div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-[#66728a]">Avg. Fit Score</div>
            <div className="mt-1 font-black text-[#0ea66e]">82</div>
          </div>
          <div>
            <div className="text-[#66728a]">Avg. Experience</div>
            <div className="mt-1 font-black text-[#07142f]">6.2 yrs</div>
          </div>
          <div>
            <div className="text-[#66728a]">Cities Covered</div>
            <div className="mt-1 font-black text-[#07142f]">28</div>
          </div>
          <div>
            <div className="text-[#66728a]">Response Rate</div>
            <div className="mt-1 font-black text-[#0ea66e]">36%</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#e7edf5] bg-[#f8fbff] p-4">
        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef4ff] text-[#174be8]">
          <Sparkles size={17} />
        </div>
        <div className="text-sm font-black text-[#07142f]">Expand your reach</div>
        <p className="mt-1 text-xs leading-5 text-[#66728a]">Add more sourcing channels to discover more high-fit teacher prospects.</p>
        <button className="mt-3 text-xs font-bold text-[#174be8]">Manage Channels →</button>
      </div>
    </aside>
  );
};

const TeacherProspects = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [prospects, setProspects] = useState<TeacherProspect[]>(sampleTeachers);
  const [findOpen, setFindOpen] = useState(false);
  const [active, setActive] = useState<TeacherProspect | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [promotedIds, setPromotedIds] = useState<Set<number>>(new Set());
  const [promotingId, setPromotingId] = useState<number | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialCity = searchParams.get("city") ?? "Frisco";
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState(initialCity);
  const [tagFilter, setTagFilter] = useState("All");
  const [gradeFilter, setGradeFilter] = useState("All");
  const [enrichmentFilter, setEnrichmentFilter] = useState("All");
  const [campOnly, setCampOnly] = useState(false);

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

  const cities = useMemo(() => {
    return Array.from(new Set([...prospects.map((p) => p.city), ...sampleCities.map((c) => c.city)])).sort();
  }, [prospects]);

  const selectedMarket = useMemo(() => {
    const urlCity = searchParams.get("city");
    const urlState = searchParams.get("state");
    const marketCity = cityFilter !== "All" ? cityFilter : urlCity ?? "Frisco";
    if (!marketCity) return null;

    return sampleCities.find((c) => {
      const cityMatch = c.city.toLowerCase() === marketCity.toLowerCase();
      if (!urlState) return cityMatch;
      return cityMatch && stateAbbr(c.state) === stateAbbr(urlState);
    }) ?? null;
  }, [cityFilter, searchParams]);

  const marketProspects = useMemo(() => {
    if (!selectedMarket) return prospects;
    return prospects.filter((p) => p.city.toLowerCase() === selectedMarket.city.toLowerCase());
  }, [prospects, selectedMarket]);

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
    const newOnes = generateProspectsForCity(cityId, city.city, stateAbbr(city.state), startId);
    setProspects(prev => [...newOnes, ...prev]);
    setCityFilter(city.city);
    toast.success(`Added 5 sample prospects from ${city.city}`);
  };

  const handleRunMarketSearch = () => {
    if (!selectedMarket) {
      setFindOpen(true);
      return;
    }

    const alreadyHasProspects = prospects.some((p) => p.city.toLowerCase() === selectedMarket.city.toLowerCase());
    if (alreadyHasProspects) {
      toast.info(`Showing available sample prospects for ${selectedMarket.city}. Live enrichment will be connected later.`);
      return;
    }

    const startId = Math.max(...prospects.map((p) => p.id), 0) + 1;
    const newOnes = generateProspectsForCity(selectedMarket.id, selectedMarket.city, stateAbbr(selectedMarket.state), startId);
    setProspects((prev) => [...newOnes, ...prev]);
    setCityFilter(selectedMarket.city);
    toast.success(`Added 5 sample teacher prospects for ${selectedMarket.city}.`, {
      description: "Live enrichment APIs will be connected later.",
    });
  };

  const handleExport = () => {
    const rows = filtered.length > 0 ? filtered : marketProspects;
    if (rows.length === 0) {
      toast.info("No prospects available to export yet. Run Prospect Search first.");
      return;
    }
    downloadCsv(rows);
    toast.success(`Exported ${rows.length} teacher prospects to CSV.`);
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    const visibleIds = filtered.map(p => p.id);
    const allSelected = visibleIds.every(id => selected.includes(id));
    setSelected(allSelected ? selected.filter(id => !visibleIds.includes(id)) : Array.from(new Set([...selected, ...visibleIds])));
  };

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
        fit_tag: deriveFitTag(p.fitScore ?? 0),
        status: "active",
        assigned_to: user?.email ?? null,
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
    qc.invalidateQueries({ queryKey: ["candidates"] });
    toast.success("Promoted to Candidate Pipeline", {
      description: `${p.name} is now in New Lead.`,
      action: {
        label: "View in pipeline",
        onClick: () => navigate(`/candidate-pipeline?candidate=${inserted.id}`),
      },
    });
  };

  const handleMarkNotFit = (p: TeacherProspect) => {
    setProspects(prev => prev.map(x => x.id === p.id ? { ...x, tag: "Not a Fit" } : x));
    toast.info(`${p.name} marked as Not a Fit`);
    setActive(null);
  };

  const handleUpdate = (p: TeacherProspect) => {
    setProspects(prev => prev.map(x => x.id === p.id ? p : x));
  };

  const enrichedCount = marketProspects.filter((p) => p.enrichmentStatus === "Enriched").length;
  const highFitCount = marketProspects.filter((p) => p.fitScore >= 85 || p.tag === "High Potential").length;
  const clusterPotential = selectedMarket ? Math.max(1, Math.min(5, Math.round(selectedMarket.population / 65000))) : null;

  return (
    <div className="-mx-3 -my-3 min-h-screen bg-[#f8fbff] px-3 py-4 md:-mx-5 md:px-5 lg:-mx-6 lg:px-6">
      <div className="mx-auto w-full max-w-[1360px]">
        <PageHeader
          title={selectedMarket ? `${selectedMarket.city}, ${stateAbbr(selectedMarket.state)} Teacher Prospects` : "Teacher Prospects"}
          subtitle={selectedMarket ? "Discover, evaluate, and promote high-potential teacher-operators for this selected market." : "Discover and evaluate potential franchisee candidates from the teaching community."}
          hideJourneyBar
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExport}
                className="h-10 rounded-lg border-[#dbe4f2] bg-white px-4 text-[#174be8] shadow-none hover:bg-[#f4f7ff]"
              >
                <Download size={14} /> Export CSV
              </Button>
              <Button
                size="sm"
                onClick={handleRunMarketSearch}
                className="h-10 rounded-lg bg-[#174be8] px-4 text-white shadow-none hover:bg-[#123fc5]"
              >
                <Search size={14} /> Find Prospects
              </Button>
            </div>
          }
        />

        {selectedMarket && (
          <section className="mb-4 rounded-2xl border border-[#e7edf5] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-1 text-xs font-black uppercase tracking-wide text-[#174be8]">Market Context</div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black text-[#07142f]">
                    Finding teacher-operators for {selectedMarket.city}, {stateAbbr(selectedMarket.state)}
                  </h2>
                  <span className="rounded-full bg-[#e6f7ef] px-2.5 py-1 text-xs font-bold text-[#0a8f5a]">
                    Tier {selectedMarket.tier}
                  </span>
                </div>
                <p className="text-sm text-[#526078]">
                  From City Search · Market Score <strong className="text-[#07142f]">{selectedMarket.compositeScore}</strong> · Population {selectedMarket.population.toLocaleString()} · {selectedMarket.elementarySchools} elementary schools
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-lg border-[#dbe4f2] bg-white px-4 text-[#174be8] shadow-none hover:bg-[#f4f7ff]"
                  onClick={() => {
                    setCityFilter("All");
                    setSearchParams({}, { replace: true });
                    toast.info("Market filter cleared.");
                  }}
                >
                  Change Market
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-lg border-[#dbe4f2] bg-white px-4 text-[#174be8] shadow-none hover:bg-[#f4f7ff]"
                  onClick={handleRunMarketSearch}
                >
                  <RefreshCw size={14} /> Run Prospect Search
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-xl border border-[#edf2f8] bg-white p-4">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#eaf0ff] text-[#174be8]"><School size={17} /></div>
                <div className="text-2xl font-black text-[#07142f]">{selectedMarket.elementarySchools}</div>
                <div className="text-xs font-medium text-[#66728a]">Schools Found</div>
              </div>
              <div className="rounded-xl border border-[#edf2f8] bg-white p-4">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#eaf0ff] text-[#174be8]"><Users size={17} /></div>
                <div className="text-2xl font-black text-[#07142f]">{Math.max(marketProspects.length, selectedMarket.elementarySchools * 12)}</div>
                <div className="text-xs font-medium text-[#66728a]">Teacher Pool</div>
              </div>
              <div className="rounded-xl border border-[#edf2f8] bg-white p-4">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#eaf0ff] text-[#174be8]"><Sparkles size={17} /></div>
                <div className="text-2xl font-black text-[#07142f]">{enrichedCount}</div>
                <div className="text-xs font-medium text-[#66728a]">Enriched Contacts</div>
              </div>
              <div className="rounded-xl border border-[#edf2f8] bg-white p-4">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#eaf0ff] text-[#174be8]"><TrendingUp size={17} /></div>
                <div className="text-2xl font-black text-[#07142f]">{highFitCount}</div>
                <div className="text-xs font-medium text-[#66728a]">High-Fit Teachers</div>
              </div>
              <div className="rounded-xl border border-[#edf2f8] bg-white p-4">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#e6f7ef] text-[#0a8f5a]"><BarChart3 size={17} /></div>
                <div className="text-2xl font-black text-[#07142f]">{clusterPotential}-{Math.min(5, (clusterPotential ?? 1) + 1)}</div>
                <div className="text-xs font-medium text-[#66728a]">Cluster Potential</div>
              </div>
            </div>
          </section>
        )}

        <div className="mb-4 grid gap-4 lg:grid-cols-4">
          <MetricCard title="Total Prospects" value="354" delta="25% vs last period" icon={<Users size={20} />} tone="cyan" />
          <MetricCard title="Shortlisted" value="86" delta="18% vs last period" icon={<Star size={20} />} tone="gold" />
          <MetricCard title="Contacted This Week" value="42" delta="31% vs last period" icon={<Mail size={20} />} tone="blue" />
          <MetricCard title="Promoted to Pipeline" value="23" delta="21% vs last period" icon={<ArrowRight size={20} />} tone="green" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
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
          </div>

          <SourcingInsights />
        </div>

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
    </div>
  );
};

export default TeacherProspects;
