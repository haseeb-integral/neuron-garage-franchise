import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { AddToCampaignModal } from "@/components/teacher-prospects/AddToCampaignModal";
import { PageHeader } from "@/components/PageHeader";
import { useTeacherProspectsStore } from "@/stores/teacherProspectsStore";
import { sourceKeyFor, sourceLabelFor, type SourceKey } from "@/lib/teacherSourceLabels";

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
  linkedin_url: string | null;
  school_nces_id: string | null;
  raw: Record<string, unknown> | null;
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

const pickStr = (raw: Record<string, unknown> | null, key: string): string | null => {
  if (!raw) return null;
  const v = raw[key];
  return typeof v === "string" && v.trim() ? v : null;
};

const mapRow = (r: DbRow): TeacherProspect => ({
  id: stableId(r.id),
  uuid: r.id,
  cityId: 0,
  name: r.name ?? "(Unknown)",
  school: r.school ?? pickStr(r.raw, "companyName") ?? "—",
  district: r.district ?? null,
  gradeRaw: r.grade ?? null,
  experienceYearsRaw: r.experience_years ?? null,
  title: pickStr(r.raw, "title"),
  schoolUrl: pickStr(r.raw, "companyWebsite"),
  linkedinUrl: r.linkedin_url ?? pickStr(r.raw, "linkedin"),
  schoolNcesId: r.school_nces_id,
  status: (r.status as TeacherProspect["status"]) ?? "new",
  city: r.city,
  state: r.state,
  email: r.email ?? "",
  phone: "",
  linkedin: r.linkedin_url ?? "",
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

const CSV_HEADERS = ["Name", "Title", "School", "School URL", "District", "Grade", "City", "State", "Email", "LinkedIn", "Source", "Verification", "Needs Email Enrichment", "Tags", "Notes"];

const rowToCsvCells = (p: TeacherProspect) => [
  p.name, p.title ?? "", p.school, p.schoolUrl ?? "", p.district ?? "", p.gradeRaw ?? "",
  p.city, p.state, p.email, p.linkedinUrl ?? "",
  sourceLabelFor(sourceKeyFor(p.enrichmentSource)),
  p.verificationStatus ?? "",
  p.needsEmailEnrichment ? "Yes" : "No",
  (p.tags ?? []).join("; "),
  p.notes ?? "",
];

const downloadCsv = (rows: TeacherProspect[], filenameSuffix = "") => {
  const escape = (v: string | number | boolean | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    CSV_HEADERS.join(","),
    ...rows.map((p) => rowToCsvCells(p).map(escape).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const date = new Date().toISOString().slice(0, 10);
  link.download = `teacher-prospects-${date}${filenameSuffix ? `-${filenameSuffix}` : ""}.csv`;
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

// Do NOT introduce an `emptyStats` zero-default — caught May 20, 2026.
// `stats === null` means "still loading"; cards must render a skeleton, not "0".
// A real zero only appears after the RPC resolves with `total: 0`.

const StatCard = ({ title, value, sub, tone = "slate", action, loading, error, onRetry }: {
  title: string;
  value: string | number;
  sub?: React.ReactNode;
  tone?: "slate" | "emerald" | "amber";
  action?: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
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
      {loading ? (
        <div className="mt-1 h-7 w-20 animate-pulse rounded-md bg-[#edf2f8]" aria-label={`${title} loading`} />
      ) : error ? (
        <div className={`mt-1 text-2xl font-black leading-tight text-[#b7791f]`} title={error}>
          — <button onClick={onRetry} className="ml-2 align-middle text-[11px] font-bold text-[#174be8] hover:underline">Retry</button>
        </div>
      ) : (
        <div className={`mt-1 text-2xl font-black leading-tight ${valueTone}`}>{value}</div>
      )}
      {loading ? (
        <div className="mt-2 h-3 w-28 animate-pulse rounded bg-[#edf2f8]" />
      ) : sub ? (
        <div className="mt-1 text-xs text-[#66728a]">{sub}</div>
      ) : null}
    </div>
  );
};

const useDebounced = <T,>(value: T, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const TeacherProspects = () => {
  const navigate = useNavigate();
  const [prospects, setProspects] = useState<TeacherProspect[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [loadingProspects, setLoadingProspects] = useState(true);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const [findOpen, setFindOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [active, setActive] = useState<TeacherProspect | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [promotedUuids, setPromotedUuids] = useState<Set<string>>(new Set());
  const [promotedInfo, setPromotedInfo] = useState<Map<string, { campaign_id: string | null; state: string }>>(new Map());
  const [allPromotedIds, setAllPromotedIds] = useState<string[]>([]);
  const [campaignNames, setCampaignNames] = useState<Map<string, string>>(new Map());
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [campaignTargets, setCampaignTargets] = useState<{ uuid: string; name: string }[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

  const search = useTeacherProspectsStore((s) => s.search);
  const setSearch = useTeacherProspectsStore((s) => s.setSearch);
  const cityFilter = useTeacherProspectsStore((s) => s.cityFilter);
  const setCityFilter = useTeacherProspectsStore((s) => s.setCityFilter);
  const sourceFilter = useTeacherProspectsStore((s) => s.sourceFilter);
  const setSourceFilter = useTeacherProspectsStore((s) => s.setSourceFilter);
  const hideInOutreach = useTeacherProspectsStore((s) => s.hideInOutreach);
  const setHideInOutreach = useTeacherProspectsStore((s) => s.setHideInOutreach);
  const page = useTeacherProspectsStore((s) => s.page);
  const setPage = useTeacherProspectsStore((s) => s.setPage);
  const pageSize = useTeacherProspectsStore((s) => s.pageSize);
  const setPageSize = useTeacherProspectsStore((s) => s.setPageSize);

  const debouncedSearch = useDebounced(search, 350);

  // Load complete city list (server-side; bypasses 1k cap)
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("teacher_prospects_cities");
      if (!error && data) setCities((data as { city: string }[]).map((r) => r.city));
    })();
  }, []);

  const reqIdRef = useRef(0);

  const loadPage = useCallback(async () => {
    setLoadingProspects(true);
    const myReq = ++reqIdRef.current;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabase
      .from("teacher_prospects")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (cityFilter && cityFilter !== "All") q = q.eq("city", cityFilter);

    if (debouncedSearch?.trim()) {
      const s = debouncedSearch.trim().replace(/[%_]/g, "");
      q = q.or(`name.ilike.%${s}%,school.ilike.%${s}%,city.ilike.%${s}%,email.ilike.%${s}%`);
    }

    if (sourceFilter === "smartlead") q = q.ilike("enrichment_source", "smartlead%");
    else if (sourceFilter === "linkedin") q = q.ilike("enrichment_source", "linkedin%");
    else if (sourceFilter === "needs_email") q = q.eq("needs_email_enrichment", true);

    // "Hide already in outreach" filter — applies the global active-queue id list
    if (hideInOutreach && allPromotedIds.length > 0) {
      // Safety cap: PostgREST URLs cap around ~8KB. UUIDs are 36 chars + comma → ~37.
      // Stay well below: cap at 2000 ids. If exceeded, fall back to client-side hide below.
      if (allPromotedIds.length <= 2000) {
        q = q.not("id", "in", `(${allPromotedIds.join(",")})`);
      }
    }

    const { data, error, count } = await q.range(from, to);

    if (myReq !== reqIdRef.current) return; // stale

    if (error) {
      toast.error(`Failed to load prospects: ${error.message}`);
      setProspects([]);
      setTotalCount(0);
    } else {
      let rows = (data ?? []).map((r) => mapRow(r as unknown as DbRow));
      let total = count ?? 0;
      // Fallback client-side hide when allPromotedIds exceeds the URL safety cap
      if (hideInOutreach && allPromotedIds.length > 2000) {
        const hidden = new Set(allPromotedIds);
        rows = rows.filter((r) => !hidden.has(r.uuid));
        total = Math.max(0, total - allPromotedIds.length); // approximate
      }
      setProspects(rows);
      setTotalCount(total);
      setLoadedAt(new Date());
    }
    setLoadingProspects(false);
  }, [page, pageSize, cityFilter, debouncedSearch, sourceFilter, hideInOutreach, allPromotedIds]);

  const loadStats = useCallback(async () => {
    const myReq = reqIdRef.current;
    setStatsError(null);
    const { data, error } = await supabase.rpc("teacher_prospects_stats", {
      p_search: debouncedSearch?.trim() || null,
      p_city: cityFilter || "All",
      p_source_filter: sourceFilter,
    });
    if (myReq !== reqIdRef.current) return;
    if (error || !data) {
      setStatsError(error?.message ?? "Stats unavailable");
      return;
    }
    const s = data as {
      total: number; email_ready: number; needs_enrichment: number; cities: number;
      sources: { source: string; count: number }[];
    };
    const total = s.total ?? 0;
    const bySource = (s.sources ?? []).map((row) => {
      const key = (row.source as SourceKey) ?? "other";
      return { key, label: sourceLabelFor(key), count: row.count, pct: total ? Math.round((row.count / total) * 100) : 0 };
    });
    setStats({
      total,
      withEmail: s.email_ready ?? 0,
      needsEnrichment: s.needs_enrichment ?? 0,
      cities: s.cities ?? 0,
      bySource,
    });
  }, [debouncedSearch, cityFilter, sourceFilter]);

  // Re-fetch table page on filter/page change
  useEffect(() => { loadPage(); }, [loadPage]);
  // Re-fetch stats on filter change (not on page change — stats are filter-scoped)
  useEffect(() => { loadStats(); }, [loadStats]);

  // Auto-refetch when the tab regains focus — prevents stale zeros after long idle.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        loadStats();
        loadPage();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [loadStats, loadPage]);


  // Load campaign-state info for visible prospects (which campaign + state)
  useEffect(() => {
    const uuids = prospects.map((p) => p.uuid);
    if (uuids.length === 0) {
      setPromotedUuids(new Set());
      setPromotedInfo(new Map());
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("outreach_queue")
        .select("teacher_prospect_id, campaign_id, state, added_at")
        .in("teacher_prospect_id", uuids)
        .in("state", ["queued", "assigned", "sending", "sent", "failed"])
        .order("added_at", { ascending: false });
      if (!data) return;
      // Keep latest row per prospect (first wins because of DESC order)
      const info = new Map<string, { campaign_id: string | null; state: string }>();
      for (const r of data as { teacher_prospect_id: string; campaign_id: string | null; state: string }[]) {
        if (!info.has(r.teacher_prospect_id)) {
          info.set(r.teacher_prospect_id, { campaign_id: r.campaign_id, state: r.state });
        }
      }
      // Active (non-failed) uuids drive the "already in outreach" UX
      const activeOnly = new Set<string>();
      for (const [uuid, v] of info.entries()) {
        if (v.state !== "failed") activeOnly.add(uuid);
      }
      setPromotedUuids(activeOnly);
      setPromotedInfo(info);
    })();
  }, [prospects]);

  // Load the FULL list of active outreach prospect ids (used by Hide filter + counter)
  const refreshAllPromoted = useCallback(async () => {
    const { data } = await supabase
      .from("outreach_queue")
      .select("teacher_prospect_id")
      .in("state", ["queued", "assigned", "sending", "sent"]);
    if (data) {
      // dedupe — a prospect could appear in multiple queue rows
      const ids = Array.from(new Set((data as { teacher_prospect_id: string }[]).map((r) => r.teacher_prospect_id)));
      setAllPromotedIds(ids);
    }
  }, []);
  useEffect(() => { refreshAllPromoted(); }, [refreshAllPromoted]);

  // Load campaign id → name map (small, cached)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("campaign_cache").select("id, name");
      if (data) {
        const m = new Map<string, string>();
        for (const c of data as { id: string; name: string | null }[]) {
          if (c.name) m.set(c.id, c.name);
        }
        setCampaignNames(m);
      }
    })();
  }, []);


  // URL ?city= and ?prospect= handling
  const consumedPromptRef = useRef(false);
  useEffect(() => {
    if (consumedPromptRef.current) return;
    const urlCity = searchParams.get("city");
    if (urlCity) { setCityFilter(urlCity); consumedPromptRef.current = true; }
  }, [searchParams, setCityFilter]);

  useEffect(() => {
    const prospectId = searchParams.get("prospect");
    if (prospectId && prospects.length) {
      const found = prospects.find((p) => p.id === Number(prospectId));
      if (found) setActive(found);
      searchParams.delete("prospect");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospects]);

  // Build the same query as loadPage but without pagination — used for full-export
  const buildFilteredQuery = () => {
    let q = supabase
      .from("teacher_prospects")
      .select("*")
      .order("created_at", { ascending: false });
    if (cityFilter && cityFilter !== "All") q = q.eq("city", cityFilter);
    if (debouncedSearch?.trim()) {
      const s = debouncedSearch.trim().replace(/[%_]/g, "");
      q = q.or(`name.ilike.%${s}%,school.ilike.%${s}%,city.ilike.%${s}%,email.ilike.%${s}%`);
    }
    if (sourceFilter === "smartlead") q = q.ilike("enrichment_source", "smartlead%");
    else if (sourceFilter === "linkedin") q = q.ilike("enrichment_source", "linkedin%");
    else if (sourceFilter === "needs_email") q = q.eq("needs_email_enrichment", true);
    return q;
  };

  const handleExport = async () => {
    // If user has rows selected, header Export should export ONLY those (avoids accidental 11k dump)
    if (selected.length > 0) {
      return handleExportSelected();
    }
    const expected = (stats?.total ?? 0) || totalCount;
    if (expected === 0) { toast.info("Nothing to export with the current filters."); return; }
    const t = toast.loading(`Exporting ${expected.toLocaleString()} rows…`);
    const chunkSize = 1000;
    const all: TeacherProspect[] = [];
    let from = 0;
    try {
      // page through Supabase 1k-row cap
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await buildFilteredQuery().range(from, from + chunkSize - 1);
        if (error) throw error;
        const batch = (data ?? []).map((r) => mapRow(r as unknown as DbRow));
        all.push(...batch);
        if (batch.length < chunkSize) break;
        from += chunkSize;
        if (from > 50000) break; // safety
      }
      downloadCsv(all, "all-filtered");
      toast.success(`Exported ${all.length.toLocaleString()} rows to CSV.`, { id: t });
    } catch (e) {
      toast.error(`Export failed: ${e instanceof Error ? e.message : String(e)}`, { id: t });
    }
  };

  const handleExportSelected = async () => {
    const selectedProspects = prospects.filter((p) => selected.includes(p.id));
    if (selectedProspects.length === 0) return;
    downloadCsv(selectedProspects, "selected");
    toast.success(`Exported ${selectedProspects.length} selected ${selectedProspects.length === 1 ? "row" : "rows"} to CSV.`);
  };

  const handleBulkAddTag = async (tag: string) => {
    const selectedProspects = prospects.filter((p) => selected.includes(p.id));
    const uuids = selectedProspects.map((p) => p.uuid);
    if (uuids.length === 0) return;
    // Fetch current tags, then write merged arrays per row (postgrest can't array_append in bulk via single update)
    await Promise.all(selectedProspects.map(async (p) => {
      const next = Array.from(new Set([...(p.tags ?? []), tag]));
      await supabase.from("teacher_prospects").update({ tags: next }).eq("id", p.uuid);
    }));
    setProspects((prev) => prev.map((x) => uuids.includes(x.uuid) ? { ...x, tags: Array.from(new Set([...(x.tags ?? []), tag])) } : x));
    toast.success(`Tag "${tag}" applied to ${uuids.length} ${uuids.length === 1 ? "teacher" : "teachers"}.`);
  };



  const toggleSelect = (id: number) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleAll = () => {
    const visibleIds = prospects.map((p) => p.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
    setSelected(allSelected ? selected.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selected, ...visibleIds])));
  };

  const handlePromote = (p: TeacherProspect) => {
    setCampaignTargets([{ uuid: p.uuid, name: p.name }]);
    setCampaignModalOpen(true);
  };
  const handlePromoteBulk = () => {
    const selectedProspects = prospects.filter((p) => selected.includes(p.id));
    if (selectedProspects.length === 0) return;
    setCampaignTargets(selectedProspects.map((p) => ({ uuid: p.uuid, name: p.name })));
    setCampaignModalOpen(true);
  };
  const handleShortlist = async (p: TeacherProspect) => {
    const nextStatus = p.status === "shortlisted" ? "new" : "shortlisted";
    setProspects((prev) => prev.map((x) => (x.uuid === p.uuid ? { ...x, status: nextStatus } : x)));
    const { error } = await supabase.from("teacher_prospects").update({ status: nextStatus }).eq("id", p.uuid);
    if (error) {
      toast.error(`Couldn't update: ${error.message}`);
      loadPage();
    } else {
      toast.success(nextStatus === "shortlisted" ? `${p.name} added to shortlist` : `${p.name} removed from shortlist`);
    }
  };
  const handleMarkNotFit = async (p: TeacherProspect) => {
    setActive(null);
    setProspects((prev) => prev.map((x) => (x.uuid === p.uuid ? { ...x, status: "not_fit" } : x)));
    const { error } = await supabase.from("teacher_prospects").update({ status: "not_fit" }).eq("id", p.uuid);
    if (error) { toast.error(`Couldn't update: ${error.message}`); loadPage(); return; }
    toast.success(`${p.name} marked Not a Fit`, {
      action: { label: "Undo", onClick: async () => {
        await supabase.from("teacher_prospects").update({ status: "new" }).eq("id", p.uuid);
        loadPage();
      }},
    });
  };
  const handleEnrich = async (p: TeacherProspect) => {
    if (!p.schoolNcesId) { toast.info("School isn't linked to NCES yet — can't enrich automatically."); return; }
    toast.info(`Enrichment queued for ${p.school}…`);
    const { error } = await supabase.functions.invoke("enrich-school-staff", { body: { nces_id: p.schoolNcesId } });
    if (error) toast.error(`Enrichment failed: ${error.message}`);
    else toast.success("Enrichment complete. Reloading…", { action: { label: "Reload", onClick: () => loadPage() } });
  };
  const handleAfterAddedToCampaign = (addedUuids: string[]) => {
    setPromotedUuids((prev) => new Set([...prev, ...addedUuids]));
    setSelected([]);
    refreshAllPromoted();
    loadPage();
  };

  const handleUpdate = (p: TeacherProspect) => setProspects((prev) => prev.map((x) => (x.id === p.id ? p : x)));
  const handleFindResults = async () => { await loadPage(); await loadStats(); };

  const subtitleText = useMemo(() => {
    if (stats === null) return "Loading teachers…";
    if (stats.total > 0) {
      const when = loadedAt ? loadedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
      return `${stats.total.toLocaleString()} teachers across ${stats.cities.toLocaleString()} cities${when ? ` · live as of ${when}` : ""}`;
    }
    return "Discover and evaluate potential franchisee candidates from the teaching community.";
  }, [stats, loadedAt]);

  return (
    <div className="-mx-3 -my-3 min-h-screen bg-white px-3 py-3 md:-mx-5 md:px-5 lg:-mx-6 lg:px-6">
      <div className="mx-auto w-full max-w-[1360px]">
        <PageHeader
          title="Teacher Search"
          subtitle={subtitleText}
          hideJourneyBar
          searchPlaceholder="Search teacher prospects, schools, cities, or specialization..."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleExport} className="h-9 rounded-lg border-[#dbe4f2] bg-white px-4 text-[#174be8] shadow-none hover:bg-[#f4f7ff]">
                <Download size={14} /> {selected.length > 0 ? `Export ${selected.length} Selected` : "Export CSV"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} className="h-9 rounded-lg border-[#dbe4f2] bg-white px-4 text-[#174be8] shadow-none hover:bg-[#f4f7ff]">
                <Upload size={14} /> Import CSV
              </Button>
              {/* "Find via Apify" button hidden May 20 — see LATER.md. Modal code retained in FindProspectsModal.tsx. */}
            </div>
          }
        />

        {/* 3 honest stat cards — values come from server RPC, always reflect filter scope */}
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
              hideInOutreach={hideInOutreach}
              setHideInOutreach={setHideInOutreach}
              inOutreachCount={allPromotedIds.length}
            />
            <BulkActionBar
              count={selected.length}
              onExport={handleExportSelected}
              onAddTag={handleBulkAddTag}
              onPromote={handlePromoteBulk}
              onClear={() => setSelected([])}
            />
            <TeacherTable
              prospects={prospects}
              selected={selected}
              onToggleSelect={toggleSelect}
              onToggleAll={toggleAll}
              onRowClick={(p) => { setActive(p); setSelected([]); }}
              onPromote={handlePromote}
              onShortlist={handleShortlist}
              onEnrich={handleEnrich}
              onMarkNotFit={handleMarkNotFit}
              promotedUuids={promotedUuids}
              promotedInfo={promotedInfo}
              campaignNames={campaignNames}
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              loading={loadingProspects}
            />
          </div>

          {/* Sidebar */}
          <aside className="space-y-3">
            <div className="rounded-xl border border-[#e7edf5] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[11px] font-bold uppercase tracking-wide text-[#66728a]">Sources</div>
                <button onClick={() => { loadPage(); loadStats(); }} className="text-[10.5px] font-bold text-[#174be8] hover:underline">Refresh</button>
              </div>
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
              <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[#66728a]">Status Legend</div>
              <ul className="space-y-2.5 text-[12px] text-[#34445f]">
                {[
                  { dot: "#0a8f5a", label: "SmartLead · Verified", desc: "safe to send today" },
                  { dot: "#b7791f", label: "SmartLead · Unverified", desc: "excluded from campaigns" },
                  { dot: "#8794ab", label: "SmartLead · No Email", desc: "needs enrichment" },
                  { dot: "#1e6fb8", label: "LinkedIn Import", desc: "needs email enrichment" },
                ].map((s) => (
                  <li key={s.label} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.dot }} />
                    <div className="min-w-0">
                      <div className="font-bold text-[#07142f]">{s.label}</div>
                      <div className="text-[11px] text-[#66728a]">{s.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        <FindProspectsModal open={findOpen} onOpenChange={setFindOpen} onResults={handleFindResults} />
        <TeacherImportWizard open={importOpen} onClose={() => setImportOpen(false)} onComplete={() => { loadPage(); loadStats(); }} />
        <TeacherDetailPanel
          prospect={active}
          onClose={() => setActive(null)}
          onUpdate={handleUpdate}
          onPromote={handlePromote}
          onMarkNotFit={handleMarkNotFit}
          isPromoted={active ? promotedUuids.has(active.uuid) || active.status === "in_outreach" : false}
          isPromoting={false}
        />
        <AddToCampaignModal
          open={campaignModalOpen}
          onOpenChange={setCampaignModalOpen}
          prospectUuids={campaignTargets.map((t) => t.uuid)}
          prospectNames={campaignTargets.map((t) => t.name)}
          onAdded={handleAfterAddedToCampaign}
        />
      </div>
    </div>
  );
};

export default TeacherProspects;
