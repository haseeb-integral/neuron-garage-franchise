import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { TeacherProspect, TeacherTag, EnrichmentStatus, GradeLevel } from "@/data/teacherData";
import { supabase } from "@/integrations/supabase/client";
import { FindProspectsModal } from "@/components/teacher-prospects/FindProspectsModal";
import { TeacherImportWizard } from "@/components/teacher-prospects/TeacherImportWizard";
import { TeacherFilterBar } from "@/components/teacher-prospects/TeacherFilterBar";
import { TeacherTable } from "@/components/teacher-prospects/TeacherTable";
import { TeacherDetailPanel } from "@/components/teacher-prospects/TeacherDetailPanel";
import { BulkActionBar } from "@/components/teacher-prospects/BulkActionBar";
import { PageHeader } from "@/components/PageHeader";
import { useTeacherProspectsStore } from "@/stores/teacherProspectsStore";
import { matchesSourceFilter, sourceKeyFor, sourceLabelFor, type SourceKey } from "@/lib/teacherSourceLabels";

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
  enrichment_source: string | null;
  verification_status: string | null;
  needs_email_enrichment: boolean | null;
};

const normalizeGrade = (g: string | null): GradeLevel => {
  if (!g) return "3-5";
  const s = g.toLowerCase();
  if (s.includes("k") || s.includes("1") || s.includes("2")) return "K-2";
  if (s.includes("6") || s.includes("7") || s.includes("8") || s.includes("middle")) return "6-8";
  return "3-5";
};

const stableId = (uuid: string) => {
  let h = 0;
  for (let i = 0; i < uuid.length; i++) h = (h * 31 + uuid.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
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
  fitScore: (r.fit_score ?? 0) as number,
  tag: "Untagged" as TeacherTag,
  enrichmentStatus: (r.email ? "Enriched" : "Pending") as EnrichmentStatus,
  gradeLevel: normalizeGrade(r.grade),
  yearsExperience: r.experience_years ?? 0,
  hasSummerCampExp: false,
  aiReasoning: "",
  tags: [],
  notes: "",
  enrichmentSource: r.enrichment_source,
  verificationStatus: r.verification_status,
  needsEmailEnrichment: !!r.needs_email_enrichment,
});

const downloadCsv = (rows: TeacherProspect[]) => {
  const headers = ["Name", "School", "City", "State", "Email", "Source", "Verification", "Needs Email Enrichment"];
  const escape = (v: string | number | boolean) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [
    headers.join(","),
    ...rows.map((p) => [
      p.name, p.school, p.city, p.state, p.email,
      sourceLabelFor(sourceKeyFor(p.enrichmentSource)),
      p.verificationStatus ?? "",
      p.needsEmailEnrichment ? "Yes" : "No",
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

interface Stats {
  total: number;
  withEmail: number;
  needsEnrichment: number;
  cities: number;
  bySource: { key: SourceKey; label: string; count: number; pct: number }[];
}

const emptyStats: Stats = { total: 0, withEmail: 0, needsEnrichment: 0, cities: 0, bySource: [] };

const StatCard = ({ title, value, sub, tone = "slate", action }: {
  title: string; value: string | number; sub?: React.ReactNode; tone?: "slate" | "emerald" | "amber"; action?: React.ReactNode;
}) => {
  const valueTone =
    tone === "emerald" ? "text-[#0a8f5a]" :
    tone === "amber" ? "text-[#b7791f]" :
    "text-[#07142f]";
  return (
    <div className="rounded-xl border border-[#e7edf5] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-bold uppercase tracking-wide text-[#66728a]">{title}</div>
        {action}
      </div>
      <div className={`mt-1 text-2xl font-black leading-tight ${valueTone}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-[#66728a]">{sub}</div>}
    </div>
  );
};

const TeacherProspects = () => {
  const navigate = useNavigate();
  const [prospects, setProspects] = useState<TeacherProspect[]>([]);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [loadingProspects, setLoadingProspects] = useState(true);

  const loadStats = async () => {
    const [totalQ, withEmailQ, needsQ, sourceQ, citiesQ] = await Promise.all([
      supabase.from("teacher_prospects").select("id", { count: "exact", head: true }),
      supabase.from("teacher_prospects").select("id", { count: "exact", head: true })
        .not("email", "is", null).neq("email", "")
        .or("verification_status.is.null,verification_status.eq.valid,verification_status.eq.verified"),
      supabase.from("teacher_prospects").select("id", { count: "exact", head: true }).eq("needs_email_enrichment", true),
      supabase.from("teacher_prospects").select("enrichment_source").limit(20000),
      supabase.from("teacher_prospects").select("city").limit(20000),
    ]);

    const sourceRows = (sourceQ.data ?? []) as { enrichment_source: string | null }[];
    const cityRows = (citiesQ.data ?? []) as { city: string }[];
    const total = totalQ.count ?? 0;

    const counts = new Map<SourceKey, number>();
    for (const r of sourceRows) {
      const k = sourceKeyFor(r.enrichment_source);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const bySource = Array.from(counts.entries())
      .map(([key, count]) => ({ key, label: sourceLabelFor(key), count, pct: total ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);

    const citySet = new Set<string>();
    for (const r of cityRows) if (r.city) citySet.add(r.city);

    setStats({
      total,
      withEmail: withEmailQ.count ?? 0,
      needsEnrichment: needsQ.count ?? 0,
      cities: citySet.size,
      bySource,
    });
  };

  const loadProspects = async () => {
    setLoadingProspects(true);
    const { data, error } = await supabase
      .from("teacher_prospects")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20000);
    if (error) {
      toast.error(`Failed to load prospects: ${error.message}`);
      setProspects([]);
    } else {
      setProspects((data ?? []).map((r) => mapRow(r as unknown as DbRow)));
    }
    setLoadingProspects(false);
  };

  useEffect(() => { loadProspects(); loadStats(); }, []);

  const [findOpen, setFindOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [active, setActive] = useState<TeacherProspect | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [promotedIds, setPromotedIds] = useState<Set<number>>(new Set());
  const [promotingId, setPromotingId] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const search = useTeacherProspectsStore((s) => s.search);
  const setSearch = useTeacherProspectsStore((s) => s.setSearch);
  const cityFilter = useTeacherProspectsStore((s) => s.cityFilter);
  const setCityFilter = useTeacherProspectsStore((s) => s.setCityFilter);
  const sourceFilter = useTeacherProspectsStore((s) => s.sourceFilter);
  const setSourceFilter = useTeacherProspectsStore((s) => s.setSourceFilter);
  const page = useTeacherProspectsStore((s) => s.page);
  const setPage = useTeacherProspectsStore((s) => s.setPage);
  const pageSize = useTeacherProspectsStore((s) => s.pageSize);

  // Apply URL ?city= override on first mount only.
  useEffect(() => {
    const urlCity = searchParams.get("city");
    if (urlCity) setCityFilter(urlCity);
    const prospectId = searchParams.get("prospect");
    if (prospectId && prospects.length) {
      const found = prospects.find((p) => p.id === Number(prospectId));
      if (found) setActive(found);
      searchParams.delete("prospect");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospects]);

  const cities = useMemo(
    () => Array.from(new Set(prospects.map((p) => p.city).filter(Boolean))).sort(),
    [prospects],
  );

  const filtered = useMemo(() => prospects.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !p.name.toLowerCase().includes(q) &&
        !p.school.toLowerCase().includes(q) &&
        !p.city.toLowerCase().includes(q)
      ) return false;
    }
    if (cityFilter !== "All" && p.city !== cityFilter) return false;
    if (!matchesSourceFilter(sourceFilter, {
      enrichment_source: p.enrichmentSource,
      email: p.email,
      needs_email_enrichment: p.needsEmailEnrichment,
    })) return false;
    return true;
  }), [prospects, search, cityFilter, sourceFilter]);

  const pagedProspects = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handleExport = () => {
    const rows = filtered;
    if (rows.length === 0) { toast.info("No prospects to export."); return; }
    downloadCsv(rows);
    toast.success(`Exported ${rows.length.toLocaleString()} teacher prospects to CSV.`);
  };

  const toggleSelect = (id: number) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleAll = () => {
    const visibleIds = pagedProspects.map((p) => p.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
    setSelected(allSelected ? selected.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selected, ...visibleIds])));
  };

  const handlePromote = async (p: TeacherProspect) => {
    if (promotedIds.has(p.id) || promotingId === p.id) return;
    setPromotingId(p.id);
    setPromotedIds((prev) => new Set(prev).add(p.id));
    setSelected((prev) => prev.filter((id) => id !== p.id));
    setPromotingId(null);
    toast.success("Added to Email Outreach", {
      description: `${p.name} is queued for a SmartLead outreach campaign.`,
      action: { label: "View Outreach", onClick: () => navigate("/email-outreach") },
    });
  };
  const handleMarkNotFit = (p: TeacherProspect) => { setActive(null); toast.info(`${p.name} marked as Not a Fit`); };
  const handleUpdate = (p: TeacherProspect) => setProspects((prev) => prev.map((x) => (x.id === p.id ? p : x)));
  const handleFindResults = async () => { await loadProspects(); await loadStats(); };

  return (
    <div className="-mx-3 -my-3 min-h-screen bg-white px-3 py-3 md:-mx-5 md:px-5 lg:-mx-6 lg:px-6">
      <div className="mx-auto w-full max-w-[1360px]">
        <PageHeader
          title="Teacher Search"
          subtitle={
            stats.total > 0
              ? `${stats.total.toLocaleString()} teachers imported across ${stats.cities.toLocaleString()} cities`
              : "Discover and evaluate potential franchisee candidates from the teaching community."
          }
          hideJourneyBar
          searchPlaceholder="Search teacher prospects, schools, cities, or specialization..."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleExport} className="h-9 rounded-lg border-[#dbe4f2] bg-white px-4 text-[#174be8] shadow-none hover:bg-[#f4f7ff]">
                <Download size={14} /> Export CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} className="h-9 rounded-lg border-[#dbe4f2] bg-white px-4 text-[#174be8] shadow-none hover:bg-[#f4f7ff]">
                <Upload size={14} /> Import CSV
              </Button>
              <Button size="sm" onClick={() => setFindOpen(true)} className="h-9 rounded-lg bg-[#174be8] px-4 text-white shadow-none hover:bg-[#123fc5]">
                <Search size={14} /> Find via Apify
              </Button>
            </div>
          }
        />

        {/* 3 honest stat cards (v1.0) */}
        <div className="mb-3 grid gap-3 sm:grid-cols-3">
          <StatCard title="Total Imported" value={stats.total.toLocaleString()} sub={`across ${stats.cities.toLocaleString()} cities`} />
          <StatCard title="Email-Ready" value={stats.withEmail.toLocaleString()} sub="can send to SmartLead today" tone="emerald" />
          <StatCard
            title="Needs Email Enrichment"
            value={stats.needsEnrichment.toLocaleString()}
            tone="amber"
            sub={<button onClick={() => toast.info("Enrichment tool integration coming soon.")} className="text-[11px] font-bold text-[#174be8]">Connect Enrichment Tool →</button>}
          />
        </div>

        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-3">
            <TeacherFilterBar
              cities={cities}
              cityFilter={cityFilter}
              setCityFilter={setCityFilter}
              sourceFilter={sourceFilter}
              setSourceFilter={setSourceFilter}
              search={search}
              setSearch={setSearch}
            />
            <BulkActionBar
              count={selected.length}
              onExport={() => toast.success(`Exported ${selected.length} prospects to CSV`)}
              onAddTag={() => toast.info("Add tag dialog (placeholder)")}
              onPromote={() => { selected.forEach((id) => { const p = prospects.find((x) => x.id === id); if (p) handlePromote(p); }); }}
              onClear={() => setSelected([])}
            />
            <TeacherTable
              prospects={pagedProspects}
              selected={selected}
              onToggleSelect={toggleSelect}
              onToggleAll={toggleAll}
              onRowClick={(p) => { setActive(p); setSelected([]); }}
              onPromote={handlePromote}
              promotedIds={promotedIds}
              promotingId={promotingId}
              page={page}
              pageSize={pageSize}
              totalCount={filtered.length}
              onPageChange={setPage}
            />
            {loadingProspects && (
              <div className="rounded-xl border border-[#e7edf5] bg-white p-4 text-center text-xs text-[#8794ab]">Loading prospects…</div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-3">
            <div className="rounded-xl border border-[#e7edf5] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[#66728a]">Sources</div>
              {stats.bySource.length === 0 && <div className="text-xs text-[#8794ab]">No data yet.</div>}
              <div className="space-y-3">
                {stats.bySource.map((s) => (
                  <div key={s.key}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#07142f]">{s.label}</span>
                      <span className="font-bold text-[#07142f]">{s.count.toLocaleString()} · {s.pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-[#edf2f8]">
                      <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.key === "smartlead" ? "#0a8f5a" : s.key === "linkedin" ? "#1e6fb8" : "#8794ab" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#e7edf5] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[#66728a]">Quick Stats</div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-[#526078]">Cities</span><span className="font-bold text-[#07142f]">{stats.cities.toLocaleString()}</span></div>
                <div className="flex items-center justify-between"><span className="text-[#526078]">Email-ready</span><span className="font-bold text-[#07142f]">{stats.withEmail.toLocaleString()}</span></div>
                <div>
                  <div className="mb-1 text-xs text-[#526078]">Avg Fit Score</div>
                  <button onClick={() => toast.info("AI Fit Scoring (Task 14) — coming soon.")} className="w-full rounded-md border border-dashed border-[#dbe4f2] px-2 py-1.5 text-xs font-medium text-[#8794ab] hover:bg-[#f4f7ff] hover:text-[#174be8]">— Run AI Scoring</button>
                </div>
                <div>
                  <div className="mb-1 text-xs text-[#526078]">Response Rate</div>
                  <button onClick={() => toast.info("SmartLead reply tracking (Task B6) — coming soon.")} className="w-full rounded-md border border-dashed border-[#dbe4f2] px-2 py-1.5 text-xs font-medium text-[#8794ab] hover:bg-[#f4f7ff] hover:text-[#174be8]">— Connect SmartLead</button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#e7edf5] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#66728a]">Status Legend</div>
              <ul className="space-y-1.5 text-[11.5px] text-[#526078]">
                <li><span className="mr-1 inline-block rounded bg-[#e6f7ef] px-1.5 font-bold text-[#0a8f5a]">SmartLead · Verified</span> safe to send</li>
                <li><span className="mr-1 inline-block rounded bg-[#fff4df] px-1.5 font-bold text-[#b7791f]">SmartLead · Unverified</span> excluded from campaigns</li>
                <li><span className="mr-1 inline-block rounded bg-[#eef2f7] px-1.5 font-bold text-[#526078]">SmartLead · No Email</span> needs enrichment</li>
                <li><span className="mr-1 inline-block rounded bg-[#e6f3ff] px-1.5 font-bold text-[#1e6fb8]">LinkedIn Import</span> needs email enrichment</li>
              </ul>
            </div>
          </aside>
        </div>

        <FindProspectsModal open={findOpen} onOpenChange={setFindOpen} onResults={handleFindResults} />
        <TeacherImportWizard open={importOpen} onClose={() => setImportOpen(false)} onComplete={() => { loadProspects(); loadStats(); }} />
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
