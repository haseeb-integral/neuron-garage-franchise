import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TeacherProspect, TeacherTag, EnrichmentStatus, GradeLevel } from "@/data/teacherData";
import { sourceLabelFor, type SourceKey } from "@/lib/teacherSourceLabels";

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
  phone: string | null;
  record_added_at: string | null;
  outreach_status_source: string | null;
  manus_dedupe_key: string | null;
  verified_enrichment_fact_count: number | null;
  verified_enrichment_signal_types: string[] | null;
  verified_creator_signal_count: number | null;
  secondary_signal_count: number | null;
  secondary_signal_confidence: string | null;
  secondary_signal_match_basis: string | null;
};

const normalizeGrade = (g: string | null): GradeLevel => {
  if (!g) return "3-5";
  const s = g.toLowerCase();
  if (s.includes("k") || s.includes("1") || s.includes("2")) return "K-2";
  if (s.includes("6") || s.includes("7") || s.includes("8") || s.includes("middle")) return "6-8";
  return "3-5";
};

const pickStr = (raw: Record<string, unknown> | null, key: string): string | null => {
  if (!raw) return null;
  const v = raw[key];
  return typeof v === "string" && v.trim() ? v : null;
};

export const mapRow = (r: DbRow): TeacherProspect => ({
  uuid: r.id,
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
  phone: r.phone ?? "",
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
  recordAddedAt: r.record_added_at ?? null,
  outreachStatusSource: r.outreach_status_source ?? null,
  manusDedupeKey: r.manus_dedupe_key ?? null,
  verifiedFactCount: r.verified_enrichment_fact_count ?? 0,
  verifiedSignalTypes: r.verified_enrichment_signal_types ?? null,
  creatorSignalCount: r.verified_creator_signal_count ?? 0,
  secondarySignalCount: r.secondary_signal_count ?? 0,
  secondarySignalConfidence: r.secondary_signal_confidence ?? null,
  secondarySignalMatchBasis: r.secondary_signal_match_basis ?? null,
});

export interface Stats {
  total: number;
  withEmail: number;
  needsEnrichment: number;
  cities: number;
  bySource: { key: SourceKey; label: string; count: number; pct: number }[];
}

export interface UseTeacherProspectsDataArgs {
  page: number;
  pageSize: number;
  cityFilters: string[];
  debouncedSearch: string;
  sourceFilter: string;
  signalFilter?: string;
  hideInOutreach: boolean;
  allPromotedIds: string[];
}

export interface UseTeacherProspectsDataResult {
  prospects: TeacherProspect[];
  setProspects: React.Dispatch<React.SetStateAction<TeacherProspect[]>>;
  totalCount: number;
  stats: Stats | null;
  statsError: string | null;
  loadError: string | null;
  cities: string[];
  loadingProspects: boolean;
  loadedAt: Date | null;
  loadPage: () => Promise<void>;
  loadStats: () => Promise<void>;
  buildFilteredQuery: () => ReturnType<typeof supabase.from>;
}

/** Hook-type verified facts, kept in sync with src/lib/teacherSignals.ts */
const HOOK_FACT_CODES = [
  "teacher_project_lead",
  "recognition_award",
  "teacher_grant_recipient",
  "teacher_award_finalist",
  "teacher_grant_author",
  "teacher_of_year",
  "teacher_program_lead",
  "teacher_team_lead",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySignalFilter<T>(q: T, signalFilter: string): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = q as any;
  if (signalFilter === "tier1") {
    return b.or("secondary_signal_count.gt.0,verified_creator_signal_count.gt.0");
  }
  if (signalFilter === "tier2") {
    return b.overlaps("verified_enrichment_signal_types", HOOK_FACT_CODES);
  }
  if (signalFilter === "medium_plus") {
    return b.eq("secondary_signal_confidence", "MEDIUM");
  }
  if (signalFilter === "creator") return b.gt("verified_creator_signal_count", 0);
  if (signalFilter === "secondary") return b.gt("secondary_signal_count", 0);
  if (signalFilter === "has_phone") return b.not("phone", "is", null);
  return b;
}

export function useTeacherProspectsData(args: UseTeacherProspectsDataArgs) {
  const { page, pageSize, cityFilters, debouncedSearch, sourceFilter, hideInOutreach, allPromotedIds } = args;
  const signalFilter = args.signalFilter ?? "all";

  const [prospects, setProspects] = useState<TeacherProspect[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [loadingProspects, setLoadingProspects] = useState(true);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  // Load complete city list once
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("teacher_prospects_cities");
      if (!error && data) setCities((data as { city: string }[]).map((r) => r.city));
    })();
  }, []);

  const reqIdRef = useRef(0);
  const statsReqIdRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);


  const buildFilteredQuery = useCallback(() => {
    let q = supabase
      .from("teacher_prospects")
      .select("*")
      .order("created_at", { ascending: false });
    if (cityFilters.length > 0) q = q.in("city", cityFilters);
    if (debouncedSearch?.trim()) {
      const s = debouncedSearch.trim().replace(/[%_",]/g, "");
      q = q.or(`name.ilike."%${s}%",school.ilike."%${s}%",city.ilike."%${s}%",state.ilike."%${s}%",email.ilike."%${s}%"`);
    }
    if (sourceFilter === "smartlead") q = q.in("enrichment_source", ["smartlead_csv"]);
    else if (sourceFilter === "linkedin") q = q.in("enrichment_source", ["linkedin_danish"]);
    else if (sourceFilter === "needs_email") q = q.eq("needs_email_enrichment", true);
    q = applySignalFilter(q, signalFilter);
    return q;
  }, [cityFilters, debouncedSearch, sourceFilter, signalFilter]);

  const loadPage = useCallback(async () => {
    setLoadingProspects(true);
    setLoadError(null);
    const myReq = ++reqIdRef.current;
    const from = (page - 1) * pageSize;

    // Server-side search. A plain filtered select cannot use the trigram
    // indexes under the staff RLS rule, so it scans all rows and times out.
    const { data, error } = await supabase.rpc("teacher_prospects_search", {
      p_search: debouncedSearch?.trim() || null,
      p_cities: cityFilters.length > 0 ? cityFilters : null,
      p_source_filter: sourceFilter,
      p_signal_filter: signalFilter,
      p_sort: sortMode,
      p_exclude_ids: hideInOutreach && allPromotedIds.length > 0 ? allPromotedIds : null,
      p_limit: pageSize,
      p_offset: from,
    });
    if (myReq !== reqIdRef.current || !mountedRef.current) return;

    if (error) {
      const isTimeout = /statement timeout|canceling statement/i.test(error.message);
      const friendly = isTimeout
        ? "The database took too long to respond. Try a narrower search or a single city filter."
        : `Failed to load prospects: ${error.message}`;
      toast.error(friendly);
      setLoadError(friendly);
      setProspects([]);
      setTotalCount(0);
    } else {
      const payload = (data ?? {}) as { total?: number; rows?: unknown[] };
      setProspects((payload.rows ?? []).map((r) => mapRow(r as DbRow)));
      setTotalCount(payload.total ?? 0);
      setLoadedAt(new Date());
    }
    setLoadingProspects(false);
  }, [page, pageSize, cityFilters, debouncedSearch, sourceFilter, signalFilter, sortMode, hideInOutreach, allPromotedIds]);

  const loadStats = useCallback(async () => {
    const myReq = ++statsReqIdRef.current;
    setStatsError(null);
    const { data, error } = await supabase.rpc("teacher_prospects_stats", {
      p_search: debouncedSearch?.trim() || null,
      p_city: cityFilters.length === 1 ? cityFilters[0] : "All",
      p_source_filter: sourceFilter,
      p_cities: cityFilters.length > 0 ? cityFilters : null,
    });
    if (myReq !== statsReqIdRef.current) return;
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
  }, [debouncedSearch, cityFilters, sourceFilter]);

  // Re-fetch table on filter/page change; stats on filter change only
  useEffect(() => { loadPage(); }, [loadPage]);
  useEffect(() => { loadStats(); }, [loadStats]);

  // Auto-refetch on tab visibility
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

  return {
    prospects, setProspects, totalCount, stats, statsError, loadError, cities,
    loadingProspects, loadedAt, loadPage, loadStats, buildFilteredQuery,
  };
}

export { type DbRow };
