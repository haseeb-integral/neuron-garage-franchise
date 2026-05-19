import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Bell, HelpCircle, ChevronDown, LogOut, Settings, Search, Download, FileText,
  Plus, RefreshCw, ArrowRight, GitCompare, Eye, Star, Users, DollarSign,
  Trophy, UserCheck, Cog, Heart, MapPin, Building2, GraduationCap, Home as HomeIcon,
  Check, ChevronsUpDown, Info, X, Bookmark, BookmarkCheck, Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { sampleCities, CityData } from "@/data/cityData";
import { AddCriteriaDrawer } from "@/components/city-scoring/AddCriteriaDrawer";
import { MarketDetailDrawer } from "@/components/city-scoring/MarketDetailDrawer";
import { MarketCompareModal } from "@/components/city-scoring/MarketCompareModal";
import { AddCityModal } from "@/components/city-scoring/AddCityModal";
import { MarketReportModal } from "@/components/city-scoring/MarketReportModal";
import { SourceDataPanel } from "@/components/city-scoring/SourceDataPanel";
import { NearbyMarketsPanel } from "@/components/city-scoring/NearbyMarketsPanel";
import { MarketsMap } from "@/components/city-scoring/MarketsMap";
import { TierBadge } from "@/components/city-scoring/TierBadge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  loadLiveRankedMarkets,
  filterRankedMarkets,
  sampleRankedMarkets,
  downloadRankedMarketsCsv,
  buildSeededFallbackSignalsFromScored,
  mergeSignalsPreferLive,
  type RankedMarket,
} from "@/lib/cityScoringLiveData";
import { useCityScoringStore, DEFAULT_WEIGHTS } from "@/stores/cityScoringStore";
import { DEFAULT_SUB_WEIGHTS } from "@/lib/sowMetricRegistry";
import { SubMetricWeightsDrawer } from "@/components/city-scoring/SubMetricWeightsDrawer";
import { getCached, setCached } from "@/lib/pageCache";
import { Settings2 } from "lucide-react";
import { METRICS_BY_CATEGORY } from "@/lib/sowMetricRegistry";
import { parseSignalValue } from "@/lib/sowNormalize";
import { recomputeCategoryScore, recomputeComposite } from "@/lib/clientSubWeightScoring";
import { tierFromScore } from "@/lib/cityScoringLiveData";
import { canonicalKey } from "@/lib/signalAliases";
import { useCustomCriteria } from "@/hooks/useCustomCriteria";
import { useScoringConfig, useDebouncedSaveScoringConfig } from "@/hooks/useScoringConfig";
import { SCORING_PRESETS, PRESET_NAMES, PRESET_DESCRIPTIONS, detectPreset, type PresetName } from "@/lib/scoringPresets";
import { AskAiBar } from "@/components/city-scoring/AskAiBar";
import { AiAnswerCard, type AiResult } from "@/components/city-scoring/AiAnswerCard";


// Feature flag: hide live on-demand API widgets on the detail panel.
// Per May 18 Brett note + Haseeb decision: detail panel reads pre-seeded
// data only; refresh/scrape widgets stay in code but are hidden.
const SHOW_LIVE_REFRESH = false;

function rebalanceWeights<K extends string>(
  prev: Record<K, number>,
  changedKey: K,
  rawValue: number,
): Record<K, number> {
  const newValue = Math.max(0, Math.min(100, Math.round(rawValue)));
  const keys = Object.keys(prev) as K[];
  const others = keys.filter((k) => k !== changedKey);
  const pool = others.reduce((s, k) => s + prev[k], 0);
  const remainder = 100 - newValue;

  const next = { ...prev };
  next[changedKey] = newValue;

  if (others.length === 0) return next;

  if (pool > 0) {
    others.forEach((k) => {
      next[k] = Math.max(0, (prev[k] / pool) * remainder);
    });
  } else {
    const equal = remainder / others.length;
    others.forEach((k) => {
      next[k] = Math.max(0, equal);
    });
  }

  // Round to integers
  keys.forEach((k) => {
    next[k] = Math.round(next[k]);
  });

  // Reconcile rounding drift so total === 100, adjusting only "others"
  let diff = 100 - keys.reduce((s, k) => s + next[k], 0);
  while (diff !== 0 && others.length > 0) {
    // Pick the "other" with largest value (when subtracting) or smallest (when adding) to minimize visual jump
    const sorted = [...others].sort((a, b) => next[b] - next[a]);
    const target = diff > 0 ? sorted[sorted.length - 1] : sorted[0];
    const step = diff > 0 ? 1 : -1;
    if (next[target] + step < 0) break;
    next[target] = next[target] + step;
    diff -= step;
  }

  return next;
}

type CategoryKey =
  | "demand"
  | "pricingPower"
  | "competitiveLandscape"
  | "franchiseeSupply"
  | "easeOfOperations"
  | "parentMindset";

interface Category {
  key: CategoryKey;
  label: string;
  icon: typeof Users;
  color: string;
  bg: string;
  description: string;
  defaultWeight: number;
}

const CATEGORIES: Category[] = [
  { key: "demand", label: "Demand", icon: Users, color: "#174be8", bg: "#eaf0ff",
    description: "Measures size of target families and program demand.", defaultWeight: 25 },
  { key: "pricingPower", label: "Pricing Power", icon: DollarSign, color: "#0ea66e", bg: "#e6f7ef",
    description: "Measures ability to sustain premium pricing.", defaultWeight: 20 },
  { key: "competitiveLandscape", label: "Competitive Landscape", icon: Trophy, color: "#b8860b", bg: "#fff6dc",
    description: "Measures level of competition and market saturation.", defaultWeight: 20 },
  { key: "franchiseeSupply", label: "Franchisee Supply", icon: UserCheck, color: "#7c3aed", bg: "#f1ebff",
    description: "Measures availability and quality of teacher-operators.", defaultWeight: 15 },
  { key: "easeOfOperations", label: "Ease of Operations", icon: Cog, color: "#ea580c", bg: "#ffeede",
    description: "Measures operational complexity and real estate access.", defaultWeight: 10 },
  { key: "parentMindset", label: "Parent Mindset Indicators", icon: Heart, color: "#e11d48", bg: "#ffe4ea",
    description: "Measures education priorities and willingness to invest.", defaultWeight: 10 },
];

// Map mock data scoreBreakdown into our 6 category scores deterministically
function categoryScores(c: CityData): Record<CategoryKey, number> {
  const b = c.scoreBreakdown;
  return {
    demand: b.summerCampDemand,
    pricingPower: Math.round((b.dualIncomeFamilies + (c.medianIncome > 90000 ? 10 : 0)) * 0.95),
    competitiveLandscape: b.competitionScore,
    franchiseeSupply: Math.round((b.stemJobs + b.schoolDensity) / 2),
    easeOfOperations: Math.round((b.schoolDensity + b.dualIncomeFamilies) / 2),
    parentMindset: Math.round((b.childPopulation + b.dualIncomeFamilies) / 2),
  };
}

const SOURCES: { name: string; icon: typeof Building2; status: "connected" | "planned" }[] = [
  { name: "U.S. Census Bureau", icon: Building2, status: "connected" },
  { name: "BLS (Occupational Data)", icon: Building2, status: "connected" },
  { name: "Yelp / Google Maps / Apify", icon: MapPin, status: "connected" },
  { name: "Firecrawl", icon: FileText, status: "connected" },
  { name: "Google Trends", icon: Search, status: "planned" },
  { name: "GreatSchools.org", icon: GraduationCap, status: "planned" },
  { name: "State Education Databases", icon: GraduationCap, status: "planned" },
  { name: "ACA Camp Regulations", icon: FileText, status: "planned" },
  { name: "Internal Franchise Data", icon: HomeIcon, status: "planned" },
];

const normalizeMarketState = (state?: string | null) => {
  if (!state) return "";
  if (state === "TX") return "Texas";
  if (state === "FL") return "Florida";
  return state;
};

const sameMarket = (cityA?: string | null, stateA?: string | null, cityB?: string | null, stateB?: string | null) => {
  return (cityA ?? "").trim().toLowerCase() === (cityB ?? "").trim().toLowerCase()
    && normalizeMarketState(stateA).toLowerCase() === normalizeMarketState(stateB).toLowerCase();
};

const CityScoring = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, user, role, signOut, session } = useAuth();

  const displayName = profile?.full_name || profile?.email || user?.email || "Account";
  const initials = (displayName.match(/\b\w/g) || []).slice(0, 1).join("").toUpperCase() || "U";

  const searchTerm = useCityScoringStore((s) => s.searchTerm);
  const setSearchTerm = useCityScoringStore((s) => s.setSearchTerm);
  const scoringModel = useCityScoringStore((s) => s.scoringModel);
  const setScoringModel = useCityScoringStore((s) => s.setScoringModel);
  const compareMode = useCityScoringStore((s) => s.compareMode);
  const setCompareMode = useCityScoringStore((s) => s.setCompareMode);

  const stateFilter = useCityScoringStore((s) => s.stateFilter);
  const setStateFilter = useCityScoringStore((s) => s.setStateFilter);
  const minPop = useCityScoringStore((s) => s.minPop);
  const setMinPop = useCityScoringStore((s) => s.setMinPop);
  const minScore = useCityScoringStore((s) => s.minScore);
  const setMinScore = useCityScoringStore((s) => s.setMinScore);
  const tierFilter = useCityScoringStore((s) => s.tierFilter);
  const setTierFilter = useCityScoringStore((s) => s.setTierFilter);
  const nonRegOnly = useCityScoringStore((s) => s.nonRegOnly);
  const setNonRegOnly = useCityScoringStore((s) => s.setNonRegOnly);

  const defaultWeights = DEFAULT_WEIGHTS;
  const weights = useCityScoringStore((s) => s.weights);
  const setWeights = useCityScoringStore((s) => s.setWeights);
  const appliedWeights = useCityScoringStore((s) => s.appliedWeights);
  const setAppliedWeights = useCityScoringStore((s) => s.setAppliedWeights);
  const customCriteria = useCityScoringStore((s) => s.customCriteria);
  const setCustomCriteria = useCityScoringStore((s) => s.setCustomCriteria);
  const { data: supabaseCustomCriteria = [] } = useCustomCriteria();

  // Hydrate scoring preset + master weights from per-user Supabase row (one-shot)
  const { data: scoringConfigRow } = useScoringConfig();
  const [hydratedConfig, setHydratedConfig] = useState(false);
  useEffect(() => {
    if (hydratedConfig || !scoringConfigRow) return;
    if (scoringConfigRow.master_weights) {
      setWeights(scoringConfigRow.master_weights);
      setAppliedWeights(scoringConfigRow.master_weights);
    }
    if (scoringConfigRow.preset_name) setScoringModel(scoringConfigRow.preset_name);
    setHydratedConfig(true);
  }, [scoringConfigRow, hydratedConfig, setWeights, setAppliedWeights, setScoringModel]);

  // Persist preset + applied master weights to Supabase (debounced) once hydrated
  useDebouncedSaveScoringConfig(
    ((PRESET_NAMES as string[]).includes(scoringModel) ? scoringModel : "Balanced") as PresetName,
    appliedWeights,
    hydratedConfig,
  );
  const subWeights = useCityScoringStore((s) => s.subWeights);
  const appliedSubWeights = useCityScoringStore((s) => s.appliedSubWeights);
  const setAppliedSubWeights = useCityScoringStore((s) => s.setAppliedSubWeights);
  const resetSubWeights = useCityScoringStore((s) => s.resetSubWeights);
  const [openSubMetricsFor, setOpenSubMetricsFor] = useState<CategoryKey | null>(null);
  const [cityFilter, setCityFilter] = useState("");
  const [stateOpen, setStateOpen] = useState(false);
  // Snapshot of the user's manually-tuned ("Custom") weights so switching to a
  // preset and back doesn't lose them.
  const [customWeightsSnapshot, setCustomWeightsSnapshot] = useState<Record<CategoryKey, number> | null>(null);
  const [addCritOpen, setAddCritOpen] = useState(false);

  // Saved searches (per-user)
  type SavedSearch = { id: string; name: string; master_weights: any; sub_weights: any; created_at: string };
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [saveSearchOpen, setSaveSearchOpen] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");
  const [savingSearch, setSavingSearch] = useState(false);
  const [activeSavedSearchId, setActiveSavedSearchId] = useState<string | null>(null);

  const buildDefaultSearchName = (): string => {
    const dateStr = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
    if ((PRESET_NAMES as string[]).includes(scoringModel) && scoringModel !== "Custom") {
      return `${scoringModel} – ${dateStr}`;
    }
    const top = (Object.entries(weights) as [CategoryKey, number][])
      .sort((a, b) => b[1] - a[1])[0];
    const label = CATEGORIES.find((c) => c.key === top?.[0])?.label ?? "Custom";
    return `${label}-heavy – ${dateStr}`;
  };
  const openSaveDialog = () => {
    setSaveSearchName(buildDefaultSearchName());
    setSaveSearchOpen(true);
  };

  const refreshSavedSearches = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("saved_searches")
      .select("id, name, master_weights, sub_weights, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("loadSavedSearches", error);
      return;
    }
    setSavedSearches((data ?? []) as SavedSearch[]);
  };
  useEffect(() => { refreshSavedSearches(); }, [user?.id]);

  // ─── Watchlist (per-user, persisted to Supabase) ───────────────────────
  const [watchlistCityIds, setWatchlistCityIds] = useState<Set<string>>(new Set());
  const [watchlistOnly, setWatchlistOnly] = useState(false);

  const refreshWatchlist = async () => {
    if (!user) { setWatchlistCityIds(new Set()); return; }
    const { data, error } = await supabase
      .from("watchlist_items")
      .select("city_id");
    if (error) { console.error("refreshWatchlist", error); return; }
    setWatchlistCityIds(new Set((data ?? []).map((r: any) => r.city_id)));
  };
  useEffect(() => { refreshWatchlist(); }, [user?.id]);

  const toggleWatchlist = async (cityId: string | null | undefined) => {
    if (!cityId) { toast.error("Refresh this city's data before saving it"); return; }
    if (!user) { toast.error("Sign in required"); return; }
    const isSaved = watchlistCityIds.has(cityId);
    // optimistic
    setWatchlistCityIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(cityId); else next.add(cityId);
      return next;
    });
    if (isSaved) {
      const { error } = await supabase
        .from("watchlist_items")
        .delete()
        .eq("city_id", cityId)
        .eq("user_id", user.id);
      if (error) { console.error(error); toast.error("Remove failed"); refreshWatchlist(); return; }
      toast.success("Removed from watchlist");
    } else {
      const { error } = await supabase
        .from("watchlist_items")
        .insert({ user_id: user.id, city_id: cityId });
      if (error) { console.error(error); toast.error("Save failed"); refreshWatchlist(); return; }
      toast.success("Added to watchlist");
    }
  };

  const handleSaveSearch = async () => {
    const name = saveSearchName.trim();
    if (!name) { toast.error("Name required"); return; }
    if (!user) { toast.error("Sign in required"); return; }
    setSavingSearch(true);
    // Save the live draft (what the sliders show) and also apply it so saving
    // doubles as Apply Weights — avoids saving stale appliedWeights.
    setAppliedWeights(weights);
    setAppliedSubWeights(subWeights);
    const { error } = await supabase.from("saved_searches").insert({
      user_id: user.id,
      name,
      master_weights: weights as any,
      sub_weights: subWeights as any,
    });
    setSavingSearch(false);
    if (error) {
      console.error("saveSearch", error);
      toast.error("Save failed");
      return;
    }
    toast.success(`Saved "${name}" — find it under the Saved dropdown`);
    setSaveSearchOpen(false);
    setSaveSearchName("");
    setActiveSavedSearchId(null);
    refreshSavedSearches();
  };

  const handleLoadSavedSearch = (s: SavedSearch) => {
    const mw = s.master_weights as Record<CategoryKey, number>;
    const sw = s.sub_weights ?? {};
    if (mw) {
      setWeights(mw);
      setAppliedWeights(mw);
      setCustomWeightsSnapshot({ ...mw });
    }
    // Update both draft and applied sub-weights so any open drawer reflects the change
    useCityScoringStore.setState({ subWeights: sw, appliedSubWeights: sw });
    setScoringModel("Custom");
    setActiveSavedSearchId(s.id);
    toast.success(`Loaded "${s.name}"`);
  };

  const handleDeleteSavedSearch = (s: SavedSearch) => {
    toast(`Delete "${s.name}"?`, {
      action: {
        label: "Delete",
        onClick: async () => {
          const { error } = await supabase.from("saved_searches").delete().eq("id", s.id);
          if (error) {
            console.error("deleteSavedSearch", error);
            toast.error("Delete failed");
            return;
          }
          toast.success(`Deleted "${s.name}"`);
          if (activeSavedSearchId === s.id) setActiveSavedSearchId(null);
          refreshSavedSearches();
        },
      },
      cancel: { label: "Cancel", onClick: () => {} },
    });
  };

  // ─── AI City Query (Ask AI) ──────────────────────────────────────────────
  // Lovable AI Gateway-powered natural-language search. Translates queries
  // into existing filter state + draft weight nudges, plus shows reasoning
  // and data gaps. Multi-turn refinement capped at 6 turns server-side.
  type AiTurn = { query: string; response: AiResult };
  const [aiThreadId, setAiThreadId] = useState<string | null>(null);
  const [aiTurns, setAiTurns] = useState<AiTurn[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const lastAiTurn = aiTurns[aiTurns.length - 1];

  const clearAi = () => {
    setAiThreadId(null);
    setAiTurns([]);
  };

  const askAi = async (query: string) => {
    setAiLoading(true);
    try {
      const getValidAccessToken = async () => {
        let token = session?.access_token ?? "";
        if (!token) {
          const { data } = await supabase.auth.getSession();
          token = data.session?.access_token ?? "";
        }
        if (!token) return "";

        const { error: userError } = await supabase.auth.getUser(token);
        if (!userError) return token;

        const { data: refreshed } = await supabase.auth.refreshSession();
        return refreshed.session?.access_token ?? "";
      };

      const initialToken = await getValidAccessToken();
      if (!initialToken) {
        toast.error("Please sign in again to use AI search");
        return;
      }

      // Explicit fetch (not supabase.functions.invoke) so the Authorization
      // header reliably reaches the edge function via the preview proxy.
      const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-city-query`;
      const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const callOnce = async (token: string) => {
        const resp = await fetch(FN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: ANON_KEY,
          },
          body: JSON.stringify({
            query,
            threadId: aiThreadId,
            previousTurns: aiTurns.map((t) => ({ query: t.query, response: t.response })),
          }),
        });
        let bodyJson: any = null;
        try { bodyJson = await resp.json(); } catch { /* not json */ }
        return { resp, bodyJson };
      };

      let { resp, bodyJson } = await callOnce(initialToken);
      if (resp.status === 401) {
        const refreshedToken = await getValidAccessToken();
        ({ resp, bodyJson } = await callOnce(refreshedToken));
      }
      if (!resp.ok) {
        const msg = bodyJson?.error || bodyJson?.detail || `AI search failed (HTTP ${resp.status})`;
        toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
        return;
      }
      const data = bodyJson;
      const result = data?.result as AiResult | undefined;
      if (!result) {
        toast.error("AI returned no result");
        return;
      }
      setAiThreadId(data.threadId ?? null);
      setAiTurns((prev) => [...prev, { query, response: result }]);

      // Apply filters to existing filter state
      const f = result.filters;
      if (f.state) setStateFilter(f.state);
      if (f.tier) setTierFilter(f.tier);
      if (typeof f.minScore === "number") setMinScore(f.minScore);

      // Apply weight nudges to draft + applied master weights so Ask AI behaves
      // like an immediate search refinement rather than a pending local edit.
      const adj = result.weightAdjustments ?? {};
      const anyDelta = Object.values(adj).some((v) => v !== 0);
      if (anyDelta) {
        setScoringModel("Custom");
        setActiveSavedSearchId(null);
        setWeights((prev) => {
          const next = { ...prev } as Record<CategoryKey, number>;
          (Object.keys(adj) as CategoryKey[]).forEach((k) => {
            if (next[k] != null) next[k] = Math.max(0, Math.min(100, (next[k] ?? 0) + (adj[k] ?? 0)));
          });
          // Renormalize so sliders sum to 100
          const sum = Object.values(next).reduce((s, v) => s + v, 0) || 1;
          (Object.keys(next) as CategoryKey[]).forEach((k) => {
            next[k] = Math.round((next[k] / sum) * 100);
          });
          // Reconcile drift
          let diff = 100 - Object.values(next).reduce((s, v) => s + v, 0);
          const keys = Object.keys(next) as CategoryKey[];
          for (let i = 0; diff !== 0 && i < 6; i++) {
            const k = keys[i % keys.length];
            const step = diff > 0 ? 1 : -1;
            if (next[k] + step >= 0) { next[k] += step; diff -= step; }
          }
          setAppliedWeights(next);
          setCustomWeightsSnapshot({ ...next });
          return next;
        });
        toast.success("AI adjusted your category weights — composite re-ranked.");
      } else if (f.state || f.tier || typeof f.minScore === "number") {
        toast.success("AI applied filters to your search.");
      }
    } catch (e) {
      console.error("askAi", e);
      toast.error(e instanceof Error ? e.message : "AI search failed");
    } finally {
      setAiLoading(false);
    }
  };


  const selectedId = useCityScoringStore((s) => s.selectedId);
  const setSelectedId = useCityScoringStore((s) => s.setSelectedId);
  const selectedMarketKey = useCityScoringStore((s) => s.selectedMarketKey);
  const setSelectedMarketKey = useCityScoringStore((s) => s.setSelectedMarketKey);
  const selectedForCompare = useCityScoringStore((s) => s.selectedForCompare);
  const setSelectedForCompare = useCityScoringStore((s) => s.setSelectedForCompare);
  const [refreshingMarket, setRefreshingMarket] = useState(false);
  const PAGE_SIZE = 8;
  const page = useCityScoringStore((s) => s.page);
  const setPage = useCityScoringStore((s) => s.setPage);

  // Left-panel view toggle: classic paginated table vs. Top-N ranked list.




  // Live DB-backed data for the selected market (falls back to sample data when missing)
  const initialMarketKey = `${selectedMarketKey.city}|${selectedMarketKey.state}`;
  const initialDetail = getCached<{
    city: any | null; signals: any[]; scores: Record<string, number>; comps: any[]; job: any | null;
  }>(`city:detail:${initialMarketKey}`);
  const [liveCity, setLiveCityState] = useState<any | null>(initialDetail?.city ?? null);
  const [liveSignals, setLiveSignalsState] = useState<any[]>(initialDetail?.signals ?? []);
  const [liveCategoryScores, setLiveCategoryScoresState] = useState<Record<string, number>>(initialDetail?.scores ?? {});
  const [liveCompetitors, setLiveCompetitorsState] = useState<any[]>(initialDetail?.comps ?? []);
  const [liveRankedMarkets, setLiveRankedMarketsState] = useState<RankedMarket[]>(
    () => getCached<RankedMarket[]>("city:rankedMarkets") ?? [],
  );
  const setLiveRankedMarkets = (v: RankedMarket[]) => {
    setCached("city:rankedMarkets", v);
    setLiveRankedMarketsState(v);
  };
  const [liveJob, setLiveJobState] = useState<any | null>(initialDetail?.job ?? null);
  const setLiveCity = setLiveCityState;
  const setLiveSignals = setLiveSignalsState;
  const setLiveCategoryScores = setLiveCategoryScoresState;
  const setLiveCompetitors = setLiveCompetitorsState;
  const setLiveJob = setLiveJobState;
  const [marketRefreshVersion, setMarketRefreshVersion] = useState(0);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportAutoPdf, setReportAutoPdf] = useState(false);
  const [addCityOpen, setAddCityOpen] = useState(false);
  const viewMode = useCityScoringStore((s) => s.viewMode);
  const setViewMode = useCityScoringStore((s) => s.setViewMode);

  // Open city via global search ?city=ID
  useEffect(() => {
    const id = searchParams.get("city");
    if (id) {
      const found = sampleCities.find((c) => c.id === Number(id));
      if (found) {
        setSelectedId(found.id);
        setSelectedMarketKey({ city: found.city, state: found.state });
      }
      searchParams.delete("city");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load live ranked markets from Supabase once on mount
  useEffect(() => {
    loadLiveRankedMarkets()
      .then(setLiveRankedMarkets)
      .catch((err) => console.error("loadLiveRankedMarkets error", err));
  }, []);

  const baseRankedMarkets = useMemo<RankedMarket[]>(
    // Canonical list is the seeded backend dataset. Only fall back to sample
    // rows before the seeded list loads.
    () => (liveRankedMarkets.length > 0 ? liveRankedMarkets : sampleRankedMarkets()),
    [liveRankedMarkets],
  );

  const availableStates = useMemo(
    () => [
      "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
      "Delaware","District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois",
      "Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts",
      "Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
      "New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota",
      "Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
      "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
      "Wisconsin","Wyoming",
    ],
    [],
  );

  const filtered = useMemo(() => {
    const base = filterRankedMarkets(baseRankedMarkets, {
      searchTerm,
      stateFilter,
      tierFilter,
      nonRegOnly,
      minScore,
      minPop,
    });
    const q = cityFilter.trim().toLowerCase();
    let out = q ? base.filter((m: any) => String(m.city ?? "").toLowerCase().includes(q)) : base;
    if (watchlistOnly) {
      out = out.filter((m: any) => m.cityId && watchlistCityIds.has(m.cityId));
    }

    const masterWeightsAreDefault = JSON.stringify(appliedWeights) === JSON.stringify(DEFAULT_WEIGHTS);
    const subWeightsAreDefault = JSON.stringify(appliedSubWeights) === JSON.stringify(DEFAULT_SUB_WEIGHTS);
    const reRanked = out.map((market) => {
      if (!market.hasLiveData || !market.categoryScores) return market;
      if (masterWeightsAreDefault && subWeightsAreDefault) return market;

      const seededSignalValues = Object.fromEntries(
        buildSeededFallbackSignalsFromScored(market.scoredRow).map((signal) => [
          signal.signal_key,
          parseSignalValue(signal.value),
        ]),
      );

      const cats = {} as Record<CategoryKey, number | null>;
      (Object.keys(METRICS_BY_CATEGORY) as CategoryKey[]).forEach((key) => {
        cats[key] = recomputeCategoryScore(
          METRICS_BY_CATEGORY[key] ?? [],
          seededSignalValues,
          appliedSubWeights[key] ?? {},
          market.categoryScores?.[key] ?? null,
        ).score;
      });

      const { composite } = recomputeComposite(cats, appliedWeights);
      return {
        ...market,
        compositeScore: composite,
        tier: tierFromScore(composite),
      };
    });

    return reRanked.sort((a, b) => {
      if (a.hasLiveData !== b.hasLiveData) return a.hasLiveData ? -1 : 1;
      if (a.hasLiveData) return b.compositeScore - a.compositeScore;
      return a.city.localeCompare(b.city);
    });
  }, [baseRankedMarkets, searchTerm, stateFilter, tierFilter, nonRegOnly, minScore, minPop, cityFilter, watchlistOnly, watchlistCityIds, appliedWeights, appliedSubWeights]);

  // Reset to page 1 when watchlist filter toggles
  useEffect(() => { setPage(1); }, [watchlistOnly]);

  // Percentile rank within currently filtered list (only live-data rows are ranked).
  // 100 = top scorer, 0 = bottom. Used in the Tier badge tooltip.
  const percentileById = useMemo(() => {
    const live = filtered.filter((m: any) => m.hasLiveData);
    const sorted = [...live].sort(
      (a: any, b: any) => Number(b.compositeScore ?? 0) - Number(a.compositeScore ?? 0),
    );
    const total = sorted.length;
    const map = new Map<string | number, number>();
    sorted.forEach((m: any, idx) => {
      const pct = total <= 1 ? 100 : Math.round((1 - idx / (total - 1)) * 100);
      map.set(m.id, pct);
    });
    return map;
  }, [filtered]);

  // Reset pagination whenever filter inputs change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, stateFilter, tierFilter, nonRegOnly, minScore, minPop, cityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const rawPageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const showingFrom = filtered.length === 0 ? 0 : pageStart + 1;
  const showingTo = Math.min(filtered.length, pageStart + PAGE_SIZE);

  // ─── Visible-page rescoring ─────────────────────────────────────────────
  // When the user changes sub-weights, the selected-city composite already
  // reflects them. For the visible page of the Ranked Markets list, we batch-
  // fetch each row's signals + server category scores and recompute composites
  // client-side using the user's appliedSubWeights + appliedWeights. Cities
  // off-page keep their server composite. Cleared when sub-weights are at
  // their defaults (no override needed).
  const visibleCityIds = useMemo(
    () => Array.from(new Set(rawPageItems.map((m) => m.cityId).filter((x): x is string => !!x))),
    [rawPageItems],
  );
  const subWeightsKey = useMemo(() => JSON.stringify(appliedSubWeights), [appliedSubWeights]);
  const appliedWeightsKey = useMemo(() => JSON.stringify(appliedWeights), [appliedWeights]);
  const defaultSubWeightsKey = useMemo(() => JSON.stringify(DEFAULT_SUB_WEIGHTS), []);
  const defaultMasterWeightsKey = useMemo(() => JSON.stringify(DEFAULT_WEIGHTS), []);
  const subWeightsAreDefault =
    subWeightsKey === defaultSubWeightsKey && appliedWeightsKey === defaultMasterWeightsKey;
  type CompositeOverride = { composite: number; tier: "A" | "B" | "C" | "D" };
  const [compositeOverrides, setCompositeOverrides] = useState<Record<string, CompositeOverride>>({});

  useEffect(() => {
    if (visibleCityIds.length === 0) {
      setCompositeOverrides({});
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: signals }, { data: scores }] = await Promise.all([
        supabase
          .from("city_market_signals")
          .select("city_id,signal_key,value")
          .in("city_id", visibleCityIds),
        supabase
          .from("city_category_scores")
          .select("city_id,category,score")
          .in("city_id", visibleCityIds),
      ]);
      if (cancelled) return;

      const DB_TO_UI: Record<string, CategoryKey> = {
        demand: "demand",
        pricing_power: "pricingPower",
        competitive_landscape: "competitiveLandscape",
        franchisee_supply: "franchiseeSupply",
        ease_of_operations: "easeOfOperations",
        parent_mindset: "parentMindset",
      };

      const sigByCity: Record<string, Record<string, number | null>> = {};
      (signals ?? []).forEach((s: any) => {
        if (!sigByCity[s.city_id]) sigByCity[s.city_id] = {};
        sigByCity[s.city_id][s.signal_key] = parseSignalValue(s.value);
      });
      const scoresByCity: Record<string, Partial<Record<CategoryKey, number>>> = {};
      (scores ?? []).forEach((s: any) => {
        const ui = DB_TO_UI[s.category];
        if (!ui) return;
        if (!scoresByCity[s.city_id]) scoresByCity[s.city_id] = {};
        (scoresByCity[s.city_id] as any)[ui] = s.score;
      });

      const next: Record<string, CompositeOverride> = {};
      visibleCityIds.forEach((id) => {
        const raw = sigByCity[id] ?? {};
        const srv = scoresByCity[id] ?? {};
        if (Object.keys(raw).length === 0 && Object.keys(srv).length === 0) return;
        const cats = {} as Record<CategoryKey, number | null>;
        (Object.keys(METRICS_BY_CATEGORY) as CategoryKey[]).forEach((k) => {
          const r = recomputeCategoryScore(
            METRICS_BY_CATEGORY[k] ?? [],
            raw,
            (appliedSubWeights as any)[k] ?? {},
            (srv as any)[k] ?? null,
          );
          cats[k] = r.score;
        });
        const { composite } = recomputeComposite(cats, appliedWeights);
        if (composite > 0) {
          next[id] = { composite, tier: tierFromScore(composite) };
        }
      });
      setCompositeOverrides(next);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCityIds.join(","), subWeightsKey, appliedWeightsKey]);

  // Apply overrides to the visible page and re-sort by the override-aware score.
  const pageItems = rawPageItems;

  const hasOverrides = !subWeightsAreDefault || appliedWeightsKey !== defaultMasterWeightsKey;

  const pageNumbers = useMemo<(number | "...")[]>(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const set = new Set<number>([1, 2, totalPages - 1, totalPages, safePage - 1, safePage, safePage + 1]);
    const sorted = Array.from(set).filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
    const out: (number | "...")[] = [];
    sorted.forEach((n, i) => {
      if (i > 0 && n - (sorted[i - 1] as number) > 1) out.push("...");
      out.push(n);
    });
    return out;
  }, [totalPages, safePage]);

  const selectedFallback = sampleCities.find((c) => c.id === selectedId) ?? sampleCities[0];
  const selectedSample = sampleCities.find(
    (c) => c.city === selectedMarketKey.city && c.state === selectedMarketKey.state,
  ) ?? selectedFallback;
  const selectedCity = selectedMarketKey.city || selectedSample.city;
  const selectedState = selectedMarketKey.state || selectedSample.state;
  const selectedRankedMarket = baseRankedMarkets.find((market) => sameMarket(market.city, market.state, selectedCity, selectedState));
  const liveCityMatchesSelection = sameMarket(liveCity?.city, liveCity?.state, selectedCity, selectedState);
  const selectedLiveCity = liveCityMatchesSelection ? liveCity : null;
  const selectedLiveSignals = liveCityMatchesSelection ? liveSignals : [];
  const selectedLiveCategoryScores = liveCityMatchesSelection ? liveCategoryScores : {};
  const selectedLiveJob = liveCityMatchesSelection ? liveJob : null;
  const selected = {
    ...selectedSample,
    city: selectedCity,
    state: selectedState,
    // Canonical cityId = us_cities_scored.id. Used by drawer, report, watchlist.
    cityId: selectedLiveCity?.id ?? selectedRankedMarket?.cityId ?? (selectedSample as any).cityId,
    compositeScore: selectedLiveCity?.composite_score ?? selectedRankedMarket?.compositeScore ?? selectedSample.compositeScore,
    tier: selectedLiveCity?.tier ?? selectedRankedMarket?.tier ?? selectedSample.tier,
    population: selectedLiveCity?.population ?? selectedRankedMarket?.population ?? selectedSample.population,
    competitorCount: selectedLiveCity?.competitor_count ?? selectedRankedMarket?.competitorCount ?? selectedSample.competitorCount,
    county: selectedLiveCity?.county ?? selectedRankedMarket?.county ?? (selectedSample as any).county,
    metroArea: selectedLiveCity?.metro_area ?? selectedRankedMarket?.metroArea ?? (selectedSample as any).metroArea,
    marketType: selectedLiveCity?.market_type ?? selectedRankedMarket?.marketType ?? (selectedSample as any).marketType,
    lastScrapedAt: selectedLiveCity?.last_scraped_at ?? selectedRankedMarket?.lastScrapedAt ?? null,
    scored: selectedLiveCity?.scored ?? selectedRankedMarket?.scoredRow ?? null,
  };
  const selectedHasLiveData =
    !!selected.cityId && (Number(selected.compositeScore ?? 0) > 0 || !!selected.lastScrapedAt);

  // Load live DB-backed data for the currently selected market.
  // Canonical source: us_cities_scored (Sam's pre-seeded ~948-city dataset).
  // Maps the scored row into a legacy `cities`-shaped object so all the
  // downstream UI (which references liveCity.composite_score, .metro_area,
  // .market_type, .county, .last_scraped_at, .notes, .competitor_count,
  // .median_income, .children_pct, .elementary_schools, .population, .id)
  // keeps working without a wider refactor. Category scores come from the
  // `score_*` columns on the same row. Evidence tables (signals / competitors
  // / fetch jobs) remain best-effort and may be empty for seeded-only cities.
  const loadLiveData = async (city: string, state: string) => {
    try {
      // Match by city_name + (state_name OR state_abbr). State filter in this
      // app is the full name (e.g. "Maryland") but we accept abbr too.
      const stateAbbr = state === "Texas" ? "TX" : state === "Florida" ? "FL" : state;
      const { data: scoredRow } = await supabase
        .from("us_cities_scored")
        .select("*")
        .ilike("city_name", city)
        .or(`state_name.ilike.${state},state_abbr.ilike.${stateAbbr}`)
        .maybeSingle();

      if (!scoredRow) {
        setLiveCity(null);
        setLiveSignals([]);
        setLiveCategoryScores({});
        setLiveCompetitors([]);
        setLiveJob(null);
        return;
      }

      const density = Number(scoredRow.population_density ?? 0);
      const marketTypeDerived = density >= 3000 ? "Urban" : density >= 500 ? "Suburb" : "Rural";
      const composite = Number(scoredRow.composite_score_default ?? 0);
      const tierDerived =
        composite >= 80 ? "A" : composite >= 65 ? "B" : composite >= 50 ? "C" : "D";
      const pop = Number(scoredRow.population ?? 0);
      const kids = Number(scoredRow.children_5_12 ?? 0);
      const childrenPct = pop > 0 ? Math.round((kids / pop) * 1000) / 10 : null;
      const stateNormalized = state === "TX" ? "Texas" : state === "FL" ? "Florida" : state;

      // Build a `cities`-shaped façade so downstream code can keep reading the
      // same field names. `id` IS the us_cities_scored uuid — that's now the
      // canonical cityId across watchlist, drawer, report, and nearby panels.
      const cityRow: any = {
        id: scoredRow.id,
        city: scoredRow.city_name,
        state: stateNormalized,
        composite_score: composite,
        tier: tierDerived,
        population: pop,
        competitor_count: Number(scoredRow.summer_camp_count ?? 0),
        county: null,
        metro_area: scoredRow.metro_area ?? null,
        market_type: marketTypeDerived,
        last_scraped_at: scoredRow.scored_at ?? null,
        notes: null,
        median_income: scoredRow.median_household_income ?? null,
        children_pct: childrenPct,
        elementary_schools: scoredRow.public_elementary_count ?? null,
        latitude: scoredRow.latitude ?? null,
        longitude: scoredRow.longitude ?? null,
        is_non_registration: scoredRow.is_registration_state === false,
        scored: scoredRow, // keep the raw row available if anything needs it
      };

      // Category scores come straight from us_cities_scored.score_*.
      const scoresMap: Record<string, number> = {};
      const addScore = (k: string, v: any) => {
        if (v != null) scoresMap[k] = Number(v);
      };
      addScore("demand", scoredRow.score_demand);
      addScore("pricing_power", scoredRow.score_pricing_power);
      addScore("competitive_landscape", scoredRow.score_competitive);
      addScore("franchisee_supply", scoredRow.score_franchise_supply);
      addScore("ease_of_operations", scoredRow.score_ease_of_operation);
      addScore("parent_mindset", scoredRow.score_parent_mindset);

      // Best-effort evidence pull from legacy child tables. These are still
      // keyed by legacy cities.id, so seeded-only rows will return empty.
      // UI handles empty gracefully.
      const [{ data: signals }, { data: comps }, { data: jobs }] = await Promise.all([
        supabase.from("city_market_signals").select("*").eq("city_id", scoredRow.id),
        supabase
          .from("city_competitors")
          .select("*")
          .eq("city_id", scoredRow.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("city_fetch_jobs")
          .select("*")
          .eq("city_id", scoredRow.id)
          .eq("source", "sow_metric_coverage")
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      setLiveCity(cityRow);
      setLiveSignals(signals ?? []);
      setLiveCategoryScores(scoresMap);
      setLiveCompetitors(comps ?? []);
      setLiveJob(jobs?.[0] ?? null);
      setCached(`city:detail:${city}|${state}`, {
        city: cityRow,
        signals: signals ?? [],
        scores: scoresMap,
        comps: comps ?? [],
        job: jobs?.[0] ?? null,
      });
    } catch (err) {
      console.error("loadLiveData error", err);
    }
  };

  useEffect(() => {
    if (!selectedCity || !selectedState) return;
    // Hydrate immediately from cache so re-mounts/market-switches feel instant
    const cached = getCached<{
      city: any | null; signals: any[]; scores: Record<string, number>; comps: any[]; job: any | null;
    }>(`city:detail:${selectedCity}|${selectedState}`);
    if (cached) {
      setLiveCity(cached.city);
      setLiveSignals(cached.signals);
      setLiveCategoryScores(cached.scores);
      setLiveCompetitors(cached.comps);
      setLiveJob(cached.job);
    } else {
      // No cache for the new city — clear stale state from the previous city
      // so the center panel doesn't show the wrong score/signals for ~1s
      // until loadLiveData() resolves.
      setLiveCity(null);
      setLiveSignals([]);
      setLiveCategoryScores({});
      setLiveCompetitors([]);
      setLiveJob(null);
    }
    loadLiveData(selectedCity, selectedState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity, selectedState]);

  const getInvokeErrorMessage = async (error: any) => {
    if (!error) return "Unknown error";
    const response = error?.context;
    if (response && typeof response.clone === "function") {
      try {
        const bodyText = await response.clone().text();
        if (bodyText) {
          try {
            const body = JSON.parse(bodyText);
            const detail = body?.error?.detail ?? body?.detail ?? body?.error?.message ?? body?.error;
            if (detail) return typeof detail === "string" ? detail : JSON.stringify(detail);
          } catch {
            return bodyText;
          }
          return bodyText;
        }
      } catch {
        // Ignore response parsing failures and fall back to the standard error message.
      }
    }
    return error instanceof Error ? error.message : error?.message || String(error);
  };

  const reloadSelectedMarketView = async (city: string, state: string) => {
    await Promise.all([
      loadLiveData(city, state),
      loadLiveRankedMarkets()
        .then(setLiveRankedMarkets)
        .catch((err) => console.error("loadLiveRankedMarkets after refresh failed", err)),
    ]);
  };

  const waitForCompleteSowEvidence = async ({
    city,
    state,
    startedAfter,
    expectedJobId,
    expectedCompositeScore,
    expectedTier,
  }: {
    city: string;
    state: string;
    startedAfter: string;
    expectedJobId?: string | null;
    expectedCompositeScore?: number | null;
    expectedTier?: string | null;
  }) => {
    let lastDetail = "SOW evidence rows are not ready yet";

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const { data: cityRow, error: cityError } = await supabase
        .from("cities")
        .select("id, composite_score, tier, last_scraped_at")
        .eq("city", city)
        .eq("state", state)
        .maybeSingle();

      if (cityError) {
        lastDetail = cityError.message;
      } else if (cityRow?.id) {
        const latestSowJobQuery = expectedJobId
          ? supabase
              .from("city_fetch_jobs")
              .select("id,status,response_summary,created_at,completed_at")
              .eq("id", expectedJobId)
              .maybeSingle()
          : supabase
              .from("city_fetch_jobs")
              .select("id,status,response_summary,created_at,completed_at")
              .eq("city_id", cityRow.id)
              .eq("source", "sow_metric_coverage")
              .gte("created_at", startedAfter)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

        const [{ data: sowJob, error: jobError }, { count: signalCount, error: signalError }, { count: categoryCount, error: categoryError }] = await Promise.all([
          latestSowJobQuery,
          supabase
            .from("city_market_signals")
            .select("id", { count: "exact", head: true })
            .eq("city_id", cityRow.id),
          supabase
            .from("city_category_scores")
            .select("id", { count: "exact", head: true })
            .eq("city_id", cityRow.id),
        ]);

        const jobSummary = sowJob?.response_summary as any;
        const totalSowMetrics = Number(jobSummary?.counts?.total_sow_metrics ?? 0);
        const scoreMatches = expectedCompositeScore == null || cityRow.composite_score === expectedCompositeScore;
        const tierMatches = expectedTier == null || cityRow.tier === expectedTier;
        const jobMatchesRequest = expectedJobId
          ? sowJob?.id === expectedJobId
          : !!sowJob?.created_at && new Date(sowJob.created_at).getTime() >= new Date(startedAfter).getTime();
        const jobCompleted = sowJob?.status === "completed" || sowJob?.status === "completed_with_warnings";

        if (
          !jobError
          && !signalError
          && !categoryError
          && jobMatchesRequest
          && jobCompleted
          && totalSowMetrics === 46
          && signalCount === 46
          && (categoryCount ?? 0) >= CATEGORIES.length
          && scoreMatches
          && tierMatches
        ) {
          return { ready: true };
        }

        lastDetail = [
          jobError?.message,
          signalError?.message,
          categoryError?.message,
          `signals=${signalCount ?? 0}`,
          `categories=${categoryCount ?? 0}`,
          `expected=${totalSowMetrics || 0}`,
          scoreMatches ? null : `score=${cityRow.composite_score ?? "?"}`,
          tierMatches ? null : `tier=${cityRow.tier ?? "?"}`,
          sowJob?.status ? `status=${sowJob.status}` : null,
        ].filter(Boolean).join(", ");
      } else {
        lastDetail = "City row not found after refresh";
      }

      await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 350 : 800));
    }

    return { ready: false, detail: lastDetail };
  };

  const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0);

  const resetWeights = () => {
    setWeights(defaultWeights);
    setAppliedWeights(defaultWeights);
    resetSubWeights();
    toast.success("Weights reset to defaults");
  };

  const toggleCompare = (id: number) => {
    setSelectedForCompare((p) => {
      if (p.includes(id)) return p.filter((i) => i !== id);
      if (p.length >= 4) {
        toast.error("You can compare up to 4 markets at a time");
        return p;
      }
      return [...p, id];
    });
  };

  const buildCsvDownload = async () => {
    try {
      const cityIds = Array.from(
        new Set(filtered.map((m: any) => m.cityId).filter((x: any): x is string => !!x)),
      );

      const DB_TO_UI: Record<string, CategoryKey> = {
        demand: "demand",
        pricing_power: "pricingPower",
        competitive_landscape: "competitiveLandscape",
        franchisee_supply: "franchiseeSupply",
        ease_of_operations: "easeOfOperations",
        parent_mindset: "parentMindset",
      };

      const sigByCity: Record<string, Record<string, number | null>> = {};
      const scoresByCity: Record<string, Partial<Record<CategoryKey, number>>> = {};

      if (cityIds.length > 0) {
        const [{ data: signals }, { data: scores }] = await Promise.all([
          supabase.from("city_market_signals").select("city_id,signal_key,value").in("city_id", cityIds),
          supabase.from("city_category_scores").select("city_id,category,score").in("city_id", cityIds),
        ]);
        (signals ?? []).forEach((s: any) => {
          if (!sigByCity[s.city_id]) sigByCity[s.city_id] = {};
          sigByCity[s.city_id][s.signal_key] = parseSignalValue(s.value);
        });
        (scores ?? []).forEach((s: any) => {
          const ui = DB_TO_UI[s.category];
          if (!ui) return;
          if (!scoresByCity[s.city_id]) scoresByCity[s.city_id] = {};
          (scoresByCity[s.city_id] as any)[ui] = s.score;
        });
      }

      const masterTotal = Object.values(appliedWeights).reduce((s, v) => s + v, 0) || 1;

      const header = ["Rank", "City", "State", "County", "Metro Area", "Tier", "Composite Score"];
      CATEGORIES.forEach((c) => {
        header.push(`${c.label} Score`, `${c.label} Weight%`, `${c.label} Contribution`);
      });
      header.push("Population", "Competitors", "Market Type", "Source", "Last Refreshed");

      const rows: string[][] = [header];

      filtered.forEach((m: any, index: number) => {
        const raw = (m.cityId && sigByCity[m.cityId]) || {};
        const srv = (m.cityId && scoresByCity[m.cityId]) || {};

        const catScores = {} as Record<CategoryKey, number>;
        CATEGORIES.forEach((c) => {
          const r = recomputeCategoryScore(
            METRICS_BY_CATEGORY[c.key] ?? [],
            raw,
            (appliedSubWeights as any)[c.key] ?? {},
            (srv as any)[c.key] ?? null,
          );
          catScores[c.key] = r.score != null ? Math.round(r.score) : 0;
        });

        let composite = 0;
        const perCatRow: string[] = [];
        CATEGORIES.forEach((c) => {
          const weightPct = (appliedWeights[c.key] / masterTotal) * 100;
          const score = catScores[c.key];
          const contribution = (weightPct * score) / 100;
          composite += contribution;
          perCatRow.push(String(score), weightPct.toFixed(1), contribution.toFixed(2));
        });
        const compositeRounded = Math.round(composite);
        const tier = m.hasLiveData ? tierFromScore(compositeRounded) : (m.tier ?? "");

        rows.push([
          String(index + 1),
          m.city ?? "",
          m.state ?? "",
          m.county ?? "",
          m.metroArea ?? "",
          String(tier),
          m.hasLiveData ? String(compositeRounded) : "",
          ...perCatRow,
          String(m.population ?? ""),
          String(m.competitorCount ?? ""),
          m.marketType ?? "",
          m.source ?? "",
          m.lastScrapedAt ?? "",
        ]);
      });

      const csv = rows
        .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ranked-markets-live-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Ranked markets exported as CSV");
    } catch (err) {
      console.error("Export CSV failed", err);
      toast.error("Export failed — see console");
    }
  };

  const openCompare = () => {
    if (selectedForCompare.length < 2) {
      toast.error("Select at least 2 markets to compare");
      return;
    }
    setCompareOpen(true);
  };

  const applyWeights = () => {
    if (totalWeight !== 100) return;
    setAppliedWeights({ ...weights });
    setAppliedSubWeights(subWeights);
    // While the user is in Custom mode, keep the snapshot in sync with the
    // most recently applied weights so a round-trip through a preset restores them.
    if (scoringModel === "Custom") setCustomWeightsSnapshot({ ...weights });
    toast.success("Composite score recalculated from current weights.");
  };

  const handleFindTeachers = () => {
    navigate(`/teacher-prospects?city=${encodeURIComponent(selected.city)}&state=${encodeURIComponent(selected.state)}`);
  };

  const handleRefreshData = async () => {
    if (!selectedCity || !selectedState) return;
    setRefreshingMarket(true);
    let liveData: any = null;
    let liveError: any = null;
    let sowData: any = null;
    let sowError: any = null;
    const refreshStartedAt = new Date().toISOString();
    try {
      const city = selectedCity;
      const state = selectedState;

      try {
        const res = await supabase.functions.invoke("fetch-city-market-data", {
          body: { city, state },
        });
        if (res.error) liveError = res.error;
        else liveData = res.data;
      } catch (e) {
        liveError = e;
      }

      try {
        const res = await supabase.functions.invoke("fetch-city-market-data-sow", {
          body: { city, state },
        });
        if (res.error) sowError = res.error;
        else sowData = res.data;
      } catch (e) {
        sowError = e;
      }

      const liveErrorMessage = await getInvokeErrorMessage(liveError);
      const sowErrorMessage = await getInvokeErrorMessage(sowError);
      const sowEvidence = !sowError
        ? await waitForCompleteSowEvidence({
            city,
            state,
            startedAfter: refreshStartedAt,
            expectedJobId: sowData?.inserted?.job_id ?? null,
            expectedCompositeScore: sowData?.official_sow_scoring?.composite_score ?? null,
            expectedTier: sowData?.official_sow_scoring?.tier ?? null,
          })
        : { ready: false, detail: sowErrorMessage };

      if (!sowError && !sowEvidence.ready) {
        sowError = new Error(sowEvidence.detail || "SOW refresh completed without a full 46-row evidence set");
      }

      console.log("refresh result", {
        city,
        state,
        liveData,
        liveError,
        liveErrorMessage,
        sowData,
        sowError,
        sowErrorMessage,
        sowEvidence,
      });

      // Fire-and-await the school-counts refresh for just this city.
      // Non-blocking on failure: other data should still surface.
      const targetCityId = liveCity?.id as string | undefined;
      if (targetCityId) {
        try {
          const schoolRes = await supabase.functions.invoke("fetch-school-counts", {
            body: { cityIds: [targetCityId] },
          });
          if (schoolRes.error) {
            console.warn("fetch-school-counts failed", schoolRes.error);
            toast.warning("School data refresh failed; other data updated.");
          }
        } catch (e) {
          console.warn("fetch-school-counts threw", e);
          toast.warning("School data refresh failed; other data updated.");
        }
      }

      await reloadSelectedMarketView(city, state);
      setMarketRefreshVersion((version) => version + 1);

      const where = `${city}, ${state}`;
      const liveOk = !liveError;
      const sowOk = !sowError;

      if (liveOk && sowOk) {
        toast.success("Market data and SOW score refreshed", { description: `${where} updated.` });
      } else if (!liveOk && sowOk) {
        toast.warning("SOW score refreshed. Live market refresh had warnings", {
          description: `${where} — live: ${liveErrorMessage}`,
        });
      } else if (liveOk && !sowOk) {
        toast.warning("Market data refreshed, but SOW scoring failed", {
          description: `${where} — sow: ${await getInvokeErrorMessage(sowError)}`,
        });
      } else {
        toast.error("Refresh failed. Live market and SOW scoring both failed", {
          description: `${where} — live: ${liveErrorMessage} | sow: ${await getInvokeErrorMessage(sowError)}`,
        });
      }
    } finally {
      setRefreshingMarket(false);
    }
  };

  const handleLogout = async () => { await signOut(); navigate("/auth", { replace: true }); };

  const cs = categoryScores(selected);

  // DB → UI category-key mapping
  const DB_CAT_TO_UI: Record<string, CategoryKey> = {
    demand: "demand",
    pricing_power: "pricingPower",
    competitive_landscape: "competitiveLandscape",
    franchisee_supply: "franchiseeSupply",
    ease_of_operations: "easeOfOperations",
    parent_mindset: "parentMindset",
    // Legacy keys (back-compat)
    summer_camp_demand: "demand",
    dual_income_families: "pricingPower",
    competition_score: "competitiveLandscape",
    stem_jobs: "franchiseeSupply",
    school_density: "easeOfOperations",
    child_population: "parentMindset",
  };
  const liveUiCategoryScores: Partial<Record<CategoryKey, number>> = {};
  Object.entries(selectedLiveCategoryScores).forEach(([k, v]) => {
    const uiKey = DB_CAT_TO_UI[k];
    if (uiKey) liveUiCategoryScores[uiKey] = v as number;
  });

  if (selectedRankedMarket?.categoryScores) {
    Object.entries(selectedRankedMarket.categoryScores).forEach(([k, v]) => {
      if (v != null) liveUiCategoryScores[k as CategoryKey] = Number(v);
    });
  }

  const detailScore = selectedLiveCity?.composite_score
    ? selectedLiveCity.composite_score
    : selected.compositeScore;

  const baseDetailCategoryScores = { ...cs, ...liveUiCategoryScores } as Record<CategoryKey, number>;

  // Build raw signal values keyed by SOW signal_key for the selected city.
  const seededFallbackSignals = useMemo(() => {
    return buildSeededFallbackSignalsFromScored(
      selected.scored,
      Number(selectedLiveCity?.children_pct ?? 0) || undefined,
    );
  }, [selected.scored, selectedLiveCity?.children_pct]);

  // Always merge: seeded fallback is the skeleton (so user sees coverage gaps
  // as "—" rather than a blank panel), live legacy signals override when present.
  const signalsForDisplay = useMemo(
    () => mergeSignalsPreferLive(selectedLiveSignals, selected.scored, Number(selectedLiveCity?.children_pct ?? 0) || undefined),
    [selectedLiveSignals, selected.scored, selectedLiveCity?.children_pct],
  );

  const rawValuesByKey = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const s of signalsForDisplay) {
      if (!s?.signal_key) continue;
      out[s.signal_key] = parseSignalValue(s.value);
    }
    return out;
  }, [signalsForDisplay]);

  // Recompute each category score using the user's applied sub-weights when
  // available; otherwise fall back to the server-stored category score.
  const recomputedByCategory = useMemo(() => {
    const out = {} as Record<CategoryKey, ReturnType<typeof recomputeCategoryScore>>;
    (Object.keys(baseDetailCategoryScores) as CategoryKey[]).forEach((k) => {
      out[k] = recomputeCategoryScore(
        METRICS_BY_CATEGORY[k] ?? [],
        rawValuesByKey,
        appliedSubWeights[k] ?? {},
        baseDetailCategoryScores[k] ?? null,
      );
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseDetailCategoryScores, rawValuesByKey, appliedSubWeights]);

  const detailCategoryScores = (() => {
    const out = { ...baseDetailCategoryScores } as Record<CategoryKey, number>;
    (Object.keys(out) as CategoryKey[]).forEach((k) => {
      const r = recomputedByCategory[k];
      if (r?.score != null) out[k] = Math.round(r.score);
    });
    return out;
  })();

  // Frontend-only weighted composite using applied weights and recomputed scores.
  const appliedTotal = Object.values(appliedWeights).reduce((s, v) => s + v, 0);
  const weightedComposite = appliedTotal > 0
    ? Math.round(
        CATEGORIES.reduce((s, c) => s + (detailCategoryScores[c.key] ?? 0) * appliedWeights[c.key], 0) / appliedTotal
      )
    : detailScore;
  const displayTier: "A" | "B" | "C" | "D" =
    weightedComposite >= 85 ? "A" : weightedComposite >= 75 ? "B" : weightedComposite >= 65 ? "C" : "D";
  const TIER_BADGE: Record<string, { bg: string; fg: string; label: string }> = {
    A: { bg: "#e6f7ef", fg: "#0ea66e", label: "A (Tier 1)" },
    B: { bg: "#eaf0ff", fg: "#174be8", label: "B (Tier 2)" },
    C: { bg: "#fff6dc", fg: "#b8860b", label: "C (Tier 3)" },
    D: { bg: "#ffeede", fg: "#ea580c", label: "D (Tier 4)" },
  };
  const tierBadge = TIER_BADGE[displayTier];
  const opportunityLabel =
    displayTier === "A" ? "Excellent Opportunity" :
    displayTier === "B" ? "Strong Opportunity" :
    displayTier === "C" ? "Moderate Opportunity" : "Limited Opportunity";

  const SIGNAL_ICONS: Record<string, typeof Users> = {
    competitor_count: Trophy,
    elementary_school_count: GraduationCap,
    public_elementary_count: GraduationCap,
    private_school_count: Building2,
    stem_enrichment_count: Cog,
    montessori_count: Star,
    rental_venue_count: HomeIcon,
    parent_mindset_places: Heart,
    firecrawl_source_pages: FileText,
    source_pages_found: FileText,
    data_readiness: Star,
    children_5_12: Users,
    households_100k: HomeIcon,
    premium_pricing: DollarSign,
    teacher_density: GraduationCap,
    school_access: Building2,
  };

  const SIGNAL_DISPLAY_PRIORITY = [
    "total_population",
    "median_household_income",
    "children_population_proxy",
    "income_100k_plus_proxy",
    "education_bachelors_plus_proxy",
    "competitor_count",
    "public_elementary_count",
    "elementary_school_count",
    "private_school_count",
  ];

  const CENTER_SIGNAL_EXCLUDE = [
    "data_readiness",
    "census_data_readiness",
    "bls_data_readiness",
    // Folded into the public_elementary_count row below
    "public_elementary_enrollment",
  ];

  const centerLiveSignals = [...signalsForDisplay]
    .filter((s) => !CENTER_SIGNAL_EXCLUDE.includes(s.signal_key))
    .sort((a, b) => {
      const ai = SIGNAL_DISPLAY_PRIORITY.indexOf(a.signal_key);
      const bi = SIGNAL_DISPLAY_PRIORITY.indexOf(b.signal_key);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  const visibleCenterSignals = centerLiveSignals.slice(0, 12);
  const hasMoreSignals = signalsForDisplay.length > visibleCenterSignals.length;

  // Find enrollment to fold into the public_elementary_count row
  const elementaryEnrollmentSignal = signalsForDisplay.find(
    (s) => s.signal_key === "public_elementary_enrollment",
  );

  const liveSigRows = visibleCenterSignals.map((s) => {
    if (s.signal_key === "public_elementary_count") {
      const countNum = Number(s.value);
      const enrollNum = Number(elementaryEnrollmentSignal?.value ?? 0);
      const countLabel = Number.isFinite(countNum) ? countNum.toLocaleString() : s.value;
      const value = enrollNum > 0
        ? `${countLabel} schools · ${enrollNum.toLocaleString()} enrolled`
        : `${countLabel} schools`;
      return {
        icon: SIGNAL_ICONS[s.signal_key] ?? Star,
        label: "Public elementary (NCES CCD 2022)",
        value,
      };
    }
    return {
      icon: SIGNAL_ICONS[s.signal_key] ?? Star,
      label: s.label,
      value: s.value,
    };
  });

  const sigRows = liveSigRows;
  const hasLiveSignals = sigRows.length > 0;

  const lastScrapedAt = selectedLiveCity?.last_scraped_at ?? selectedLiveJob?.completed_at ?? null;
  const lastScrapedAtMs = lastScrapedAt ? new Date(lastScrapedAt).getTime() : null;
  const lastScrapedAbsolute = lastScrapedAt
    ? new Date(lastScrapedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;
  const formatRelative = (ms: number) => {
    const diff = Math.max(0, Date.now() - ms);
    const m = Math.round(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} hr ago`;
    const d = Math.round(h / 24);
    if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
    const mo = Math.round(d / 30);
    return `${mo} mo ago`;
  };
  const lastScrapedRelative = lastScrapedAtMs ? formatRelative(lastScrapedAtMs) : null;
  const isStale = lastScrapedAtMs ? Date.now() - lastScrapedAtMs > 24 * 60 * 60 * 1000 : false;

  // Derived display values for metro, county, market type — wired to live DB, with honest fallbacks
  const displayMetroArea = selectedLiveCity?.metro_area ?? (selected as any).metroArea ?? "\u2014";
  const displayCounty = selectedLiveCity?.county ?? (selected as any).county ?? "\u2014";
  const displayMarketType = selectedLiveCity?.market_type ?? (selected as any).marketType ?? "Suburb";

  return (
    <div className="-mx-3 md:-mx-5 lg:-mx-6 -my-3 px-3 md:px-5 lg:px-6 py-3 min-h-screen bg-white">
      {/* Top header: search + actions + notification/help/avatar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-[680px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8794ab]" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search city, suburb, metro, or school district…"
            className="pl-9 h-10 bg-white border-[#e5eaf2] text-sm"
          />
        </div>
        <Button variant="outline" className="h-10 border-[#e5eaf2] text-[#14233b] gap-2 font-normal" onClick={buildCsvDownload}>
          <Download size={15} /> Export Source Data
        </Button>
        <Button className="h-10 bg-[#174be8] hover:bg-[#1240c9] text-white gap-2 font-medium" onClick={() => setReportOpen(true)}>
          <FileText size={15} /> Generate Market Report
        </Button>
        <button
          type="button"
          className="relative flex items-center justify-center rounded-full bg-white text-[#526078] hover:bg-[#f3f6fb]"
          aria-label="Notifications"
          style={{ width: 36, height: 36, border: "1px solid #eef2f7" }}
        >
          <Bell size={16} strokeWidth={1.75} />
          <span className="absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-full bg-[#e11d48] text-[9px] font-bold text-white" style={{ width: 14, height: 14 }}>3</span>
        </button>
        <button
          className="flex items-center justify-center rounded-full bg-white text-[#526078] hover:bg-[#f3f6fb]"
          style={{ width: 36, height: 36, border: "1px solid #eef2f7" }}
        >
          <HelpCircle size={16} strokeWidth={1.75} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full px-1 py-0.5 hover:bg-[#f7faff]">
              <span className="flex items-center justify-center rounded-full bg-[#174be8] text-sm font-bold text-white" style={{ width: 34, height: 34 }}>{initials}</span>
              <span className="hidden text-left md:block">
                <span className="block text-[13px] font-bold leading-4 text-[#07142f]">{displayName.split("@")[0]}</span>
                {role && <span className="block text-[10px] uppercase leading-3 tracking-wide text-[#526078]">{role}</span>}
              </span>
              <ChevronDown className="hidden h-4 w-4 text-[#526078] md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium truncate">{displayName}</span>
                {(profile?.email || user?.email) && (
                  <span className="text-xs text-muted-foreground truncate">{profile?.email || user?.email}</span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {role === "admin" && (
              <>
                <DropdownMenuItem onClick={() => navigate("/settings/team")}>
                  <Settings className="mr-2 h-4 w-4" /> Team members
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title row + model controls */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-[#07142f]">City Search</h1>
          <p className="text-xs text-[#526078] mt-0.5">
            Discover and score the best cities, suburbs, and metros for Neuron Garage franchises.
          </p>
          {activeSavedSearchId ? (
            <p className="text-[11px] text-[#174be8] font-medium leading-tight mt-1">
              Loaded saved search: "{savedSearches.find((s) => s.id === activeSavedSearchId)?.name}"
            </p>
          ) : (
            <p className="text-[10px] text-[#8794ab] leading-tight mt-1 max-w-[520px]">
              {PRESET_DESCRIPTIONS[((PRESET_NAMES as string[]).includes(scoringModel) ? scoringModel : "Balanced") as PresetName]}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center">
            <Select
              value={(PRESET_NAMES as string[]).includes(scoringModel) ? scoringModel : "Balanced"}
              onValueChange={(name) => {
                // Saved-search selection
                if (name.startsWith("saved:")) {
                  const id = name.slice("saved:".length);
                  const found = savedSearches.find((s) => s.id === id);
                  if (found) handleLoadSavedSearch(found);
                  return;
                }
                // Leaving "Custom" → snapshot current weights so we can restore them later.
                if (scoringModel === "Custom" && name !== "Custom") {
                  setCustomWeightsSnapshot({ ...appliedWeights });
                }
                setActiveSavedSearchId(null);
                setScoringModel(name);
                if (name === "Custom") {
                  // Restore the last custom snapshot if we have one.
                  if (customWeightsSnapshot) {
                    setWeights(customWeightsSnapshot);
                    setAppliedWeights(customWeightsSnapshot);
                    toast.success("Restored your custom weights");
                  }
                } else if (SCORING_PRESETS[name as Exclude<PresetName, "Custom">]) {
                  const preset = SCORING_PRESETS[name as Exclude<PresetName, "Custom">];
                  setWeights(preset);
                  setAppliedWeights(preset);
                  toast.success(`Applied ${name} preset`);
                }
              }}
            >
              <SelectTrigger className="h-9 w-[210px] bg-white border-[#e5eaf2] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESET_NAMES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
                {savedSearches.length > 0 && (
                  <>
                    <div className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[#8794ab]">Saved Searches</div>
                    {savedSearches.map((s) => (
                      <div key={s.id} className="relative">
                        <SelectItem value={`saved:${s.id}`} className="pr-8">
                          <span className="truncate">{s.name}</span>
                        </SelectItem>
                        <button
                          type="button"
                          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteSavedSearch(s); }}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[#fde8e8] text-[#9aa6bd] hover:text-[#dc2626]"
                          aria-label={`Delete ${s.name}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          {savedSearches.length > 0 && (
            <Select
              value={activeSavedSearchId ?? ""}
              onValueChange={(id) => {
                const found = savedSearches.find((s) => s.id === id);
                if (found) handleLoadSavedSearch(found);
              }}
            >
              <SelectTrigger className="h-9 w-[180px] bg-white border-[#e5eaf2] text-sm">
                <SelectValue placeholder={`Saved (${savedSearches.length})`} />
              </SelectTrigger>
              <SelectContent>
                {savedSearches.map((s) => (
                  <div key={s.id} className="relative">
                    <SelectItem value={s.id} className="pr-8">
                      <span className="truncate">{s.name}</span>
                    </SelectItem>
                    <button
                      type="button"
                      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteSavedSearch(s); }}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[#fde8e8] text-[#9aa6bd] hover:text-[#dc2626]"
                      aria-label={`Delete ${s.name}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" className="h-9 border-[#e5eaf2] text-[#14233b] gap-1.5 font-normal" onClick={() => setAddCritOpen(true)}>
            <Plus size={14} /> Add Criteria
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#14233b]">Compare Mode</span>
            <Switch checked={compareMode} onCheckedChange={setCompareMode} />
          </div>
        </div>
      </div>

      {/* Scoring Weights */}
      <div className="mb-4 rounded-lg bg-white border border-[#eef2f7] p-4">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#07142f]">Scoring Weights</h3>
            <p className="text-[10px] text-[#8794ab] leading-snug mt-1">
              Set what matters most. 100% means scoring the market only by that category.
            </p>
            <p className="text-[10px] text-[#8794ab] leading-snug mt-0.5">
              Score uses available enabled metrics from the 46-metric SOW framework. Missing metrics are tracked as evidence gaps, not counted as zero.
            </p>
            {totalWeight !== 100 && (
              <p className="text-[11px] text-[#ea580c] mt-1">Weights must total 100% to apply scoring.</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs text-[#526078]">
              Total Weight: <span className={totalWeight === 100 ? "text-[#0ea66e] font-medium" : "text-[#ea580c] font-medium"}>{totalWeight}%</span>
            </span>
            {JSON.stringify(weights) !== JSON.stringify(appliedWeights) && totalWeight === 100 && (
              <span className="text-[11px] font-medium text-[#ea580c]">
                Click Apply to recompute scores
              </span>
            )}
            <button onClick={resetWeights} className="text-xs font-medium text-[#174be8] hover:underline">Reset to Default</button>
            <Button
              size="sm"
              variant="outline"
              disabled={totalWeight !== 100}
              onClick={openSaveDialog}
              className="h-7 border-[#dbe4f2] text-[#174be8] text-[11px] px-3 gap-1 disabled:opacity-50"
            >
              <Bookmark size={12} /> Save Search
            </Button>
            <Button
              size="sm"
              disabled={totalWeight !== 100}
              onClick={applyWeights}
              className="h-7 bg-[#174be8] hover:bg-[#1240c9] text-white text-[11px] px-3 disabled:opacity-50"
            >
              Apply Weights
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const customCount =
              customCriteria.filter((c) => c.category === cat.label).length +
              supabaseCustomCriteria.filter((c) => c.category === cat.label).length;
            return (
              <div
                key={cat.key}
                className="rounded-lg border border-[#eef2f7] bg-white p-3 flex flex-col gap-2 hover:border-[#174be8]/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 28, height: 28, backgroundColor: cat.bg }}>
                      <Icon size={15} style={{ color: cat.color }} />
                    </span>
                    <span className="text-[12.5px] font-semibold text-[#07142f] leading-tight">{cat.label}</span>
                  </div>
                </div>
                <div className="text-right text-base font-bold text-[#07142f]">{weights[cat.key]}%</div>
                <Slider
                  value={[weights[cat.key]]}
                  onValueChange={([v]) => {
                    setWeights((w) => {
                      const next = rebalanceWeights(w, cat.key, v);
                      const detected = detectPreset(next);
                      if (detected !== scoringModel) setScoringModel(detected);
                      return next;
                    });
                  }}
                  max={100}
                  step={1}
                  className="[&>span:first-child]:bg-[#eaf0ff] [&>span:first-child]:h-1.5 [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:border-[#174be8] [&_[role=slider]]:bg-white [&>span:first-child_span]:bg-[#174be8]"
                />
                <p className="text-[11px] text-[#8794ab] leading-snug">{cat.description}</p>
                {customCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setOpenSubMetricsFor(cat.key)}
                    className="text-[10px] text-[#174be8] font-medium hover:underline self-start"
                  >
                    +{customCount} custom metric{customCount > 1 ? "s" : ""}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpenSubMetricsFor(cat.key)}
                  className="mt-auto pt-1 inline-flex items-center gap-1 text-[10.5px] font-medium text-[#174be8] hover:underline self-start"
                >
                  <Settings2 size={11} />
                  Configure metrics
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <SubMetricWeightsDrawer
        open={openSubMetricsFor !== null}
        onOpenChange={(o) => { if (!o) setOpenSubMetricsFor(null); }}
        categoryKey={openSubMetricsFor}
        categoryLabel={CATEGORIES.find((c) => c.key === openSubMetricsFor)?.label ?? ""}
        categoryColor={CATEGORIES.find((c) => c.key === openSubMetricsFor)?.color ?? "#174be8"}
        categoryBg={CATEGORIES.find((c) => c.key === openSubMetricsFor)?.bg ?? "#eaf0ff"}
        selectedCityLabel={`${selected.city}, ${selected.state}`}
        rawValuesByKey={rawValuesByKey}
        serverCategoryScore={openSubMetricsFor ? (baseDetailCategoryScores[openSubMetricsFor] ?? null) : null}
        masterWeightPct={openSubMetricsFor ? (appliedTotal > 0 ? (appliedWeights[openSubMetricsFor] / appliedTotal) * 100 : null) : null}
        masterWeightPendingPct={openSubMetricsFor ? ((() => {
          const t = Object.values(weights).reduce((s, v) => s + v, 0);
          return t > 0 ? (weights[openSubMetricsFor] / t) * 100 : null;
        })()) : null}
        currentCategoryScore={openSubMetricsFor ? (detailCategoryScores[openSubMetricsFor] ?? null) : null}
        currentComposite={weightedComposite}
        computeNewComposite={(newCatScore) => {
          if (!openSubMetricsFor || appliedTotal <= 0) return weightedComposite;
          const sum = CATEGORIES.reduce((s, c) => {
            const v = c.key === openSubMetricsFor ? newCatScore : (detailCategoryScores[c.key] ?? 0);
            return s + v * appliedWeights[c.key];
          }, 0);
          return Math.round(sum / appliedTotal);
        }}
        customMetricsForCategory={
          openSubMetricsFor
            ? supabaseCustomCriteria.filter(
                (c) => c.category === (CATEGORIES.find((cc) => cc.key === openSubMetricsFor)?.label ?? ""),
              )
            : []
        }
      />

      {/* AI-powered natural-language search (Lovable AI Gateway) */}
      <AskAiBar
        onSubmit={askAi}
        loading={aiLoading}
        hasResult={aiTurns.length > 0}
        onClear={clearAi}
      />
      {lastAiTurn && (
        <AiAnswerCard
          result={lastAiTurn.response}
          query={lastAiTurn.query}
          turnCount={aiTurns.length}
          onRefine={askAi}
          loading={aiLoading}
        />
      )}

      {/* Filters row */}
      <TooltipProvider delayDuration={150}>

      <div className="mb-4 rounded-lg bg-white border border-[#eef2f7] p-3 flex flex-wrap items-end gap-3">
        {/* Searchable State combobox */}
        <div className="flex flex-col gap-1 min-w-[180px]">
          <label className="text-[11px] text-[#526078]">State</label>
          <Popover open={stateOpen} onOpenChange={setStateOpen}>
            <PopoverTrigger asChild>
              <button
                role="combobox"
                aria-expanded={stateOpen}
                className="h-9 w-full flex items-center justify-between rounded-md border border-[#e5eaf2] bg-white px-3 text-sm text-[#07142f] hover:bg-[#fbfcff]"
              >
                <span className="truncate">{stateFilter === "All" ? "All States" : stateFilter}</span>
                <ChevronsUpDown size={14} className="ml-2 shrink-0 text-[#8794ab]" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[240px]" align="start">
              <Command>
                <CommandInput placeholder="Search state…" className="h-9" />
                <CommandList>
                  <CommandEmpty>No state found.</CommandEmpty>
                  <CommandGroup>
                    {(["All", ...availableStates] as string[]).map((s) => (
                      <CommandItem
                        key={s}
                        value={s}
                        onSelect={() => { setStateFilter(s); setStateOpen(false); }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", stateFilter === s ? "opacity-100" : "opacity-0")} />
                        {s === "All" ? "All States" : s}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* City quick-search */}
        <div className="flex flex-col gap-1 min-w-[180px]">
          <label className="text-[11px] text-[#526078]">City</label>
          <div className="relative h-9">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8794ab]" />
            <Input
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="Search city…"
              className="h-9 pl-8 pr-7 bg-white border-[#e5eaf2] text-sm"
            />
            {cityFilter && (
              <button
                type="button"
                onClick={() => setCityFilter("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8794ab] hover:text-[#07142f]"
                aria-label="Clear city filter"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="text-[11px] text-[#526078] flex items-center gap-1">
            Min Population
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-[#8794ab]"><Info size={11} /></span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[220px] text-xs">Only show cities with population above this threshold.</TooltipContent>
            </Tooltip>
          </label>
          <Select value={minPop} onValueChange={setMinPop}>
            <SelectTrigger className="h-9 bg-white border-[#e5eaf2] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Any</SelectItem>
              <SelectItem value="25000">25,000+</SelectItem>
              <SelectItem value="50000">50,000+</SelectItem>
              <SelectItem value="100000">100,000+</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1 min-w-[180px] flex-1 max-w-[260px]">
          <label className="text-[11px] text-[#526078] flex items-center gap-1">
            Min Score
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-[#8794ab]"><Info size={11} /></span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[220px] text-xs">Only show cities scoring at or above this number (0–100).</TooltipContent>
            </Tooltip>
          </label>
          <div className="flex items-center gap-2 h-9">
            <Slider
              value={[minScore]}
              onValueChange={([v]) => setMinScore(v)}
              max={100}
              step={1}
              className="flex-1 [&>span:first-child]:bg-[#eaf0ff] [&>span:first-child]:h-1.5 [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:border-[#174be8] [&_[role=slider]]:bg-white [&>span:first-child_span]:bg-[#174be8]"
            />
            <span className="text-xs font-medium text-[#07142f] w-7 text-right">{minScore}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1 min-w-[120px]">
          <label className="text-[11px] text-[#526078] flex items-center gap-1">
            Tier
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-[#8794ab]"><Info size={11} /></span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px] text-xs leading-relaxed">
                Cities are auto-ranked into tiers by composite score.
                <br />
                <b>A = Top (85+)</b>, <b>B = Strong (75–84)</b>,{" "}
                <b>C = Moderate (65–74)</b>, <b>D = Weak (below 65)</b>.
                <br />
                Use this to jump straight to your best markets.
              </TooltipContent>
            </Tooltip>
          </label>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="h-9 bg-white border-[#e5eaf2] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="A">A — Top</SelectItem>
              <SelectItem value="B">B — Strong</SelectItem>
              <SelectItem value="C">C — Moderate</SelectItem>
              <SelectItem value="D">D — Weak</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <label className="flex items-center gap-2 h-9 cursor-pointer">
              <Checkbox
                checked={nonRegOnly}
                onCheckedChange={(v) => {
                  const on = !!v;
                  setNonRegOnly(on);
                  if (on) toast.success("Non-registration state filter applied to available sample data.");
                }}
              />
              <span className="text-xs text-[#14233b] whitespace-nowrap inline-flex items-center gap-1">
                Non-Registration States Only
                <Info size={11} className="text-[#8794ab]" />
              </span>
            </label>
          </TooltipTrigger>
          <TooltipContent className="max-w-[280px] text-xs">
            Franchise registration states require extra legal filings. Check this to only see states where you can sell franchises without state registration.
          </TooltipContent>
        </Tooltip>
        <div className="ml-auto h-9 flex items-end">
          <Button
            variant="outline"
            className="h-9 border-[#e5eaf2] text-[#14233b] gap-1.5 font-normal"
            disabled={refreshingMarket}
            onClick={handleRefreshData}
          >
            <RefreshCw size={14} className={refreshingMarket ? "animate-spin" : ""} />
            {refreshingMarket ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>
      </div>
      </TooltipProvider>
      <div className="mb-3 flex items-center gap-1 rounded-lg border border-[#eef2f7] bg-white p-1 w-fit">
        {(["table", "map"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setViewMode(v)}
            className={`px-3 h-7 rounded-md text-[11.5px] font-semibold transition-colors ${
              viewMode === v ? "bg-[#174be8] text-white" : "text-[#526078] hover:bg-[#f3f6fc]"
            }`}
          >
            {v === "table" ? "Table" : "Map"}
          </button>
        ))}
      </div>

      {viewMode === "map" ? (
        <MarketsMap
          markets={filtered}
          onSelect={(m) => {
            setSelectedMarketKey({ city: m.city, state: m.state });
            const sample = sampleCities.find((s) => sameMarket(s.city, s.state, m.city, m.state));
            if (sample) setSelectedId(sample.id);
            setViewMode("table");
          }}
        />
      ) : (
      /* Three-column layout */
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.1fr_1.35fr_0.78fr] items-stretch">
        {/* Left: Ranked Markets */}
        <div className="min-w-0 rounded-lg bg-white border border-[#eef2f7] p-3 flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#07142f]">Ranked Markets</h3>
              <p className="text-[11px] text-[#8794ab]">({filtered.length} markets found)</p>
            </div>
            <div className="flex items-center gap-3">

              <button
                onClick={() => setWatchlistOnly((v) => !v)}
                className={`flex items-center gap-1 text-xs font-medium hover:underline ${watchlistOnly ? "text-[#0ea66e]" : "text-[#526078]"}`}
                title="Show only saved cities"
              >
                {watchlistOnly ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
                Watchlist {watchlistOnly ? "On" : `(${watchlistCityIds.size})`}
              </button>
              {/* Add City hidden until seed-on-demand edge fn is wired (per plan Step 7).
                  Modal code intentionally preserved in AddCityModal.tsx + state below. */}
              <button
                onClick={openCompare}
                disabled={selectedForCompare.length < 2}
                className="flex items-center gap-1 text-xs font-medium text-[#174be8] hover:underline disabled:text-[#8794ab] disabled:no-underline disabled:cursor-not-allowed"
              >
                <GitCompare size={12} /> Compare ({selectedForCompare.length})
              </button>
            </div>
          </div>
          {compareMode && (
            <div className="mb-2 rounded-md bg-[#eaf0ff] border border-[#cfdcff] px-2 py-1.5 text-[11px] text-[#174be8]">
              Compare mode on — select 2 to 4 markets, then click Compare.
            </div>
          )}
          {hasOverrides && (
            <div className="mb-2 rounded-md bg-[#fffbe6] border border-[#fde68a] px-2 py-1.5 text-[11px] text-[#854d0e] flex items-center justify-between gap-2">
              <span>
                <span className="font-semibold">Re-ranked with your weights</span> — this page recomputed
                from your sub-metric edits.
              </span>
              <button
                type="button"
                onClick={() => {
                  resetSubWeights();
                  toast.success("Sub-metric weights reset to defaults");
                }}
                className="font-semibold text-[#174be8] hover:underline whitespace-nowrap"
              >
                Reset to default
              </button>
            </div>
          )}
          <>

          <div className="overflow-hidden flex-1">
            <div className="grid grid-cols-[16px_22px_minmax(0,1fr)_46px_84px_28px_16px] items-center gap-x-2 px-1 py-2 text-[9.5px] uppercase tracking-wide text-[#8794ab] border-b border-[#eef2f7]">
              <span></span>
              <span>Rank</span>
              <span>Market</span>
              <span>Type</span>
              <span>Score</span>
              <span className="text-right">Tier</span>
              <span></span>
            </div>
            {pageItems.length === 0 && watchlistOnly && (
              <div className="px-2 py-8 text-center text-[11px] text-[#8794ab]">
                No saved markets yet — click the bookmark on any city to save it.
              </div>
            )}
            {pageItems.map((c, i) => {
              const isSel = c.city === selectedCity && c.state === selectedState;
              const isCmp = selectedForCompare.includes(c.id);
              const rowCityId = (c as any).cityId as string | undefined;
              const isSaved = !!rowCityId && watchlistCityIds.has(rowCityId);
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    const sample = sampleCities.find((s) => sameMarket(s.city, s.state, c.city, c.state));
                    setSelectedMarketKey({ city: c.city, state: c.state });
                    if (sample) setSelectedId(sample.id);
                    else setSelectedId(c.id);
                  }}
                  className={`grid grid-cols-[16px_22px_minmax(0,1fr)_46px_84px_28px_16px] items-center gap-x-2 px-1 py-3 text-[11px] cursor-pointer border-b border-[#f3f5f9] last:border-0 ${isSel ? "bg-[#eaf0ff]" : "hover:bg-[#f7faff]"}`}
                >
                  <span className={compareMode ? "rounded ring-2 ring-[#174be8] ring-offset-1 ring-offset-white" : ""}>
                    <Checkbox checked={isCmp} onCheckedChange={() => toggleCompare(c.id)} onClick={(e) => e.stopPropagation()} />
                  </span>
                  <span className="text-[#526078]">{pageStart + i + 1}</span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-[#07142f]">{c.city}, {c.state === "Texas" ? "TX" : c.state === "Florida" ? "FL" : c.state}</div>
                    <div className="truncate text-[10px] text-[#8794ab]">{(c as any).county ?? ""}</div>
                  </div>
                  <span className="inline-block self-center w-fit rounded-full bg-[#eaf0ff] text-[#174be8] text-[9.5px] font-medium px-1.5 py-0.5">
                    {(c as any).marketType ?? (c.population > 200000 ? "Urban" : "Suburb")}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {c.hasLiveData ? (
                      <>
                        <span className="text-[#07142f] font-semibold tabular-nums">{c.compositeScore}</span>
                        <div className="h-1.5 flex-1 rounded-full bg-[#eef2f7]">
                          <div className="h-full rounded-full bg-[#0ea66e]" style={{ width: `${c.compositeScore}%` }} />
                        </div>
                      </>
                    ) : (
                      <span className="text-[#8794ab] font-medium">—</span>
                    )}
                  </div>
                  {c.hasLiveData ? (
                    <span className="justify-self-end">
                      <TierBadge
                        tier={c.tier}
                        compact
                        score={c.compositeScore}
                        percentile={percentileById.get(c.id)}
                      />
                    </span>
                  ) : (
                    <span className="justify-self-end rounded-full bg-[#eef2f7] px-1.5 py-0.5 text-[8.5px] font-semibold text-[#8794ab] whitespace-nowrap">No data</span>
                  )}
                  {rowCityId ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleWatchlist(rowCityId); }}
                      className={`justify-self-end p-0.5 rounded hover:bg-white ${isSaved ? "text-[#0ea66e]" : "text-[#cbd5e1] hover:text-[#526078]"}`}
                      title={isSaved ? "Remove from watchlist" : "Add to watchlist"}
                      aria-label={isSaved ? "Remove from watchlist" : "Add to watchlist"}
                    >
                      {isSaved ? <BookmarkCheck size={12} fill="currentColor" /> : <Bookmark size={12} />}
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[#8794ab]">
            <span>Showing {showingFrom} to {showingTo} of {filtered.length} results</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-1.5 h-6 rounded border border-[#eef2f7] text-[#526078] disabled:opacity-40 disabled:cursor-not-allowed"
              >‹</button>
              {pageNumbers.map((p, idx) =>
                p === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-[#8794ab]">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`px-2 h-6 rounded font-medium ${p === safePage ? "bg-[#174be8] text-white" : "border border-[#eef2f7] text-[#14233b] hover:bg-[#f3f6fc]"}`}
                  >{p}</button>
                )
              )}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-1.5 h-6 rounded border border-[#eef2f7] text-[#526078] disabled:opacity-40 disabled:cursor-not-allowed"
              >›</button>
            </div>
          </div>
          </>

        </div>

        {/* Center: Selected Market Detail */}
        <div className="min-w-0 rounded-lg bg-white border border-[#eef2f7] p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[18px] leading-none font-bold text-[#07142f]">{selected.city}, {selected.state === "Texas" ? "TX" : selected.state === "Florida" ? "FL" : selected.state}</h2>
              {SHOW_LIVE_REFRESH && (lastScrapedRelative ? (
                <span
                  title={lastScrapedAbsolute ?? ""}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isStale ? "bg-[#fff1e6] text-[#c2410c]" : "bg-[#e6f7ef] text-[#0ea66e]"}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isStale ? "bg-[#ea580c]" : "bg-[#0ea66e]"}`} />
                  Live data refreshed {lastScrapedRelative}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#eef2f7] px-2 py-0.5 text-[10px] font-semibold text-[#526078]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8794ab]" />
                  No live data yet
                </span>
              ))}
            </div>
            {(() => {
              const detailCityId = selected.cityId as string | undefined;
              const isSaved = !!detailCityId && watchlistCityIds.has(detailCityId);
              return (
                <button
                  type="button"
                  onClick={() => toggleWatchlist(detailCityId)}
                  disabled={!detailCityId}
                  title={!detailCityId ? "Refresh this city's data first" : isSaved ? "Remove from watchlist" : "Add to watchlist"}
                  className={`flex items-center gap-1 text-[11px] font-medium hover:underline whitespace-nowrap disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed ${isSaved ? "text-[#0ea66e]" : "text-[#174be8]"}`}
                >
                  {isSaved ? <BookmarkCheck size={12} fill="currentColor" /> : <Bookmark size={12} />}
                  {isSaved ? "Saved to Watchlist" : "Add to Watchlist"}
                </button>
              );
            })()}
          </div>


          <div className="grid grid-cols-[150px_1fr] gap-3 items-start">
            <div className="flex flex-col items-center text-center pt-1">
              <p className="mb-1.5 text-[12px] font-semibold text-[#3a4c72]">Overall Score</p>
              <svg viewBox="0 0 200 120" className="h-[100px] w-[150px] max-w-full">
                <path d="M25 92 A75 75 0 0 1 175 92" fill="none" stroke="#e7ebf3" strokeWidth="14" strokeLinecap="round" />
                {selectedHasLiveData && (
                  <path
                    d="M25 92 A75 75 0 0 1 175 92"
                    fill="none"
                    stroke="#0ea66e"
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray={`${(weightedComposite / 100) * 236} 236`}
                  />
                )}
                <text x="100" y="76" textAnchor="middle" className="fill-[#07142f]" style={{ fontSize: 32, fontWeight: 800 }}>{selectedHasLiveData ? weightedComposite : "—"}</text>
                <text x="100" y="102" textAnchor="middle" className="fill-[#7e8aa3]" style={{ fontSize: 12, fontWeight: 600 }}>/100</text>
              </svg>
              <p className="-mt-1 text-[12px] font-semibold" style={{ color: selectedHasLiveData ? tierBadge.fg : "#8794ab" }}>{selectedHasLiveData ? opportunityLabel : "No live data"}</p>
              {selectedHasLiveData && (() => {
                // Rank by CONTRIBUTION = score × applied master weight, so
                // categories the user weighted to 0% never count as drivers.
                const enriched = CATEGORIES.map((c) => {
                  const score = Math.round(detailCategoryScores[c.key] ?? 0);
                  const weight = appliedWeights[c.key] ?? 0;
                  return { label: c.label, score, weight, contribution: score * weight };
                }).filter((x) => x.weight > 0);
                if (enriched.length === 0) return null;
                const sorted = [...enriched].sort((a, b) => b.contribution - a.contribution);
                const drivers = sorted.slice(0, Math.min(2, sorted.length));
                const lowest = [...enriched].sort((a, b) => a.score - b.score)[0];
                const showDrag = enriched.length > 1 && lowest.score < 50 && !drivers.some((d) => d.label === lowest.label);
                const driverText = drivers.length === 1
                  ? `${drivers[0].label} (${drivers[0].score}) is driving this score.`
                  : `${drivers[0].label} (${drivers[0].score}) and ${drivers[1].label} (${drivers[1].score}) are driving this score.`;
                return (
                  <div className="mt-1.5 px-1 text-center text-[10.5px] italic leading-snug text-[#6b7a99] max-w-[180px]">
                    <p>{driverText}</p>
                    {showDrag && (
                      <p className="mt-0.5">{lowest.label} ({lowest.score}) is pulling the score down.</p>
                    )}
                  </div>
                );
              })()}
              {selectedHasLiveData ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="mt-1 text-[11px] font-medium text-[#174be8] hover:underline"
                      aria-label="Show overall score formula"
                    >
                      <span className="font-mono italic mr-0.5">ƒx</span> Show formula
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    side="bottom"
                    className="w-[360px] p-3"
                  >
                    <div className="mb-2">
                      <p className="text-[12px] font-semibold text-[#07142f]">{selected.city}, {selected.state}</p>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#526078]">Overall Score breakdown</p>
                    </div>
                    {(() => {
                      const total = appliedTotal > 0 ? appliedTotal : 1;
                      const rows = CATEGORIES.map((c) => {
                        const weightPct = (appliedWeights[c.key] / total) * 100;
                        const score = detailCategoryScores[c.key] ?? 0;
                        const contribution = (weightPct * score) / 100;
                        return { key: c.key, label: c.label, weightPct, score, contribution };
                      });
                      const sumContribution = rows.reduce((s, r) => s + r.contribution, 0);
                      return (
                        <>
                          <div className="rounded border border-[#eef2f7] overflow-hidden">
                            <table className="w-full text-[11px] font-mono">
                              <thead className="bg-[#fafbfd] text-[#526078]">
                                <tr>
                                  <th className="text-left px-2 py-1.5 font-medium">Category</th>
                                  <th className="text-right px-2 py-1.5 font-medium">Weight</th>
                                  <th className="text-right px-2 py-1.5 font-medium">Score</th>
                                  <th className="text-right px-2 py-1.5 font-medium">Contribution</th>
                                </tr>
                              </thead>
                              <tbody className="text-[#1a2540]">
                                {rows.map((r) => (
                                  <tr key={r.key} className="border-t border-[#eef2f7]">
                                    <td className="text-left px-2 py-1.5">{r.label}</td>
                                    <td className="text-right px-2 py-1.5 tabular-nums">{r.weightPct.toFixed(1)}%</td>
                                    <td className="text-right px-2 py-1.5 tabular-nums">{Math.round(r.score)}</td>
                                    <td className="text-right px-2 py-1.5 tabular-nums">{r.contribution.toFixed(1)}</td>
                                  </tr>
                                ))}
                                <tr className="border-t-2 border-[#c5cdda] bg-[#fafbfd] font-bold">
                                  <td className="text-left px-2 py-1.5" colSpan={2}>Overall Score</td>
                                  <td className="text-right px-2 py-1.5 tabular-nums text-[#526078]" title={`Σ contributions = ${sumContribution.toFixed(1)}`}>=</td>
                                  <td className="text-right px-2 py-1.5 tabular-nums text-[#07142f]">{weightedComposite}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <p className="text-[11px] text-[#526078] mt-2 leading-snug">
                            Formula: Overall Score = Σ (master weight % × category score)
                          </p>
                          {Math.abs(appliedTotal - 100) > 0.5 && (
                            <p className="text-[10.5px] text-[#8794ab] mt-1 leading-snug italic">
                              Master weights are normalized to sum to 100% before scoring.
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </PopoverContent>
                </Popover>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-1 text-[11px] font-medium text-[#8794ab] opacity-60 cursor-not-allowed"
                  aria-label="Show overall score formula (no live data)"
                >
                  <span className="font-mono italic mr-0.5">ƒx</span> Show formula
                </button>
              )}
            </div>

            <div className="space-y-2.5 pt-1 min-w-0">
              <div className="text-[11px] space-y-1.5 min-w-0">
                <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-[#6b7a96]">Tier</span>
                    {selectedHasLiveData ? (
                      <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold leading-tight" style={{ backgroundColor: tierBadge.bg, color: tierBadge.fg }}>{tierBadge.label}</span>
                    ) : (
                      <span className="rounded-full bg-[#eef2f7] px-2 py-0.5 text-[10.5px] font-semibold leading-tight text-[#8794ab]">No data</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#6b7a96]">Market Type</span>
                    <span className="rounded-full bg-[#eef3ff] px-2 py-0.5 text-[10.5px] font-medium leading-tight text-[#174be8]">{displayMarketType}</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[#6b7a96] w-[78px] flex-shrink-0">Metro Area</span>
                  <span className="font-semibold text-[#07142f]">{displayMetroArea}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[#6b7a96] w-[78px] flex-shrink-0">County</span>
                  <span className="font-semibold text-[#07142f]">{displayCounty}</span>
                </div>
              </div>

              {selectedLiveCity?.notes && (
                <div>
                  <p className="mb-0.5 text-[12px] font-semibold text-[#3a4c72]">Market Summary</p>
                  <p className="text-[11.5px] leading-snug text-[#14233b]">{selectedLiveCity.notes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[1fr_1.08fr] gap-5 border-t border-[#eef2f7] pt-3.5">
            <div>
              <p className="mb-2.5 text-[13px] font-semibold text-[#07142f]">Category Scores</p>
              <div className="space-y-2">
                {CATEGORIES.map((cat) => {
                  const v = selectedHasLiveData ? (detailCategoryScores[cat.key] ?? 0) : null;
                  return (
                    <div key={cat.key}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-[12px]">
                        <span className="text-[#526078]">{cat.label}</span>
                        <span className="font-semibold text-[#07142f]">{v ?? "—"}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#e8edf6]">
                        <div className="h-full rounded-full bg-[#1d4fff]" style={{ width: `${v ?? 0}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="min-w-0 border-l border-[#eef2f7] pl-4">
              <p className="mb-2.5 text-[13px] font-semibold text-[#07142f]">Key Market Signals</p>
              {hasLiveSignals ? (
                <>
                  <div className="flex flex-col gap-y-2.5 min-w-0">
                    {sigRows.map((r) => {
                      const Icon = r.icon;
                      return (
                        <div key={r.label} className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2 text-[10.5px]">
                          <Icon size={15} className="text-[#174be8]" />
                          <span className="min-w-0 truncate text-[#526078]">{r.label}</span>
                          <span className="max-w-[120px] truncate text-right font-bold text-[#07142f]">{r.value}</span>
                        </div>
                      );
                    })}
                  </div>
                  {hasMoreSignals && (
                    <button
                      type="button"
                      onClick={() => setDetailDrawerOpen(true)}
                      className="mt-2 inline-flex items-center gap-1 rounded-md border border-[#dbe4f2] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#174be8] hover:bg-[#f1f5ff]"
                    >
                      View all {signalsForDisplay.length} signals →
                    </button>
                  )}
                </>
              ) : SHOW_LIVE_REFRESH ? (
                <div className="rounded-md border border-dashed border-[#dbe4f2] bg-[#f7faff] px-3 py-4 text-center">
                  <p className="text-[11.5px] text-[#526078] leading-snug">
                    No live signals yet for this market.
                  </p>
                  <button
                    type="button"
                    onClick={handleRefreshData}
                    disabled={refreshingMarket}
                    className="mt-2 inline-flex items-center gap-1 rounded-md bg-[#174be8] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#1240c9] disabled:opacity-60"
                  >
                    {refreshingMarket ? "Refreshing…" : "Refresh This Market"}
                  </button>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-[#dbe4f2] bg-[#f7faff] px-3 py-4 text-center">
                  <p className="text-[11.5px] text-[#526078] leading-snug">
                    Showing pre-seeded scores. Live signal scraping is paused.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={handleFindTeachers} className="h-9 flex-1 min-w-0 bg-[#174be8] hover:bg-[#1240c9] text-white gap-1.5 px-3 font-medium text-[11px]">
              <span className="truncate">Find Teachers in This Market</span> <ArrowRight size={12} className="flex-shrink-0" />
            </Button>
            <Button variant="outline" onClick={openCompare} className="h-9 min-w-0 border-[#dbe4f2] text-[#2250eb] gap-1 px-2.5 font-medium text-[11px]">
              <GitCompare size={12} /> Compare
            </Button>
            <Button variant="outline" onClick={() => setReportOpen(true)} className="h-9 min-w-0 border-[#dbe4f2] text-[#2250eb] gap-1 px-2.5 font-medium text-[11px]">
              <FileText size={12} /> Report
            </Button>
            <Button variant="outline" className="h-9 min-w-0 border-[#dbe4f2] text-[#2250eb] gap-1 px-2.5 font-medium text-[11px]" onClick={() => setDetailDrawerOpen(true)}>
              <Eye size={12} /> Details
            </Button>
          </div>
        </div>

        {/* Right column */}
        <div className="min-w-0 space-y-3 flex flex-col">
          {SHOW_LIVE_REFRESH && (
            <SourceDataPanel
              cityId={liveCity?.id ?? null}
              refreshKey={marketRefreshVersion}
              onViewEvidence={() => setDetailDrawerOpen(true)}
            />
          )}

          <div className="rounded-lg bg-white border border-[#eef2f7] p-3">
            <h4 className="text-xs font-bold text-[#07142f] mb-1">Market Research Report</h4>
            <p className="text-[10px] text-[#8794ab] mb-2">Comprehensive PDF report with data, insights, recommendations, and competitor analysis.</p>
            <Button variant="outline" className="w-full h-8 border-[#dbe4f2] text-[#2250eb] text-[11px] font-medium" onClick={() => { setReportAutoPdf(true); setReportOpen(true); }}>
              Generate PDF Report
            </Button>
          </div>

          <NearbyMarketsPanel
            cityId={selected.cityId ?? null}
            state={selectedState}
            metroArea={selectedLiveCity?.metro_area ?? (selected as any).metroArea ?? null}
            refreshKey={marketRefreshVersion}
            onSelect={(m) => {
              setSelectedMarketKey({ city: m.city, state: m.state });
              const sample = sampleCities.find((s) => sameMarket(s.city, s.state, m.city, m.state));
              if (sample) setSelectedId(sample.id);
            }}
          />
        </div>
      </div>
      )}

      <AddCriteriaDrawer
        open={addCritOpen}
        onClose={() => setAddCritOpen(false)}
      />

      <MarketDetailDrawer
        market={selected}
        refreshVersion={marketRefreshVersion}
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        categoryScores={detailCategoryScores}
        customCriteria={customCriteria}
        onFindTeachers={() => { setDetailDrawerOpen(false); handleFindTeachers(); }}
        onGenerateReport={() => { setDetailDrawerOpen(false); setReportOpen(true); }}
        onExport={buildCsvDownload}
      />

      <MarketCompareModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        markets={baseRankedMarkets.filter((m) => selectedForCompare.includes(m.id)).slice(0, 4)}
      />

      <MarketReportModal
        open={reportOpen}
        onClose={() => { setReportOpen(false); setReportAutoPdf(false); }}
        market={selected}
        categoryScores={detailCategoryScores}
        refreshVersion={marketRefreshVersion}
        autoDownload={reportAutoPdf}
      />

      <Dialog open={saveSearchOpen} onOpenChange={setSaveSearchOpen}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#07142f]">Save Search</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#526078]">Name</label>
            <Input
              autoFocus
              value={saveSearchName}
              maxLength={60}
              placeholder="e.g. High-income TX suburbs"
              onChange={(e) => setSaveSearchName(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={(e) => { if (e.key === "Enter" && !savingSearch) handleSaveSearch(); }}
            />
            <p className="text-[10px] text-[#8794ab]">Saves your current master + sub-metric weights.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSaveSearchOpen(false)} disabled={savingSearch}>Cancel</Button>
            <Button className="bg-[#174be8] hover:bg-[#1240c9] text-white" onClick={handleSaveSearch} disabled={savingSearch || !saveSearchName.trim()}>
              {savingSearch ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddCityModal
        open={addCityOpen}
        onClose={() => setAddCityOpen(false)}
        onAdded={async (city, state) => {
          await reloadSelectedMarketView(city, state);
          setSelectedMarketKey({ city, state });
        }}
      />
    </div>
  );
};

export default CityScoring;
