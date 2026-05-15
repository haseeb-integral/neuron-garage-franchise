import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Download, Globe2, Linkedin, Mail, RefreshCw, Search, School, Sparkles, Star, TrendingUp, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { TeacherProspect, TeacherTag, EnrichmentStatus, GradeLevel } from "@/data/teacherData";
import { sampleCities } from "@/data/cityData";
import { supabase } from "@/integrations/supabase/client";

type DbRow = {
  id: string;
  name: string | null;
  school: string | null;
  district: string | null;
  email: string | null;
  grade: string | null;
  experience_years: number | null;
  city: string;
  state: string;
  fit_score: number | null;
  status: string;
  created_at: string;
};

type SchoolSearchResult = {
  school_name: string;
  website: string;
  district: string | null;
  apify_run_id: string;
};

const normalizeGrade = (g: string | null): GradeLevel => {
  if (!g) return "3-5";
  const s = g.toLowerCase();
  if (s.includes("k") || s.includes("1") || s.includes("2")) return "K-2";
  if (s.includes("6") || s.includes("7") || s.includes("8") || s.includes("middle")) return "6-8";
  return "3-5";
};

let _hashCounter = 0;
const stableId = (uuid: string) => {
  // Map UUID -> stable positive int for the existing number-keyed UI
  let h = 0;
  for (let i = 0; i < uuid.length; i++) h = (h * 31 + uuid.charCodeAt(i)) | 0;
  return Math.abs(h) || ++_hashCounter;
};

const mapRow = (r: DbRow): TeacherProspect => ({
  id: stableId(r.id),
  cityId: 0,
  name: r.name ?? "(Unknown)",
  school: r.school ?? (r.district ?? "—"),
  city: r.city,
  state: r.state,
  email: r.email ?? "",
  phone: "",
  linkedin: "",
  fitScore: (r.fit_score ?? null) as unknown as number,
  tag: (r.fit_score == null ? "Untagged" : r.fit_score >= 80 ? "High Potential" : r.fit_score >= 50 ? "Follow-Up" : "Not a Fit") as TeacherTag,
  enrichmentStatus: (r.email ? "Enriched" : "Pending") as EnrichmentStatus,
  gradeLevel: normalizeGrade(r.grade),
  yearsExperience: r.experience_years ?? 0,
  hasSummerCampExp: false,
  aiReasoning: "Imported from Apify K-12 staff directory. Awaiting AI fit scoring.",
  tags: [],
  notes: "",
});
import { FindProspectsModal } from "@/components/teacher-prospects/FindProspectsModal";
import { TeacherFilterBar } from "@/components/teacher-prospects/TeacherFilterBar";
import { TeacherTable } from "@/components/teacher-prospects/TeacherTable";
import { TeacherDetailPanel } from "@/components/teacher-prospects/TeacherDetailPanel";
import { BulkActionBar } from "@/components/teacher-prospects/BulkActionBar";
import { PageHeader } from "@/components/PageHeader";
import { useTeacherProspectsStore } from "@/stores/teacherProspectsStore";

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
  const csv = [headers.join(","), ...rows.map((p) => [p.name, p.school, p.city, p.state, p.email, p.phone, p.linkedin, p.fitScore, p.tag, p.enrichmentStatus, p.gradeLevel, p.yearsExperience, p.hasSummerCampExp ? "Yes" : "No"].map(escape).join(","))].join("\n");
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

const MetricCard = ({ title, value, delta, icon, tone = "blue", action }: { title: string; value: string | number; delta: string; icon: React.ReactNode; tone?: "blue" | "gold" | "green" | "cyan"; action?: React.ReactNode }) => {
  const tones = { blue: "bg-[#eef4ff] text-[#174be8]", gold: "bg-[#fff4df] text-[#f59e0b]", green: "bg-[#e6f7ef] text-[#0ea66e]", cyan: "bg-[#e6f9ff] text-[#0891b2]" };
  return (
    <div className="rounded-xl border border-[#e7edf5] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-xs font-bold text-[#34445f]">{title}</div>
            {action}
          </div>
          <div className="mt-0.5 text-xl font-black leading-none text-[#07142f]">{value}</div>
          <div className="mt-1 text-[10.5px] font-semibold text-[#0ea66e]">↑ {delta}</div>
        </div>
      </div>
    </div>
  );
};

const SourcingInsights = () => {
  const channels = [
    { label: "LinkedIn", count: "145 prospects", pct: 41, color: "#174be8", icon: <Linkedin size={13} /> },
    { label: "Referrals", count: "85 prospects", pct: 24, color: "#7c3aed", icon: <UserPlus size={13} /> },
    { label: "School Sites", count: "60 prospects", pct: 17, color: "#0891b2", icon: <School size={13} /> },
    { label: "Facebook Groups", count: "35 prospects", pct: 10, color: "#1877f2", icon: <Users size={13} /> },
    { label: "Others", count: "29 prospects", pct: 8, color: "#8794ab", icon: <Globe2 size={13} /> },
  ];
  return (
    <aside className="rounded-xl border border-[#e7edf5] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <div className="mb-3 flex items-center justify-between"><h3 className="text-base font-black text-[#07142f]">Sourcing Insights</h3><button className="text-xs font-bold text-[#174be8]">View All</button></div>
      <div className="mb-4"><div className="mb-2 text-xs font-bold text-[#34445f]">Top Sourcing Channels</div><div className="space-y-3">
        {channels.map((c) => <div key={c.label}><div className="mb-1 flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#eef4ff]" style={{ color: c.color }}>{c.icon}</div><div className="min-w-0"><div className="truncate text-xs font-bold text-[#07142f]">{c.label}</div><div className="text-[10px] text-[#8794ab]">{c.count}</div></div></div><div className="text-xs font-bold text-[#07142f]">{c.pct}%</div></div><div className="ml-8 h-1.5 rounded-full bg-[#edf2f8]"><div className="h-full rounded-full" style={{ width: `${Math.min(100, c.pct * 2)}%`, backgroundColor: c.color }} /></div></div>)}
      </div></div>
      <div className="mb-4"><div className="mb-2 text-xs font-bold text-[#34445f]">Quick Stats</div><div className="grid grid-cols-2 gap-2 text-xs"><div><div className="text-[#66728a]">Avg. Fit Score</div><div className="font-black text-[#0ea66e]">82</div></div><div><div className="text-[#66728a]">Avg. Experience</div><div className="font-black text-[#07142f]">6.2 yrs</div></div><div><div className="text-[#66728a]">Cities Covered</div><div className="font-black text-[#07142f]">28</div></div><div><div className="text-[#66728a]">Response Rate</div><div className="font-black text-[#0ea66e]">36%</div></div></div></div>
      <div className="rounded-xl border border-[#e7edf5] bg-white p-3"><div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef4ff] text-[#174be8]"><Sparkles size={15} /></div><div className="text-sm font-black text-[#07142f]">Expand your reach</div><p className="mt-1 text-xs leading-5 text-[#66728a]">Add more sourcing channels to discover more high-fit teacher prospects.</p><button className="mt-2 text-xs font-bold text-[#174be8]">Manage Channels →</button></div>
    </aside>
  );
};

const TeacherProspects = () => {
  const navigate = useNavigate();
  const [prospects, setProspects] = useState<TeacherProspect[]>([]);
  const [loadingProspects, setLoadingProspects] = useState(true);

  const loadProspects = async () => {
    setLoadingProspects(true);
    const { data, error } = await supabase
      .from("teacher_prospects")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) {
      toast.error(`Failed to load prospects: ${error.message}`);
      setProspects([]);
    } else {
      setProspects((data ?? []).map((r) => mapRow(r as DbRow)));
    }
    setLoadingProspects(false);
  };

  useEffect(() => { loadProspects(); }, []);
  const [findOpen, setFindOpen] = useState(false);
  const [active, setActive] = useState<TeacherProspect | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [promotedIds, setPromotedIds] = useState<Set<number>>(new Set());
  const [promotingId, setPromotingId] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCity = searchParams.get("city") ?? "Frisco";
  const search = useTeacherProspectsStore((s) => s.search);
  const setSearch = useTeacherProspectsStore((s) => s.setSearch);
  const cityFilter = useTeacherProspectsStore((s) => s.cityFilter);
  const setCityFilterRaw = useTeacherProspectsStore((s) => s.setCityFilter);
  const tagFilter = useTeacherProspectsStore((s) => s.tagFilter);
  const setTagFilter = useTeacherProspectsStore((s) => s.setTagFilter);
  const gradeFilter = useTeacherProspectsStore((s) => s.gradeFilter);
  const setGradeFilter = useTeacherProspectsStore((s) => s.setGradeFilter);
  const enrichmentFilter = useTeacherProspectsStore((s) => s.enrichmentFilter);
  const setEnrichmentFilter = useTeacherProspectsStore((s) => s.setEnrichmentFilter);
  const campOnly = useTeacherProspectsStore((s) => s.campOnly);
  const setCampOnly = useTeacherProspectsStore((s) => s.setCampOnly);
  const setCityFilter = setCityFilterRaw;
  // Apply URL ?city= override on first mount only
  useEffect(() => { if (searchParams.get("city")) setCityFilterRaw(initialCity); /* eslint-disable-next-line */ }, []);

  useEffect(() => { const city = searchParams.get("city"); if (city) setCityFilter(city); const prospectId = searchParams.get("prospect"); if (prospectId) { const found = prospects.find((p) => p.id === Number(prospectId)); if (found) setActive(found); searchParams.delete("prospect"); setSearchParams(searchParams, { replace: true }); } }, [searchParams, prospects, setSearchParams]);
  const cities = useMemo(() => Array.from(new Set([...prospects.map((p) => p.city), ...sampleCities.map((c) => c.city)])).sort(), [prospects]);
  const selectedMarket = useMemo(() => { const urlCity = searchParams.get("city"); const urlState = searchParams.get("state"); const marketCity = cityFilter !== "All" ? cityFilter : urlCity ?? "Frisco"; if (!marketCity) return null; return sampleCities.find((c) => { const cityMatch = c.city.toLowerCase() === marketCity.toLowerCase(); if (!urlState) return cityMatch; return cityMatch && stateAbbr(c.state) === stateAbbr(urlState); }) ?? null; }, [cityFilter, searchParams]);
  const marketProspects = useMemo(() => selectedMarket ? prospects.filter((p) => p.city.toLowerCase() === selectedMarket.city.toLowerCase()) : prospects, [prospects, selectedMarket]);
  const filtered = useMemo(() => prospects.filter(p => { if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.school.toLowerCase().includes(search.toLowerCase())) return false; if (cityFilter !== "All" && p.city !== cityFilter) return false; if (tagFilter !== "All" && p.tag !== tagFilter) return false; if (gradeFilter !== "All" && p.gradeLevel !== gradeFilter) return false; if (enrichmentFilter !== "All" && p.enrichmentStatus !== enrichmentFilter) return false; if (campOnly && !p.hasSummerCampExp) return false; return true; }), [prospects, search, cityFilter, tagFilter, gradeFilter, enrichmentFilter, campOnly]);

  const handleResults = async (cityId: number) => { const city = sampleCities.find(c => c.id === cityId); if (!city) return; setCityFilter(city.city); await loadProspects(); };
  const [searchingMarket, setSearchingMarket] = useState(false);
  const enrichSchools = async (schools: SchoolSearchResult[], city: string, stateCode: string, toastId: string | number) => {
    let done = 0;
    let totalInserted = 0;
    let totalUpdated = 0;
    const concurrency = 5;
    let cursor = 0;

    toast.loading(`Found ${schools.length} schools → enriching staff (0/${schools.length})…`, { id: toastId });

    const runOne = async (school: SchoolSearchResult) => {
      try {
        const { data, error } = await supabase.functions.invoke("enrich-school-staff", {
          body: {
            school_website: school.website,
            school_name: school.school_name,
            district: school.district,
            city,
            state: stateCode,
            apify_run_id: school.apify_run_id,
          },
        });
        if (!error && data && !data.error) {
          totalInserted += data.inserted ?? 0;
          totalUpdated += data.updated ?? 0;
        }
      } finally {
        done++;
        toast.loading(`Enriching staff (${done}/${schools.length})…`, { id: toastId });
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, schools.length) }, async () => {
      while (cursor < schools.length) {
        const index = cursor++;
        await runOne(schools[index]);
      }
    });

    await Promise.all(workers);
    return { totalInserted, totalUpdated };
  };
  const runMarketSearch = async () => {
    if (!selectedMarket || searchingMarket) return;
    setSearchingMarket(true);
    const t = toast.loading(`Searching schools in ${selectedMarket.city}, ${stateAbbr(selectedMarket.state)}…`);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-teacher-prospects", {
        body: { city: selectedMarket.city, state: stateAbbr(selectedMarket.state), limit: 100 },
      });
      if (error || data?.error) {
        toast.error(`Search failed: ${error?.message ?? data?.error}`, { id: t });
      } else {
        const schools: SchoolSearchResult[] = data?.schools ?? [];
        if (schools.length === 0) {
          const total = (data?.inserted ?? 0) + (data?.updated ?? 0);
          toast.success(`Found ${total} schools in ${selectedMarket.city}`, { id: t, description: data?.note });
          await loadProspects();
          return;
        }

        const { totalInserted, totalUpdated } = await enrichSchools(
          schools,
          selectedMarket.city,
          stateAbbr(selectedMarket.state),
          t,
        );

        toast.success(
          `${totalInserted + totalUpdated} teachers across ${schools.length} schools in ${selectedMarket.city}, ${stateAbbr(selectedMarket.state)}`,
          { id: t },
        );
        await loadProspects();
      }
    } catch (e) {
      toast.error(`Search failed: ${(e as Error).message}`, { id: t });
    } finally {
      setSearchingMarket(false);
    }
  };
  const handleRunMarketSearch = () => { if (selectedMarket) runMarketSearch(); else setFindOpen(true); };
  const handleChangeMarket = () => setFindOpen(true);
  const handleExport = () => { const rows = filtered.length > 0 ? filtered : marketProspects; if (rows.length === 0) { toast.info("No prospects available to export yet. Run Prospect Search first."); return; } downloadCsv(rows); toast.success(`Exported ${rows.length} teacher prospects to CSV.`); };
  const toggleSelect = (id: number) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => { const visibleIds = filtered.map(p => p.id); const allSelected = visibleIds.every(id => selected.includes(id)); setSelected(allSelected ? selected.filter(id => !visibleIds.includes(id)) : Array.from(new Set([...selected, ...visibleIds]))); };

  const handlePromote = async (p: TeacherProspect) => {
    if (promotedIds.has(p.id) || promotingId === p.id) return;
    setPromotingId(p.id);
    setPromotedIds((prev) => new Set(prev).add(p.id));
    setSelected((prev) => prev.filter((id) => id !== p.id));
    setPromotingId(null);
    toast.success("Added to Email Outreach", {
      description: `${p.name} is queued for a SmartLead outreach campaign.`,
      action: { label: "View Outreach", onClick: () => navigate("/email-outreach") }
    });
  };
  const handleMarkNotFit = (p: TeacherProspect) => { setProspects(prev => prev.map(x => x.id === p.id ? { ...x, tag: "Not a Fit" } : x)); toast.info(`${p.name} marked as Not a Fit`); setActive(null); };
  const handleUpdate = (p: TeacherProspect) => setProspects(prev => prev.map(x => x.id === p.id ? p : x));
  const enrichedCount = marketProspects.filter((p) => p.enrichmentStatus === "Enriched").length;
  const highFitCount = marketProspects.filter((p) => p.fitScore >= 85 || p.tag === "High Potential").length;
  const clusterPotential = selectedMarket ? Math.max(1, Math.min(5, Math.round(selectedMarket.population / 65000))) : null;
  const marketStats = [[selectedMarket?.elementarySchools ?? 0,"Schools Found",<School size={15} />],[selectedMarket ? Math.max(marketProspects.length, selectedMarket.elementarySchools * 12) : 0,"Teacher Pool",<Users size={15} />],[enrichedCount,"Enriched Contacts",<Sparkles size={15} />],[highFitCount,"High-Fit Teachers",<TrendingUp size={15} />],[`${clusterPotential}-${Math.min(5,(clusterPotential??1)+1)}`,"Cluster Potential",<BarChart3 size={15} />]];

  return (
    <div className="-mx-3 -my-3 min-h-screen bg-white px-3 py-3 md:-mx-5 md:px-5 lg:-mx-6 lg:px-6">
      <div className="mx-auto w-full max-w-[1360px]">
        <PageHeader title={selectedMarket ? `${selectedMarket.city}, ${stateAbbr(selectedMarket.state)} Teacher Search` : "Teacher Search"} subtitle={selectedMarket ? "Discover, evaluate, and send high-potential teacher-operators into outreach for this selected market." : "Discover and evaluate potential franchisee candidates from the teaching community."} hideJourneyBar searchPlaceholder="Search teacher prospects, schools, cities, or specialization..." action={<div className="flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" onClick={handleExport} className="h-9 rounded-lg border-[#dbe4f2] bg-white px-4 text-[#174be8] shadow-none hover:bg-[#f4f7ff]"><Download size={14} /> Export CSV</Button><Button size="sm" onClick={handleRunMarketSearch} className="h-9 rounded-lg bg-[#174be8] px-4 text-white shadow-none hover:bg-[#123fc5]"><Search size={14} /> Find Prospects</Button></div>} />
        {selectedMarket && <section className="mb-3 rounded-xl border border-[#e7edf5] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)]"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="mb-1 text-xs font-black uppercase tracking-wide text-[#174be8]">Market Context</div><div className="mb-1 flex flex-wrap items-center gap-2"><h2 className="text-lg font-black text-[#07142f]">Finding teacher-operators for {selectedMarket.city}, {stateAbbr(selectedMarket.state)}</h2><span className="rounded-full bg-[#e6f7ef] px-2.5 py-1 text-xs font-bold text-[#0a8f5a]">Tier {selectedMarket.tier}</span></div><p className="text-sm text-[#526078]">From City Search · Market Score <strong className="text-[#07142f]">{selectedMarket.compositeScore}</strong> · Population {selectedMarket.population.toLocaleString()} · {selectedMarket.elementarySchools} elementary schools</p></div><div className="flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" className="h-8 rounded-lg border-[#dbe4f2] bg-white px-3 text-[#174be8] shadow-none hover:bg-[#f4f7ff]" onClick={handleChangeMarket}>Change Market</Button><Button size="sm" variant="outline" disabled={searchingMarket} className="h-8 rounded-lg border-[#dbe4f2] bg-white px-3 text-[#174be8] shadow-none hover:bg-[#f4f7ff]" onClick={runMarketSearch}><RefreshCw size={14} className={searchingMarket ? "animate-spin" : ""} /> {searchingMarket ? "Searching… (~2 min)" : "Run Prospect Search"}</Button></div></div><div className="mt-4 grid rounded-xl border border-[#edf2f8] bg-white sm:grid-cols-2 lg:grid-cols-5">{marketStats.map(([v,l,i],idx)=><div key={String(l)} className={`flex items-center gap-3 p-3 ${idx>0?"border-t border-[#edf2f8] sm:border-t-0 sm:border-l":""}`}><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${idx===4?"bg-[#e6f7ef] text-[#0a8f5a]":"bg-[#eaf0ff] text-[#174be8]"}`}>{i as React.ReactNode}</div><div><div className="text-xl font-black leading-none text-[#07142f]">{v as React.ReactNode}</div><div className="mt-1 text-xs font-medium text-[#66728a]">{l as React.ReactNode}</div></div></div>)}</div></section>}
        <div className="mb-3 grid gap-3 lg:grid-cols-4"><MetricCard title="Total Prospects" value="354" delta="25% vs last period" icon={<Users size={18} />} tone="cyan" /><MetricCard title="Shortlisted" value="86" delta="18% vs last period" icon={<Star size={18} />} tone="gold" /><MetricCard title="Contacted This Week" value="42" delta="31% vs last period" icon={<Mail size={18} />} tone="blue" /><MetricCard title="In Outreach" value={promotedIds.size || 23} delta="21% vs last period" icon={<ArrowRight size={18} />} tone="green" action={<button onClick={() => navigate("/email-outreach")} className="text-[11px] font-bold text-[#174be8]">View All</button>} /></div>
        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_320px]"><div className="min-w-0 space-y-3"><TeacherFilterBar cities={cities} cityFilter={cityFilter} setCityFilter={setCityFilter} tagFilter={tagFilter} setTagFilter={setTagFilter} gradeFilter={gradeFilter} setGradeFilter={setGradeFilter} campOnly={campOnly} setCampOnly={setCampOnly} enrichmentFilter={enrichmentFilter} setEnrichmentFilter={setEnrichmentFilter} search={search} setSearch={setSearch} /><BulkActionBar count={selected.length} onExport={() => toast.success(`Exported ${selected.length} prospects to CSV`)} onAddTag={() => toast.info("Add tag dialog (placeholder)")} onPromote={() => { selected.forEach((id) => { const p = prospects.find((x) => x.id === id); if (p) handlePromote(p); }); }} onClear={() => setSelected([])} /><TeacherTable prospects={filtered} selected={selected} onToggleSelect={toggleSelect} onToggleAll={toggleAll} onRowClick={(p) => { setActive(p); setSelected([]); }} onPromote={handlePromote} promotedIds={promotedIds} promotingId={promotingId} /></div><SourcingInsights /></div>
        <FindProspectsModal open={findOpen} onOpenChange={setFindOpen} onResults={handleResults} />
        <TeacherDetailPanel prospect={active} onClose={() => setActive(null)} onUpdate={handleUpdate} onPromote={handlePromote} onMarkNotFit={handleMarkNotFit} isPromoted={active ? promotedIds.has(active.id) : false} isPromoting={active ? promotingId === active.id : false} />
      </div>
    </div>
  );
};

export default TeacherProspects;
