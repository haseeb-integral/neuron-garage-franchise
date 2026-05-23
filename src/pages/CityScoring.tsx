// Rule 12 (AGENTS.md): every UI surface in this file routes through
// `selectedView` / `buildMarketView()` for displayed composites. The raw
// `.compositeScore` reads that remain below are data-shaping (sorts,
// reductions, and the `selected` builder that *feeds* `selectedView`) and
// are deliberate. Drift is still caught at runtime by `assertNoCompositeDrift`.
// New rendered composite values must go through marketView — do not add raw reads.
/* eslint-disable no-restricted-syntax */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import CitySpreadsheetView from "@/components/city-scoring/CitySpreadsheetView";
import { SourceDataPanel } from "@/components/city-scoring/SourceDataPanel";
// NearbyMarketsPanel removed from /city-scoring 2026-05-21 (its slot now hosts Key Market Signals).
import { MarketsMap } from "@/components/city-scoring/MarketsMap";
import { TierBadge } from "@/components/city-scoring/TierBadge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  loadLiveRankedMarkets,
  filterRankedMarkets,
  
  downloadRankedMarketsCsv,
  buildSeededFallbackSignalsFromScored,
  mergeSignalsPreferLive,
  type RankedMarket,
} from "@/lib/cityScoringLiveData";
import { useCityScoringStore, DEFAULT_WEIGHTS } from "@/stores/cityScoringStore";
import { DEFAULT_SUB_WEIGHTS, SOW_METRIC_REGISTRY } from "@/lib/sowMetricRegistry";
import { SubMetricWeightsDrawer } from "@/components/city-scoring/SubMetricWeightsDrawer";
import { getCached, setCached } from "@/lib/pageCache";
import { Settings2 } from "lucide-react";
import { METRICS_BY_CATEGORY } from "@/lib/sowMetricRegistry";
import { parseSignalValue } from "@/lib/sowNormalize";
import { recomputeCategoryScore, recomputeComposite } from "@/lib/clientSubWeightScoring";
import { tierFromScore } from "@/lib/cityScoringLiveData";
import { assignPercentileTiers as _assignPercentileTiers, percentileTierCutoffs as _percentileTierCutoffs, type TierLetter as _TierLetter } from "@/lib/cityTiers";
import { canonicalKey } from "@/lib/signalAliases";
import { useCustomCriteria } from "@/hooks/useCustomCriteria";
import { useMarketSelection } from "@/hooks/useMarketSelection";
import { useScoringConfig, useDebouncedSaveScoringConfig } from "@/hooks/useScoringConfig";
import { SCORING_PRESETS, PRESET_NAMES, PRESET_DESCRIPTIONS, PRESET_TAGLINES, PRESET_TILE_ORDER, detectPreset, type PresetName } from "@/lib/scoringPresets";
import { AskAiBar } from "@/components/city-scoring/AskAiBar";
import { AiAnswerCard, type AiResult } from "@/components/city-scoring/AiAnswerCard";
import { TierCountsBar, type TierCounts } from "@/components/city-scoring/TierCountsBar";
import { PreviewBadge } from "@/components/city-scoring/PreviewBadge";
import { RowScorePopover } from "@/components/city-scoring/RowScorePopover";
import {
  buildMarketView,
  beginDriftRender,
  assertNoCompositeDrift,
  weightsHash as buildWeightsHash,
  type MarketView,
} from "@/lib/marketView";


// Feature flag: hide live on-demand API widgets on the detail panel.
// Per May 18 Brett note + Haseeb decision: detail panel reads pre-seeded
// data only; refresh/scrape widgets stay in code but are hidden.
const SHOW_LIVE_REFRESH = false;

type CategoryKey =
  | "demand"
  | "competitiveLandscape"
  | "franchiseeSupply";

// Page-level constants/helpers moved to lib/cityScoringPageHelpers.ts.
// Re-exported as local aliases so the rest of this giant page file keeps
// compiling unchanged until the column-split refactor lands.
import {
  CATEGORIES,
  VISIBLE_CATEGORIES,
  SOURCES,
  normalizeMarketState,
  sameMarket,
  categoryScoresFromSample as categoryScores,
  rebalanceWeights,
  countLiveTiers,
  type Category,
} from "@/lib/cityScoringPageHelpers";
void VISIBLE_CATEGORIES; void SOURCES; void CATEGORIES;
void normalizeMarketState; void sameMarket; void categoryScores;

type TierLetter = _TierLetter;
const percentileTierCutoffs = _percentileTierCutoffs;
const assignPercentileTiers = _assignPercentileTiers;

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
  const [screenMode, setScreenMode] = useState<"dashboard" | "spreadsheet">(() => {
    if (typeof window === "undefined") return "dashboard";
    return (window.localStorage.getItem("citySearch.screenMode") as any) === "spreadsheet"
      ? "spreadsheet"
      : "dashboard";
  });
  const updateScreenMode = (m: "dashboard" | "spreadsheet") => {
    setScreenMode(m);
    try { window.localStorage.setItem("citySearch.screenMode", m); } catch {}
  };
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

  // Preset clicks snap weights instantly (no tween) to avoid page jitter from
  // rapid 60fps re-renders. The active-tile ring + slider repositioning provides
  // the cause→effect cue without any animation.
  const presetTweenRef = useRef<number | null>(null);
  const presetTweening = false;

  const applyPresetByName = useCallback((name: Exclude<PresetName, "Custom">) => {
    const target = SCORING_PRESETS[name];
    if (scoringModel === "Custom") {
      setCustomWeightsSnapshot({ ...appliedWeights });
    }
    setActiveSavedSearchId(null);
    setScoringModel(name);
    // Snap weights directly — the previous rAF tween caused visible page jitter
    // (rapid re-renders + animate-pulse on the connector chevron). The active-tile
    // ring + slider position change is enough to communicate cause→effect.
    setWeights(target);
    setAppliedWeights(target);
  }, [scoringModel, appliedWeights, setWeights, setAppliedWeights, setScoringModel]);


  // URL ⇄ preset sync. On mount: ?preset=Quick+Launch (or hyphenated) applies
  // the preset. On change: mirror the active preset back to the URL so the
  // full view is shareable. "Custom" / "Balanced" stay implicit so the URL
  // stays clean in the default case.
  const presetHydratedRef = useRef(false);
  useEffect(() => {
    if (presetHydratedRef.current) return;
    presetHydratedRef.current = true;
    const raw = searchParams.get("preset");
    if (!raw) return;
    const decoded = decodeURIComponent(raw).replace(/-/g, " ");
    const match = (PRESET_NAMES as string[]).find(
      (n) => n.toLowerCase() === decoded.toLowerCase() && n !== "Custom",
    ) as Exclude<PresetName, "Custom"> | undefined;
    if (match) applyPresetByName(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (scoringModel && scoringModel !== "Custom" && scoringModel !== "Balanced") {
      next.set("preset", scoringModel.replace(/\s+/g, "-"));
    } else {
      next.delete("preset");
    }
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoringModel]);

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

      // Apply weights — absolute mode sets sliders to exactly what user asked;
      // delta mode keeps the old nudge + dominant-detection behavior.
      const mode = (result as any).weightMode === "absolute" ? "absolute" : "delta";
      const abs = (result as any).absoluteWeights ?? {};
      const adj = result.weightAdjustments ?? {};
      const adjEntries = (Object.entries(adj) as [CategoryKey, number][])
        .filter(([, v]) => Number(v) !== 0);

      if (mode === "absolute") {
        setScoringModel("Custom");
        setActiveSavedSearchId(null);
        setWeights((prev) => {
          const keys = Object.keys(prev) as CategoryKey[];
          const next = { ...prev } as Record<CategoryKey, number>;
          keys.forEach((k) => {
            const v = Number(abs[k]);
            next[k] = Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 0;
          });
          setAppliedWeights(next);
          setCustomWeightsSnapshot({ ...next });
          return next;
        });
        toast.success("AI set your category weights exactly as requested.");
      } else if (adjEntries.length > 0) {
        setScoringModel("Custom");
        setActiveSavedSearchId(null);
        setWeights((prev) => {
          const keys = Object.keys(prev) as CategoryKey[];
          // Single-category dominant intent ("rank by demand", "focus on pricing power")
          // should produce a clearly dominant slider, not a 17% nudge. Detect by:
          //   - exactly one positive nudge AND any others are zero or negative.
          const positives = adjEntries.filter(([, v]) => v > 0);
          const isDominant = positives.length === 1
            && adjEntries.every(([k, v]) => (k === positives[0][0] ? v > 0 : v <= 0));

          let next = { ...prev } as Record<CategoryKey, number>;
          if (isDominant) {
            const dom = positives[0][0];
            const others = keys.filter((k) => k !== dom);
            const remainder = 40;
            const each = Math.floor(remainder / others.length);
            others.forEach((k) => { next[k] = each; });
            next[dom] = 100 - each * others.length;
          } else {
            // Additive nudge path (multi-category intents) — preserve existing behavior.
            adjEntries.forEach(([k, v]) => {
              if (next[k] != null) next[k] = Math.max(0, Math.min(100, (next[k] ?? 0) + v));
            });
            const sum = Object.values(next).reduce((s, v) => s + v, 0) || 1;
            keys.forEach((k) => { next[k] = Math.round((next[k] / sum) * 100); });
            let diff = 100 - Object.values(next).reduce((s, v) => s + v, 0);
            for (let i = 0; diff !== 0 && i < 6; i++) {
              const k = keys[i % keys.length];
              const step = diff > 0 ? 1 : -1;
              if (next[k] + step >= 0) { next[k] += step; diff -= step; }
            }
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
  const selectedMarketKey = useCityScoringStore((s) => s.selectedMarketKey);
  const selectedForCompare = useCityScoringStore((s) => s.selectedForCompare);
  const setSelectedForCompare = useCityScoringStore((s) => s.setSelectedForCompare);
  const [refreshingMarket, setRefreshingMarket] = useState(false);
  const PAGE_SIZE = 15;
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
  const [execReportOpen, setExecReportOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportAutoPdf, setReportAutoPdf] = useState(false);
  const [addCityOpen, setAddCityOpen] = useState(false);
  const viewMode = useCityScoringStore((s) => s.viewMode);
  const setViewMode = useCityScoringStore((s) => s.setViewMode);

  // (URL deep-link hydration moved into useMarketSelection.)

  // Load live ranked markets from Supabase once on mount
  useEffect(() => {
    loadLiveRankedMarkets()
      .then(setLiveRankedMarkets)
      .catch((err) => console.error("loadLiveRankedMarkets error", err));
  }, []);

  const baseRankedMarkets = useMemo<RankedMarket[]>(
    // Single source of truth: us_cities_scored. No sample fallback — if the
    // seeded list hasn't loaded yet, the list is empty (loading state) rather
    // than showing mock cities that don't exist in the backend.
    () => liveRankedMarkets,
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

  const rerankedUniverse = useMemo(() => {
    // Mark the start of a render pass for the dev-only composite-drift detector.
    // Any (cityId, weightsHash) → composite logged twice with different values
    // in the same pass throws a red error in dev. See src/lib/marketView.ts.
    beginDriftRender();
    const wHash = buildWeightsHash(appliedWeights, appliedSubWeights);

    const masterWeightsAreDefault = JSON.stringify(appliedWeights) === JSON.stringify(DEFAULT_WEIGHTS);
    const subWeightsAreDefault = JSON.stringify(appliedSubWeights) === JSON.stringify(DEFAULT_SUB_WEIGHTS);
    const reRanked = baseRankedMarkets.map((market) => {
      if (!market.hasLiveData || !market.categoryScores) return market;
      if (masterWeightsAreDefault && subWeightsAreDefault) return market;

      let cats: Record<CategoryKey, number | null>;

      if (subWeightsAreDefault) {
        // User only touched the master sliders — keep the server's category
        // scores verbatim (so a city with score_demand=100 stays at 100 when
        // demand is weighted up). Recomputing from raw sub-signals here would
        // suppress legitimate Tier A markets.
        cats = { ...market.categoryScores } as Record<CategoryKey, number | null>;
      } else {
        const seededSignalValues = Object.fromEntries(
          buildSeededFallbackSignalsFromScored(market.scoredRow).map((signal) => [
            signal.signal_key,
            parseSignalValue(signal.value),
          ]),
        );
        cats = {} as Record<CategoryKey, number | null>;
        (Object.keys(METRICS_BY_CATEGORY) as CategoryKey[]).forEach((key) => {
          cats[key] = recomputeCategoryScore(
            METRICS_BY_CATEGORY[key] ?? [],
            seededSignalValues,
            appliedSubWeights[key] ?? {},
            market.categoryScores?.[key] ?? null,
          ).score;
        });
      }

      const { composite } = recomputeComposite(cats, appliedWeights);
      return {
        ...market,
        compositeScore: composite,
      };
    });

    const tiered = assignPercentileTiers(reRanked);

    // Attach a frozen MarketView to every row. This is the single object the
    // UI is supposed to read for composite/tier/formatted strings. Tagging it
    // here means table + drawer + gauge + CSV + exports all consume the same
    // view, and the drift detector watches every mint.
    return tiered.map((m: any) => ({
      ...m,
      view: assertNoCompositeDrift(buildMarketView(m), wHash),
    }));
  }, [baseRankedMarkets, appliedWeights, appliedSubWeights]);

  const filtered = useMemo(() => {
    const base = filterRankedMarkets(rerankedUniverse, {
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
    return out.sort((a, b) => {
      if (a.hasLiveData !== b.hasLiveData) return a.hasLiveData ? -1 : 1;
      if (a.hasLiveData) return b.compositeScore - a.compositeScore;
      return a.city.localeCompare(b.city);
    });
  }, [rerankedUniverse, searchTerm, stateFilter, tierFilter, nonRegOnly, minScore, minPop, cityFilter, watchlistOnly, watchlistCityIds]);


  // ─── Tier counts (committed) + preview projection (draft weights) ──────
  // SINGLE-SOURCE-OF-TRUTH RULE: committed numbers come from `filtered`
  // (what the table renders). Preview is a cheap projection — composite
  // recomputed with the draft `weights` on every market that has live
  // category scores. Pure read, no sort, no render.
  const weightsPending = useMemo(
    () => JSON.stringify(weights) !== JSON.stringify(appliedWeights),
    [weights, appliedWeights],
  );
  const committedTierCounts = useMemo<TierCounts>(() => {
    return countLiveTiers(rerankedUniverse);
  }, [rerankedUniverse]);
  const liveScoredTotal = useMemo(
    () => rerankedUniverse.filter((m: any) => m.hasLiveData).length,
    [rerankedUniverse],
  );
  const filteredLiveCount = useMemo(
    () => filtered.filter((m: any) => m.hasLiveData).length,
    [filtered],
  );
  const previewTierCounts = useMemo<TierCounts | null>(() => {
    if (!weightsPending) return null;
    const previewUniverse = baseRankedMarkets.map((m: any) => {
      if (!m.hasLiveData) return m;
      const cats = m.categoryScores as Record<CategoryKey, number | null> | undefined;
      if (cats) {
        const { composite } = recomputeComposite(cats, weights);
        return { ...m, compositeScore: composite };
      }
      return { ...m, compositeScore: m.compositeScore ?? 0 };
    });
    return countLiveTiers(assignPercentileTiers(previewUniverse));
  }, [baseRankedMarkets, weights, weightsPending]);


  // Extra summary stats for the Tier Distribution strip (avg score, qualified %, top market).
  const tierBarExtras = useMemo(() => {
    const live = rerankedUniverse.filter((m: any) => m.hasLiveData);
    const n = live.length;
    if (n === 0) {
      return { avgScore: null, avgScorePreview: null, qualifiedPct: null, qualifiedPctPreview: null, topMarkets: [] };
    }
    const sum = live.reduce((s: number, m: any) => s + Number(m.compositeScore ?? 0), 0);
    const avgScore = sum / n;
    const ab = (committedTierCounts.A ?? 0) + (committedTierCounts.B ?? 0);
    const qualifiedPct = (ab / n) * 100;

    let previewAvg: number | null = null;
    let previewQualPct: number | null = null;
    if (weightsPending) {
      let pSum = 0;
      live.forEach((m: any) => {
        const cats = m.categoryScores as Record<CategoryKey, number | null> | undefined;
        if (cats) {
          const { composite } = recomputeComposite(cats, weights);
          pSum += composite;
        } else {
          pSum += Number(m.compositeScore ?? 0);
        }
      });
      previewAvg = pSum / n;
      if (previewTierCounts) {
        previewQualPct = ((previewTierCounts.A + previewTierCounts.B) / n) * 100;
      }
    }

    const topMarkets = [...live]
      .sort((a: any, b: any) => buildMarketView(b).composite - buildMarketView(a).composite)
      .slice(0, 12)
      .map((m: any) => ({
        label: `${m.city}, ${m.state}`,
        score: buildMarketView(m).composite,
      }));


    return {
      avgScore,
      avgScorePreview: previewAvg,
      qualifiedPct,
      qualifiedPctPreview: previewQualPct,
      topMarkets,
    };
  }, [rerankedUniverse, committedTierCounts, previewTierCounts, weights, weightsPending]);

  // Markets shown on the map: same filters as the table EXCEPT we ignore the
  // Tier dropdown and Min Score slider, so picking a state (e.g. Alabama) that
  // has no Tier A/B cities still plots its Tier C markets instead of going blank.
  const mapMarkets = useMemo(() => {
    const base = filterRankedMarkets(baseRankedMarkets, {
      searchTerm,
      stateFilter,
      tierFilter: "All",
      nonRegOnly,
      minScore: 0,
      minPop,
    });
    const q = cityFilter.trim().toLowerCase();
    let out = q ? base.filter((m: any) => String(m.city ?? "").toLowerCase().includes(q)) : base;
    if (watchlistOnly) {
      out = out.filter((m: any) => m.cityId && watchlistCityIds.has(m.cityId));
    }
    return out;
  }, [baseRankedMarkets, searchTerm, stateFilter, nonRegOnly, minPop, cityFilter, watchlistOnly, watchlistCityIds]);


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
      // Legacy `city_market_signals` was severed on 2026-05-21.
      // Per-city signal values now come from the scored row's seeded fallback,
      // which already mirrors every signal_key used by the scoring registry.
      const DB_TO_UI: Record<string, CategoryKey> = {
        demand: "demand",
        competitive_landscape: "competitiveLandscape",
        franchisee_supply: "franchiseeSupply",
      };

      const sigByCity: Record<string, Record<string, number | null>> = {};
      rawPageItems.forEach((m: any) => {
        if (!m?.cityId || !m?.scoredRow) return;
        const seeded = buildSeededFallbackSignalsFromScored(m.scoredRow);
        const row: Record<string, number | null> = {};
        seeded.forEach((s) => {
          row[s.signal_key] = parseSignalValue(s.value as any);
        });
        sigByCity[m.cityId] = row;
      });
      const scoresByCity: Record<string, Partial<Record<CategoryKey, number>>> = {};
      // DB_TO_UI retained for future server-side category scores; currently unused.
      void DB_TO_UI;
      if (cancelled) return;


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

  // Selection + auto-follow + URL deep-linking. The hook owns the
  // "snap right-side columns to #1 until the user clicks" behavior and
  // keeps ?city=&state= in the URL so any view is shareable.
  const topRanked = filtered[0];
  const {
    effectiveMarketKey,
    autoFollowTop,
    userPickedMarket,
    pickMarket,
  } = useMarketSelection({ topRanked, appliedWeights, appliedSubWeights });
  void autoFollowTop; void userPickedMarket; // exposed for future use (debug strip / tests)

  const selectedFallback = sampleCities.find((c) => c.id === selectedId) ?? sampleCities[0];
  const selectedSample = sampleCities.find(
    (c) => c.city === effectiveMarketKey.city && c.state === effectiveMarketKey.state,
  ) ?? selectedFallback;
  const selectedCity = effectiveMarketKey.city || selectedSample.city;
  const selectedState = effectiveMarketKey.state || selectedSample.state;
  const selectedRankedMarket = baseRankedMarkets.find((market) => sameMarket(market.city, market.state, selectedCity, selectedState));
  // CRITICAL: the table's SCORE + TIER come from `rerankedUniverse` (which
  // applies the user's current weights). The right-panel gauge MUST read from
  // the same source or the two views disagree (e.g. table=88, gauge=23).
  // `selectedLiveCity?.composite_score` and `selectedRankedMarket?.compositeScore`
  // are both pre-reweight DB values — never use them for the gauge.
  const selectedRerankedMarket = rerankedUniverse.find((market) => sameMarket(market.city, market.state, selectedCity, selectedState));
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
    // Reranked first (matches the table). Fallback only when the market isn't
    // in the live-scored universe at all.
    compositeScore: selectedRerankedMarket?.compositeScore ?? selectedLiveCity?.composite_score ?? selectedRankedMarket?.compositeScore ?? selectedSample.compositeScore,
    tier: selectedRerankedMarket?.tier ?? selectedLiveCity?.tier ?? selectedRankedMarket?.tier ?? selectedSample.tier,
    population: selectedLiveCity?.population ?? selectedRankedMarket?.population ?? selectedSample.population,
    competitorCount: selectedLiveCity?.competitor_count ?? selectedRankedMarket?.competitorCount ?? selectedSample.competitorCount,
    county: selectedLiveCity?.county ?? selectedRankedMarket?.county ?? (selectedSample as any).county ?? null,
    metroArea: selectedLiveCity?.metro_area ?? selectedRankedMarket?.metroArea ?? (selectedSample as any).metroArea,
    metroCounties: selectedLiveCity?.metro_counties ?? selectedRankedMarket?.metroCounties ?? null,
    marketType: selectedLiveCity?.market_type ?? selectedRankedMarket?.marketType ?? (selectedSample as any).marketType,
    lastScrapedAt: selectedLiveCity?.last_scraped_at ?? selectedRankedMarket?.lastScrapedAt ?? null,
    scored: selectedLiveCity?.scored ?? selectedRankedMarket?.scoredRow ?? null,
  };
  // Canonical MarketView for the selected market. ALL right-panel surfaces
  // (gauge, executive summary, market summary, popover, CSV) MUST read
  // composite/tier/formatted strings from `selectedView`, never compute their
  // own. If you see code doing arithmetic on `selected.compositeScore` in JSX,
  // route it through `selectedView` instead. See src/lib/marketView.ts.
  const selectedView: MarketView = assertNoCompositeDrift(
    buildMarketView({
      city: selected.city,
      state: selected.state,
      cityId: selected.cityId,
      compositeScore: selected.compositeScore as number | null,
      tier: selected.tier as any,
      hasLiveData: !!selected.cityId && (Number(selected.compositeScore ?? 0) > 0 || !!selected.lastScrapedAt),
      population: (selected.population as number | null | undefined) ?? null,
      competitorCount: (selected.competitorCount as number | null | undefined) ?? null,
      lastScrapedAt: selected.lastScrapedAt ?? null,
    }),
    buildWeightsHash(appliedWeights, appliedSubWeights),
  );
  const selectedHasLiveData = selectedView.hasLiveData;

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
        // competitor_count removed 2026-05-22 — summer_camp_count 0/817 populated.
        // CSI saturation is read from scoredRow.csi_* fields directly.
        competitor_count: null,
        county: scoredRow.county_name ?? null,
        metro_area: scoredRow.metro_area ?? null,
        metro_counties: Array.isArray(scoredRow.metro_counties) ? scoredRow.metro_counties : null,
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
      addScore("tam_teachers", scoredRow.score_tam_teachers);
      // CSI is stored as SATURATION (high = crowded = bad). Invert to
      // OPPORTUNITY (high = good) for the UI category bar + composite math
      // so all three categories share the same direction. The raw
      // saturation value is still available via scoredRow.score_csi.
      if (scoredRow.score_csi != null) {
        scoresMap["competitive_landscape"] = Math.max(0, Math.min(100, 100 - Number(scoredRow.score_csi)));
      }
      // Legacy category-score keys (pricing_power, ease_of_operations, parent_mindset,
      // franchisee_supply) were retired in the May 21 6→3 reshape.

      // Legacy `city_market_signals` was severed on 2026-05-21. Evidence rows
      // are synthesized directly from us_cities_scored via the seeded fallback.
      const signals = buildSeededFallbackSignalsFromScored(scoredRow, childrenPct);
      const comps: any[] = [];
      const jobs: any[] = [];


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

  // Legacy live-fetch verification path (cities/city_fetch_jobs/city_category_scores
  // were dropped on May 19). Refresh UI is gated off via SHOW_LIVE_REFRESH=false;
  // this stub keeps the call site compiling without touching dropped tables.
  const waitForCompleteSowEvidence = async (_args: {
    city: string;
    state: string;
    startedAfter: string;
    expectedJobId?: string | null;
    expectedCompositeScore?: number | null;
    expectedTier?: string | null;
  }): Promise<{ ready: boolean; detail?: string }> => {
    return { ready: false, detail: "Live refresh path retired — data comes from seed runs only." };
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
      if (p.length >= 10) {
        toast.error("You can select up to 10 markets at a time");
        return p;
      }
      return [...p, id];
    });
  };

  const buildCsvDownload = async () => {
    try {
      // Sheet 1: only the backend columns the dashboard actually maps, so the
      // Excel "Backend Data" sheet and the on-screen spreadsheet show the
      // same picture. Identity columns (City/State/County/Metro) come from
      // the mapped UI row so they're always populated.
      const DASHBOARD_DB_KEYS = [
        "place_type",
        "is_registration_state",
        "composite_score_default",
        "score_demand",
        "score_tam_teachers",
        "score_csi",
        "population",
        "children_5_12",
        "median_household_income",
        "dual_working_families_pct",
        "college_degree_pct",
        // school_district_count removed 2026-05-22 — not in any live category
        "public_elementary_count",
        "private_elementary_count",
        "charter_elementary_count",
        "public_elementary_teacher_count",
        "public_elementary_enrollment",
        "cost_of_living_index",
        "col_salary_index",
        "avg_elementary_teacher_salary_usd",
        // "summer_camp_count" dropped from export 2026-05-22 — 0/817 populated.
        "csi_score",
        "csi_saturation_category",
        "csi_national_brand_count_weighted",
        "csi_local_provider_estimate",
        "csi_demand_adjusted_market",
        "csi_confidence",
        "scored_at",
        "census_last_updated",
      ];
      const dbKeys = DASHBOARD_DB_KEYS;
      const backendHeader = ["City", "State", "County", "Metro Area", ...dbKeys];
      const backendRows: (string | number | null)[][] = filtered.map((m: any) => {
        const r = m?.scoredRow ?? {};
        const head: (string | number | null)[] = [
          m.city ?? null,
          m.state ?? null,
          m.county ?? null,
          m.metroArea ?? null,
        ];
        const tail = dbKeys.map((k) => {
          const v = (r as any)[k];
          if (v == null) return null;
          if (typeof v === "number" || typeof v === "string") return v;
          if (typeof v === "boolean") return v ? "true" : "false";
          try { return JSON.stringify(v); } catch { return String(v); }
        });
        return [...head, ...tail];
      });

      const weightsCities = filtered.map((m: any) => ({
        city: m.city ?? "",
        state: m.state ?? "",
      }));

      const { buildRankedMarketsWorkbook, downloadWorkbook } = await import(
        "@/lib/cityScoringExport"
      );
      const wb = buildRankedMarketsWorkbook({
        categories: CATEGORIES.map((c) => ({ key: c.key, label: c.label })),
        backendHeader,
        backendRows,
        weightsCities,
        appliedWeights: appliedWeights as Record<CategoryKey, number>,
        appliedSubWeights: appliedSubWeights as Record<CategoryKey, Record<string, number>>,
        exportedAt: new Date().toISOString(),
      });
      const filename = `ranked-markets-live-${new Date().toISOString().slice(0, 10)}.xlsx`;
      downloadWorkbook(wb, filename);

      toast.success("Exported: backend data + weights snapshot + per-city weights");
    } catch (err) {
      console.error("Export XLSX failed", err);
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

  const handleFindTeachersForSelected = () => {
    const picked = baseRankedMarkets.filter((m: any) => selectedForCompare.includes(m.id)).slice(0, 10);
    if (picked.length === 0) {
      toast.error("Select at least 1 market first (use the checkbox).");
      return;
    }
    const cities = picked.map((m: any) => m.city).join(",");
    const states = picked.map((m: any) => m.state).join(",");
    navigate(`/teacher-prospects?city=${encodeURIComponent(cities)}&state=${encodeURIComponent(states)}`);
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

  // DB → UI category-key mapping (3-key shape after May 21, 2026 final purge).
  const DB_CAT_TO_UI: Record<string, CategoryKey> = {
    demand: "demand",
    competitive_landscape: "competitiveLandscape",
    franchisee_supply: "franchiseeSupply",
    // Post-2026-05-21 reshape, the live loader writes `tam_teachers` —
    // map it onto the same UI category as franchisee_supply.
    tam_teachers: "franchiseeSupply",
    // Legacy keys (back-compat with older cached payloads)
    summer_camp_demand: "demand",
    competition_score: "competitiveLandscape",
    stem_jobs: "franchiseeSupply",
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

  // detailScore MUST match the table SCORE + gauge. Sourced from the canonical
  // MarketView built once per render (src/lib/marketView.ts). Do not recompute.
  const detailScore = selectedView.composite;

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
    // Strip any non-finite leftovers from the base shape so they can't poison
    // the composite math via `(NaN ?? 0) === NaN`.
    (Object.keys(out) as CategoryKey[]).forEach((k) => {
      if (!Number.isFinite(out[k])) delete (out as any)[k];
    });
    (Object.keys(baseDetailCategoryScores) as CategoryKey[]).forEach((k) => {
      const r = recomputedByCategory[k];
      if (r?.score != null && Number.isFinite(r.score)) out[k] = Math.round(r.score);
    });
    return out;
  })();

  // ─── SINGLE SOURCE OF TRUTH for the headline composite ─────────────────
  // Every UI surface that shows a city's overall score (ranked table SCORE
  // column, right-panel gauge, formula popover, what-if preview, CSV export)
  // reads from `selectedView.composite` — a CompositeScore minted exactly
  // once per render by src/lib/marketView.ts and watched by the drift
  // detector. Branded TS type prevents components from substituting a raw
  // number. Past bug: a local recomputation produced 23 in the gauge while
  // the table showed 88 for the same city — now structurally impossible.
  const appliedTotal = Object.values(appliedWeights).reduce((s, v) => s + v, 0);
  const headlineComposite: number = selectedView.composite;
  // Legacy alias — kept only because several JSX sites reference this name.
  const weightedComposite = headlineComposite;
  // Use the same percentile-based tier that the ranked table uses (top 5% = I,
  // next 15% = II, next 30% = III, rest = IV). Previously this panel recomputed
  // tier with absolute cutoffs (85/75/65) which contradicted the table badge —
  // e.g. San Diego showed "A" in the list and "C (Tier 3)" here.
  const displayTier: "A" | "B" | "C" | "D" =
    (selected.tier as "A" | "B" | "C" | "D") ?? "D";

  const TIER_BADGE: Record<string, { bg: string; fg: string; label: string }> = {
    A: { bg: "#e6f7ef", fg: "#0ea66e", label: "Tier I" },
    B: { bg: "#eaf0ff", fg: "#174be8", label: "Tier II" },
    C: { bg: "#fff6dc", fg: "#b8860b", label: "Tier III" },
    D: { bg: "#ffeede", fg: "#ea580c", label: "Tier IV" },
  };
  const tierBadge = TIER_BADGE[displayTier];
  const opportunityLabel =
    displayTier === "A" ? "Top Priority Market" :
    displayTier === "B" ? "Strong Market" :
    displayTier === "C" ? "Watch Market" : "Skip Market";

  // Key Market Signals — locked to the 12 metrics that power the 3 visible
  // categories (Demand 4 + TAM Teachers 5 + Competitive Landscape 3).
  // Per Brett 2026-05-21: simple plain UI, no chips, source as subtitle.
  const KEY_SIGNAL_KEYS: readonly string[] = [
    // Demand (4)
    "children_5_12_count",
    "median_household_income",
    "dual_income_household_pct",
    "education_bachelors_plus_pct",
    // TAM Teachers (5)
    "public_elementary_school_count",
    "public_elementary_teacher_count",
    "private_charter_school_count",
    "public_elementary_enrollment",
    "col_salary_index",
    // Competitive Landscape (3)
    "csi_national_brand_supply",
    "csi_local_camp_estimate",
    "csi_demand_adjusted_market",
  ];

  const KEY_SIGNAL_META: Record<string, { label: string; source: string }> = (() => {
    const out: Record<string, { label: string; source: string }> = {};
    for (const m of SOW_METRIC_REGISTRY) {
      out[m.key] = { label: m.label, source: m.source };
    }
    return out;
  })();

  const signalsByKey = useMemo(() => {
    const out: Record<string, { value: string }> = {};
    for (const s of signalsForDisplay) {
      if (s?.signal_key) out[s.signal_key] = { value: s.value == null ? "" : String(s.value) };
    }
    return out;
  }, [signalsForDisplay]);

  // Per-signal display config: number formatting + Low/Med/High benchmark.
  // `higherIsBetter: false` means a HIGH raw value is a BAD thing for the franchise
  // (e.g. lots of national-brand competitors = more saturation = less opportunity).
  const SIGNAL_DISPLAY: Record<
    string,
    {
      format: "int" | "money" | "pct" | "decimal";
      thresholds: [number, number]; // [lowMax, medMax] — anything above medMax = high band
      higherIsBetter: boolean;
      goodLabel?: string; // override for "good" band (e.g. "Wide open" for competitive)
      badLabel?: string;
    }
  > = {
    children_5_12_count:           { format: "int",     thresholds: [3000, 15000],   higherIsBetter: true },
    median_household_income:       { format: "money",   thresholds: [60000, 100000], higherIsBetter: true },
    dual_income_household_pct:     { format: "pct",     thresholds: [60, 80],        higherIsBetter: true },
    education_bachelors_plus_pct:  { format: "pct",     thresholds: [30, 50],        higherIsBetter: true },
    public_elementary_school_count:{ format: "int",     thresholds: [5, 20],         higherIsBetter: true },
    public_elementary_teacher_count:{format: "int",     thresholds: [100, 500],      higherIsBetter: true },
    private_charter_school_count:  { format: "int",     thresholds: [2, 10],         higherIsBetter: true },
    public_elementary_enrollment:  { format: "int",     thresholds: [2000, 10000],   higherIsBetter: true },
    col_salary_index:              { format: "decimal", thresholds: [50000, 80000],  higherIsBetter: true },
    csi_national_brand_supply:     { format: "int",     thresholds: [3, 10],         higherIsBetter: false, goodLabel: "Wide open", badLabel: "Saturated" },
    csi_local_camp_estimate:       { format: "int",     thresholds: [3, 10],         higherIsBetter: false, goodLabel: "Few local rivals", badLabel: "Many local rivals" },
    csi_demand_adjusted_market:    { format: "decimal", thresholds: [3000, 8000],    higherIsBetter: true },
  };

  const formatSignalValue = (raw: string | number, format: "int" | "money" | "pct" | "decimal"): string => {
    const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[, $%]/g, ""));
    if (!Number.isFinite(n)) return String(raw);
    if (format === "money") return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    if (format === "pct") return `${n.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
    if (format === "decimal") {
      // Show decimals only when the number actually has a fractional part.
      const hasFrac = Math.abs(n - Math.trunc(n)) > 1e-9;
      return n.toLocaleString("en-US", { maximumFractionDigits: hasFrac ? 2 : 0 });
    }
    return Math.round(n).toLocaleString("en-US");
  };

  const benchmarkBand = (
    rawValue: string,
    cfg?: { thresholds: [number, number]; higherIsBetter: boolean; goodLabel?: string; badLabel?: string },
  ): { label: string; tone: "good" | "mid" | "bad" } | null => {
    if (!cfg) return null;
    const n = Number(String(rawValue).replace(/[, $%]/g, ""));
    if (!Number.isFinite(n)) return null;
    const [lo, mid] = cfg.thresholds;
    const band: "low" | "med" | "high" = n <= lo ? "low" : n <= mid ? "med" : "high";
    if (cfg.higherIsBetter) {
      if (band === "high") return { label: cfg.goodLabel ?? "High", tone: "good" };
      if (band === "med") return { label: "Medium", tone: "mid" };
      return { label: cfg.badLabel ?? "Low", tone: "bad" };
    }
    // lower is better (competitive signals)
    if (band === "low") return { label: cfg.goodLabel ?? "Low", tone: "good" };
    if (band === "med") return { label: "Medium", tone: "mid" };
    return { label: cfg.badLabel ?? "High", tone: "bad" };
  };

  const sigRows = KEY_SIGNAL_KEYS.map((key) => {
    const meta = KEY_SIGNAL_META[key];
    const sig = signalsByKey[key];
    const rawVal = sig?.value;
    const isEmpty = rawVal === undefined || rawVal === null || rawVal === "" ;
    const cfg = SIGNAL_DISPLAY[key];
    const value = isEmpty ? "—" : (cfg ? formatSignalValue(rawVal, cfg.format) : String(rawVal));
    const benchmark = isEmpty ? null : benchmarkBand(String(rawVal), cfg);
    return {
      key,
      label: meta?.label ?? key,
      source: meta?.source ?? "",
      value,
      rawValue: isEmpty ? null : String(rawVal),
      benchmark,
    };
  });

  const hasLiveSignals = sigRows.some((r) => r.value !== "—");
  const preSeededCount = sigRows.filter((r) => r.value !== "—").length;
  const hasMoreSignals = false; // entire 12-metric list rendered inline; drawer just expands detail


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
        {screenMode !== "spreadsheet" && (
          <Button variant="outline" className="h-10 border-[#e5eaf2] text-[#14233b] gap-2 font-normal" onClick={buildCsvDownload}>
            <Download size={15} /> Export Source Data
          </Button>
        )}
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
          {/* Preset dropdown removed May 22, 2026 — replaced by 2×3 PresetTileGrid
              rendered inside the Scoring Weights card below. Saved-searches Select
              remains separate. */}
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
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-help">
                  <span className="text-sm text-[#14233b]">Compare Mode</span>
                  <Info size={12} className="text-[#8794ab]" />
                  <Switch
                    checked={compareMode}
                    onCheckedChange={(v) => {
                      setCompareMode(v);
                      if (v) {
                        toast.message("Compare Mode on", {
                          description: "Check 2–4 markets in the list below, then click Compare to view them side-by-side.",
                        });
                      }
                    }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                Adds checkboxes to the market list. Select 2–4 markets, then click <span className="font-semibold">Compare</span> to view their scores side-by-side.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Screen mode toggle: Dashboard vs Spreadsheet */}
      <div className="mb-3 flex items-center gap-1 rounded-lg border border-[#eef2f7] bg-white p-1 w-fit">
        {(["dashboard", "spreadsheet"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => updateScreenMode(v)}
            className={`px-3 h-7 rounded-md text-[11.5px] font-semibold transition-colors ${
              screenMode === v ? "bg-[#174be8] text-white" : "text-[#526078] hover:bg-[#f3f6fc]"
            }`}
          >
            {v === "dashboard" ? "Dashboard" : "Spreadsheet"}
          </button>
        ))}
      </div>

      {screenMode === "spreadsheet" && (
        <CitySpreadsheetView
          // Use the percentile-tiered universe (top 5% = A, next 15% = B,
          // next 30% = C, rest = D) so the Spreadsheet matches the Dashboard.
          // baseRankedMarkets carries the legacy score-based tier (A ≥ 80),
          // which gives zero A's because top composite is ~74.
          markets={rerankedUniverse}
          onExportCsv={buildCsvDownload}
          onOpenCity={(m) => {
            pickMarket({ city: m.city, state: m.state, id: m.id });
            setDetailDrawerOpen(true);
          }}
        />
      )}


      {screenMode === "dashboard" && (
      <>
      {/* Scoring Weights */}
      <div className="mb-4 rounded-lg bg-white border border-[#eef2f7] p-4">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            {/* Budget pie — three solid slices showing the 100% share. */}
            {(() => {
              const segs = VISIBLE_CATEGORIES.map((c) => ({ key: c.key, color: c.color, value: weights[c.key] || 0 }));
              const total = segs.reduce((s, x) => s + x.value, 0) || 1;
              const cx = 28, cy = 28, r = 24;
              let startAngle = -Math.PI / 2; // start at 12 o'clock
              const slices = segs.map((s) => {
                const frac = s.value / total;
                const endAngle = startAngle + frac * Math.PI * 2;
                const large = frac > 0.5 ? 1 : 0;
                const x1 = cx + r * Math.cos(startAngle);
                const y1 = cy + r * Math.sin(startAngle);
                const x2 = cx + r * Math.cos(endAngle);
                const y2 = cy + r * Math.sin(endAngle);
                // Full circle edge-case: render as a full circle.
                const d = frac >= 0.999
                  ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`
                  : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
                const el = (
                  <path
                    key={s.key}
                    d={d}
                    fill={s.color}
                    stroke="#ffffff"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    style={{ transition: "d 200ms ease" }}
                  />
                );
                startAngle = endAngle;
                return el;
              });
              return (
                <div className="relative shrink-0" style={{ width: 56, height: 56 }} aria-hidden>
                  <svg width="56" height="56" viewBox="0 0 56 56">
                    <circle cx={cx} cy={cy} r={r} fill="#eef2f7" />
                    {slices}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-[8.5px] font-bold text-white tabular-nums pointer-events-none" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}>
                    {totalWeight}%
                  </div>
                </div>
              );
            })()}
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#07142f]">Scoring Weights</h3>
              <p className="text-[11px] text-[#07142f] leading-snug mt-1 max-w-[640px]">
                These three weights <strong>share a budget of 100%</strong>. Raising one automatically lowers the others — the cities haven't changed, only how much each factor counts toward the ranking.
              </p>
              <p className="text-[10px] text-[#8794ab] leading-snug mt-1">
                Score uses the 12-metric model across Demand, Competitive Opportunity, and TAM Teachers. Missing metrics are tracked as evidence gaps, not counted as zero.
              </p>
              {totalWeight !== 100 && (
                <p className="text-[11px] text-[#ea580c] mt-1">Weights must total 100% to apply scoring.</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#526078]">
                Total Weight: <span className={totalWeight === 100 ? "text-[#0ea66e] font-medium" : "text-[#ea580c] font-medium"}>{totalWeight}%</span>
              </span>
              <PreviewBadge pending={weightsPending && totalWeight === 100} preview={previewTierCounts} committed={committedTierCounts} />
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
                title={weightsPending ? "Click to commit slider changes to the table" : "No pending changes"}
                className={cn(
                  "h-7 bg-[#174be8] hover:bg-[#1240c9] text-white text-[11px] px-3 disabled:opacity-50 transition-all",
                  weightsPending && totalWeight === 100 && "ring-2 ring-[#174be8]/40 ring-offset-1 shadow-md",
                )}
              >
                Apply Weights
              </Button>
            </div>
            {weightsPending && totalWeight === 100 && (
              <p className="text-[11px] text-[#526078] leading-snug text-right max-w-[360px]">
                <span className="font-semibold text-[#07142f]">Showing previous results.</span> Click <span className="font-semibold text-[#174be8]">Apply Weights</span> to recompute the table, map, and scores.
              </p>
            )}
          </div>
        </div>

        {/* Preset tile grid — 2 rows × 3 columns. Click to apply; sliders below tween
            from current values to the preset's target over ~480ms. A downward chevron
            on the active tile + a temporary blue ring on the sliders below makes the
            cause→effect obvious. "Custom" appears as a chip (not a tile) when weights
            don't match any preset. */}
        <div className="mb-3">
          {/* Presets header — make it unmistakable that the 6 tiles below are
              clickable preset strategies that drive the sliders. */}
          <div className="mb-2.5 rounded-md bg-[#f5f8ff] border border-[#dbe4f2] px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="inline-flex h-5 items-center rounded-md bg-[#174be8] px-1.5 text-[10px] font-bold uppercase tracking-wide text-white">
                6 Presets
              </span>
              <span className="text-[12.5px] font-bold text-[#07142f]">
                Pick a scoring strategy below ↓
              </span>
              {scoringModel === "Custom" ? (
                <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#f1ebff] text-[#7c3aed]">
                  Custom — you adjusted a slider
                </span>
              ) : (
                <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#eaf0ff] text-[#174be8]">
                  Active preset: {scoringModel}
                </span>
              )}
            </div>
            <p className="text-[11.5px] text-[#526078] leading-snug">
              A <span className="font-semibold text-[#07142f]">preset</span> is a one-click recipe that snaps the three weight sliders to a balance tuned for a specific goal (e.g. <em>most kids</em>, <em>most teachers</em>, <em>least competition</em>). Click any tile to apply it — the sliders below animate to match, then hit <span className="font-semibold">Apply Weights</span> to re-rank cities. Drag a slider yourself and you'll switch to <span className="font-semibold text-[#7c3aed]">Custom</span>.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PRESET_TILE_ORDER.map((name) => {
              const w = SCORING_PRESETS[name];
              const isActive = scoringModel === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => applyPresetByName(name)}
                  aria-pressed={isActive}
                  className={cn(
                    "group relative text-left rounded-lg border p-2.5 transition-all bg-white hover:border-[#174be8]/60 hover:shadow-sm",
                    isActive
                      ? "border-[#174be8] ring-2 ring-[#174be8]/30 bg-[#f5f8ff] shadow-sm"
                      : "border-[#eef2f7]",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12.5px] font-bold text-[#07142f] leading-tight">{name}</span>
                    <span className="text-[9.5px] uppercase tracking-wide text-[#8794ab] font-semibold">{PRESET_TAGLINES[name]}</span>
                  </div>
                  <p className="text-[10.5px] text-[#526078] leading-snug mt-0.5">
                    {PRESET_DESCRIPTIONS[name]}
                  </p>
                  {/* Mini weight bar — three colored segments showing the split.
                      Mirrors the slider colors so the eye can trace tile → slider. */}
                  <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-[#eef2f7]">
                    {VISIBLE_CATEGORIES.map((cat) => (
                      <div
                        key={cat.key}
                        style={{ width: `${w[cat.key]}%`, backgroundColor: cat.color }}
                        title={`${cat.label}: ${w[cat.key]}%`}
                      />
                    ))}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[9.5px] tabular-nums text-[#8794ab] font-semibold">
                    <span style={{ color: VISIBLE_CATEGORIES[0].color }}>{w.demand}</span>
                    <span style={{ color: VISIBLE_CATEGORIES[1].color }}>{w.franchiseeSupply}</span>
                    <span style={{ color: VISIBLE_CATEGORIES[2].color }}>{w.competitiveLandscape}</span>
                  </div>
                  {/* Active connector — small downward arrow that visually "points at"
                      the sliders below, so the user reads the tile-to-slider relationship. */}
                  {isActive && (
                    <span
                      aria-hidden
                      className={cn(
                        "pointer-events-none absolute left-1/2 -translate-x-1/2 -bottom-[7px] h-3 w-3 rotate-45 border-r border-b border-[#174be8] bg-[#f5f8ff]",
                        presetTweening && "animate-pulse",
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
          {/* "Syncing…" mini-label that appears only during the tween — reinforces
              that the slider motion below is caused by the click above. */}
          <div className="h-4 mt-1 flex items-center justify-center">
            {presetTweening && (
              <span className="text-[10px] font-semibold text-[#174be8] tracking-wide animate-pulse">
                ↓ syncing sliders ↓
              </span>
            )}
          </div>
        </div>


        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {VISIBLE_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const customCount =
              customCriteria.filter((c) => c.category === cat.label).length +
              supabaseCustomCriteria.filter((c) => c.category === cat.label).length;
            return (
              <div
                key={cat.key}
                className={cn(
                  "rounded-lg border bg-white p-3 flex flex-col gap-2 transition-all",
                  presetTweening
                    ? "border-[#174be8] ring-2 ring-[#174be8]/30 shadow-sm"
                    : "border-[#eef2f7] hover:border-[#174be8]/40",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="flex items-center justify-center rounded-lg flex-shrink-0 mt-0.5" style={{ width: 28, height: 28, backgroundColor: cat.bg }}>
                      <Icon size={15} style={{ color: cat.color }} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold text-[#07142f] leading-tight">{cat.label}</div>
                      <p className="text-[11px] text-[#526078] leading-snug mt-1">{cat.description}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-1 pt-2 border-t border-[#f3f5f9]">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wide text-[#8794ab] font-semibold">Weight in ranking</span>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={weights[cat.key]}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === "") return;
                          const parsed = Number(raw);
                          if (!Number.isFinite(parsed)) return;
                          const clamped = Math.max(0, Math.min(100, Math.round(parsed)));
                          setWeights((w) => {
                            const next = rebalanceWeights(w, cat.key, clamped);
                            const detected = detectPreset(next);
                            if (detected !== scoringModel) setScoringModel(detected);
                            return next;
                          });
                        }}
                        onBlur={(e) => {
                          const parsed = Number(e.target.value);
                          if (!Number.isFinite(parsed)) {
                            e.target.value = String(weights[cat.key]);
                          }
                        }}
                        className="h-7 w-14 text-right text-[13px] font-bold text-[#07142f] tabular-nums px-1.5"
                        aria-label={`${cat.label} weight percent`}
                      />
                      <span className="text-base font-bold text-[#07142f]">%</span>
                    </div>
                  </div>
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
                </div>
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
        csiBrandDetail={(selected as any)?.scoredRow?.csi_brand_detail ?? null}
        csiRawScore={(selected as any)?.scoredRow?.csi_score ?? null}
        csiSaturationCategory={(selected as any)?.scoredRow?.csi_saturation_category ?? null}
        overallFormula={{
          parts: VISIBLE_CATEGORIES.map((c) => ({
            key: c.key,
            label: c.label,
            score: detailCategoryScores[c.key] ?? null,
            weightPct: appliedTotal > 0 ? (appliedWeights[c.key] / appliedTotal) * 100 : 0,
          })),
          composite: weightedComposite ?? null,
        }}
      />


      {/* Tier distribution strip — sits between Scoring Weights and Ask AI. */}
      <TierCountsBar
        committed={committedTierCounts}
        preview={previewTierCounts}
        totalLive={liveScoredTotal}
        filteredLive={filteredLiveCount}
        extras={tierBarExtras}
        activeTier={tierFilter}
        onTierClick={(t) => {
          // Toggle: clicking the active tier clears the filter, clicking a
          // different tier switches to it. Resets page so the user lands on
          // the top of the filtered list.
          setTierFilter(tierFilter === t ? "All" : t);
          setPage(1);
        }}
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
          appliedWeights={appliedWeights}
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
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            placeholder="Any"
            value={minPop === "0" ? "" : minPop}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, "");
              setMinPop(v === "" ? "0" : v);
            }}
            className="h-9 bg-white border-[#e5eaf2] text-sm"
          />
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
                Tiers are assigned by <b>percentile rank</b> across all live-scored cities, not by absolute score:
                <br />
                <b>Tier I = Top 5%</b>, <b>Tier II = next 15%</b>,{" "}
                <b>Tier III = next 30%</b>, <b>Tier IV = bottom 50%</b>.
                <br />
                Composite scores tend to cluster in the 40s–70s, so a Tier I market may still score in the 60s.
              </TooltipContent>
            </Tooltip>
          </label>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="h-9 bg-white border-[#e5eaf2] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="A">Tier I — Top 5%</SelectItem>
              <SelectItem value="B">Tier II — Next 15%</SelectItem>
              <SelectItem value="C">Tier III — Next 30%</SelectItem>
              <SelectItem value="D">Tier IV — Bottom 50%</SelectItem>
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
          markets={mapMarkets}
          onSelect={(m) => {
            const sample = sampleCities.find((s) => sameMarket(s.city, s.state, m.city, m.state));
            pickMarket({ city: m.city, state: m.state, id: sample?.id });
            setViewMode("table");
          }}
        />
      ) : (
      <>
      {/* TierCountsBar moved up — now sits between Scoring Weights and Ask AI. */}
      {/* Three-column layout */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr_1fr] items-stretch">
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
                onClick={handleFindTeachersForSelected}
                disabled={selectedForCompare.length < 1}
                className="flex items-center gap-1 text-xs font-medium text-[#174be8] hover:underline disabled:text-[#8794ab] disabled:no-underline disabled:cursor-not-allowed"
                title="Find teachers across the checked markets"
              >
                <ArrowRight size={12} /> Find Teachers ({selectedForCompare.length})
              </button>
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
            <div className="grid grid-cols-[16px_22px_minmax(0,1fr)_42px_70px_30px_30px_30px_28px_16px] items-center gap-x-2 px-1 py-2 text-[9.5px] uppercase tracking-wide text-[#8794ab] border-b border-[#eef2f7]">
              <span></span>
              <span>Rank</span>
              <span>Market</span>
              <span>Type</span>
              <span>Score</span>
              <span className="text-right" title="Demand category score">Dem</span>
              <span className="text-right" title="TAM Teachers category score">TAM</span>
              <span className="text-right" title="Competitive Opportunity (higher = less saturated, fewer national-brand competitors). Opportunity = 100 − CSI.">Opp</span>
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
                    pickMarket({ city: c.city, state: c.state, id: sample?.id ?? c.id });
                  }}
                  className={`grid grid-cols-[16px_22px_minmax(0,1fr)_42px_70px_30px_30px_30px_28px_16px] items-center gap-x-2 px-1 py-2.5 text-[11px] cursor-pointer border-b border-[#f3f5f9] last:border-0 ${isSel ? "bg-[#eaf0ff]" : "hover:bg-[#f7faff]"}`}
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
                    {(c as any).marketType ?? ((c.population ?? 0) > 200000 ? "Urban" : "Suburb")}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {c.hasLiveData ? (
                      <>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[#07142f] font-semibold tabular-nums hover:underline decoration-dotted underline-offset-2"
                              title="Why this tier? Click to see the formula"
                            >
                              {c.compositeScore}
                              <span className="ml-0.5 font-mono italic text-[9px] text-[#8794ab]">ƒx</span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" side="right" className="p-0 w-auto">
                            <RowScorePopover
                              city={c.city}
                              state={c.state}
                              categories={VISIBLE_CATEGORIES.map((cc) => ({ key: cc.key, label: cc.label }))}
                              categoryScores={(c as any).categoryScores ?? {}}
                              appliedWeights={appliedWeights}
                              composite={c.compositeScore}
                              tier={c.tier}
                            />
                          </PopoverContent>
                        </Popover>
                        <div className="h-1.5 flex-1 rounded-full bg-[#eef2f7]">
                          <div className="h-full rounded-full bg-[#0ea66e]" style={{ width: `${c.compositeScore}%` }} />
                        </div>
                      </>
                    ) : (
                      <span className="text-[#8794ab] font-medium">—</span>
                    )}
                  </div>
                  {(() => {
                    const cs = (c as any).categoryScores ?? {};
                    const cell = (v: number | null | undefined, title: string) => {
                      if (v == null || !c.hasLiveData) return <span className="justify-self-end text-[10.5px] text-[#cbd5e1] tabular-nums">—</span>;
                      const n = Math.round(Number(v));
                      const color = "text-[#07142f]";
                      return <span className={`justify-self-end text-[10.5px] font-semibold tabular-nums ${color}`} title={title}>{n}</span>;
                    };
                    return (
                      <>
                        {cell(cs.demand, "Demand score")}
                        {cell(cs.franchiseeSupply, "TAM Teachers score")}
                        {cell(cs.competitiveLandscape, "Competitive Opportunity (higher = less saturated)")}
                      </>
                    );
                  })()}
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
        <div className="min-w-0 rounded-lg bg-white border border-[#eef2f7] p-4 flex flex-col h-full">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[14px] leading-none font-bold uppercase tracking-wide text-[#526078]">Selected Market</h2>
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



          <div className="flex flex-col items-center text-center flex-1 w-full">
            {/* City name → Overall Score → details → categories → buttons → market summary, full width of middle column */}
            <h3 className="mb-2 text-[18px] leading-tight font-bold text-[#07142f] text-center break-words w-full">
              {selected.city}, {selected.state === "Texas" ? "TX" : selected.state === "Florida" ? "FL" : selected.state}
            </h3>
            <p className="mb-1.5 text-[12px] font-semibold text-[#3a4c72]">Overall Score</p>
            <svg viewBox="0 0 200 120" className="w-full h-auto max-w-[260px]">
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
            <p className="-mt-1 text-[13px] font-semibold" style={{ color: selectedHasLiveData ? tierBadge.fg : "#8794ab" }}>{selectedHasLiveData ? opportunityLabel : "No live data"}</p>
            {selectedHasLiveData && (() => {
              const enriched = VISIBLE_CATEGORIES.map((c) => {
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
                <div className="mt-1.5 px-2 text-center text-[11px] italic leading-snug text-[#6b7a99]">
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
                <PopoverContent align="start" side="bottom" className="w-[360px] p-3">
                  <div className="mb-2">
                    <p className="text-[12px] font-semibold text-[#07142f]">{selected.city}, {selected.state}</p>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#526078]">Overall Score breakdown</p>
                  </div>
                  {(() => {
                    const total = appliedTotal > 0 ? appliedTotal : 1;
                    const rows = VISIBLE_CATEGORIES.map((c) => {
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

            {/* Details */}
            <div className="mt-3 w-full text-left text-[12px] space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[#6b7a96]">Tier</span>
                {selectedHasLiveData ? (
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight" style={{ backgroundColor: tierBadge.bg, color: tierBadge.fg }}>{tierBadge.label}</span>
                ) : (
                  <span className="rounded-full bg-[#eef2f7] px-2 py-0.5 text-[11px] font-semibold leading-tight text-[#8794ab]">No data</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#6b7a96]">Market Type</span>
                <span className="rounded-full bg-[#eef3ff] px-2 py-0.5 text-[11px] font-medium leading-tight text-[#174be8]">{displayMarketType}</span>
              </div>
              <div>
                <div className="text-[#6b7a96]">Metro Area</div>
                <div className="font-semibold text-[#07142f] break-words">{displayMetroArea}</div>
              </div>
              <div>
                <div className="text-[#6b7a96]">County</div>
                <div className="font-semibold text-[#07142f] break-words">{displayCounty}</div>
              </div>
            </div>

            {/* Category Scores */}
            <div className="mt-4 w-full text-left">
              <p className="mb-2.5 text-[13px] font-semibold text-[#07142f]">Category Scores</p>
              <div className="space-y-2">
                {VISIBLE_CATEGORIES.map((cat) => {
                  const v = selectedHasLiveData ? (detailCategoryScores[cat.key] ?? 0) : null;
                  const wPct = appliedTotal > 0 ? (appliedWeights[cat.key] / appliedTotal) * 100 : 0;
                  const isZeroWeighted = wPct <= 0.05;
                  return (
                    <div key={cat.key} className={isZeroWeighted ? "opacity-45" : ""} title={isZeroWeighted ? `${cat.label} is set to 0% — contributes nothing to the overall score` : undefined}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-[12px]">
                        <span className="text-[#526078]">
                          {cat.label}
                          {isZeroWeighted && <span className="ml-1.5 text-[10px] uppercase tracking-wide text-[#8794ab]">· 0% weight</span>}
                        </span>
                        <span className="font-semibold text-[#07142f]">{v ?? "—"}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#e8edf6]">
                        <div className={`h-full rounded-full ${isZeroWeighted ? "bg-[#b6bfd0]" : "bg-[#1d4fff]"}`} style={{ width: `${v ?? 0}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-4 w-full flex flex-col gap-2">
              <Button onClick={handleFindTeachers} className="h-9 w-full bg-[#174be8] hover:bg-[#1240c9] text-white gap-1.5 px-3 font-medium text-[12px] justify-center">
                <span className="truncate">Find Teachers</span> <ArrowRight size={12} className="flex-shrink-0" />
              </Button>
              <Button variant="outline" onClick={openCompare} className="h-9 w-full border-[#dbe4f2] text-[#2250eb] gap-1.5 px-2.5 font-medium text-[12px] justify-center">
                <GitCompare size={12} /> Compare
              </Button>
              <Button variant="outline" onClick={() => setReportOpen(true)} className="h-9 w-full border-[#dbe4f2] text-[#2250eb] gap-1.5 px-2.5 font-medium text-[12px] justify-center">
                <FileText size={12} /> Report
              </Button>
              <Button variant="outline" className="h-9 w-full border-[#dbe4f2] text-[#2250eb] gap-1.5 px-2.5 font-medium text-[12px] justify-center" onClick={() => setDetailDrawerOpen(true)}>
                <Eye size={12} /> Details
              </Button>
            </div>

            {/* Market Summary at bottom, full width — mt-auto pushes it to fill leftover height.
                Always dynamic: uses analyst notes when present, otherwise auto-writes a brief
                plain-English summary from the live score + category breakdown. */}
            {(() => {
              const mScore = Math.round(Number(detailScore) || 0);
              const mDemand = Math.round(detailCategoryScores["demand"] ?? 0);
              const mTam = Math.round(detailCategoryScores["tam"] ?? 0);
              const mOpp = Math.round(detailCategoryScores["competitive"] ?? 0);
              const mVerdict = mScore >= 70 ? "high" : mScore >= 50 ? "moderate" : "low";
              const cats: { label: string; v: number }[] = [
                { label: "family demand", v: mDemand },
                { label: "teacher supply", v: mTam },
                { label: "competitive openness", v: mOpp },
              ];
              const strongest = [...cats].sort((a, b) => b.v - a.v)[0];
              const weakest = [...cats].sort((a, b) => a.v - b.v)[0];
              const verdictPhrase =
                mVerdict === "high"
                  ? "a high-opportunity market"
                  : mVerdict === "moderate"
                  ? "a moderate-opportunity market"
                  : "a low-opportunity market";
              const autoSummary = `${selected.city}, ${selected.state === "Texas" ? "TX" : selected.state === "Florida" ? "FL" : selected.state} scores ${mScore}/100 — ${verdictPhrase} on our model. Its strongest signal is ${strongest.label} (${strongest.v}/100); the limiting factor is ${weakest.label} (${weakest.v}/100). Use the Executive Summary on the right for the full plain-English breakdown, or open Details for the signal-by-signal evidence.`;
              const summaryText = selectedLiveCity?.notes ?? autoSummary;
              return (
                <div className="mt-auto pt-5 w-full text-left border-t border-[#eef2f7]">
                  <p className="mb-1.5 text-[12px] font-semibold text-[#3a4c72]">Market Summary</p>
                  <p className="text-[12px] leading-relaxed text-[#14233b]">{summaryText}</p>
                </div>
              );
            })()}
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

          {(() => {
            const score = Math.round(Number(detailScore) || 0);
            const verdict = score >= 70 ? "high" : score >= 50 ? "moderate" : "low";
            const verdictLabel = verdict === "high" ? "high-opportunity" : verdict === "moderate" ? "moderate-opportunity" : "low-opportunity";
            const demand = Math.round(detailCategoryScores["demand"] ?? 0);
            const tam = Math.round(detailCategoryScores["tam"] ?? 0);
            const opp = Math.round(detailCategoryScores["competitive"] ?? 0);
            const catParts = CATEGORIES.map((c) => {
              const v = Math.round(detailCategoryScores[c.key] ?? 0);
              return `${c.label} ${v}`;
            }).join(", ");
            const topSignals = sigRows.filter((r) => r.value !== "—").slice(0, 3);
            const sigText = topSignals.length
              ? topSignals.map((s) => `${s.label} (${s.value})`).join(", ")
              : "key market signals are still loading";
            let argument = "";
            if (verdict === "high") {
              argument = `With a composite of ${score}, ${selectedCity} ranks as a high-priority market worth deep examination — the underlying signals point to durable family demand and a recruitable operator pool.`;
            } else if (verdict === "moderate") {
              argument = `A composite of ${score} places ${selectedCity} in the moderate band: worth examining as a secondary target, with category mix (${catParts}) determining whether it graduates to a priority market.`;
            } else {
              argument = `A composite of ${score} suggests ${selectedCity} is a low-priority market — category scores (${catParts}) do not yet justify outbound investment without a compelling local thesis.`;
            }
            const summary = `${selectedCity}, ${selectedState} scores ${score}/100 overall (${verdict} opportunity). Category breakdown: ${catParts}. Standout signals include ${sigText}. ${argument}`;

            // Plain-English long-form report rendered inside the slide-out drawer.
            const verdictSentence =
              verdict === "high"
                ? `${selectedCity} is a strong, high-opportunity market for a Neuron Garage location. The numbers point to durable family demand, a deep teacher pool to recruit from, and a competitive landscape that still has room for a new branded operator.`
                : verdict === "moderate"
                ? `${selectedCity} is a moderate-opportunity market. There is enough underlying demand and supply to make it worth a closer look, but at least one category is holding the overall score back — we would want a clear local thesis before pushing it into the top tier.`
                : `${selectedCity} is currently a low-opportunity market on our scoring model. That does not mean it is a bad city — it means the combination of family demand, teacher supply, and competitive openness is not strong enough today to justify outbound investment without a compelling local reason (an existing operator, a real-estate opening, a referral, etc.).`;

            const demandSentence =
              demand >= 70
                ? `Demand scores ${demand}/100 — strong. Families in this market have the income, the children in the right age band, and the education-spending behavior we look for. This is the single biggest signal that the product will sell here.`
                : demand >= 40
                ? `Demand scores ${demand}/100 — middling. The household-income, child-population, and education-spend signals are mixed: some are healthy, others are softer than our top markets. It is workable, but not a slam dunk.`
                : `Demand scores ${demand}/100 — weak. Either the children-in-target-age count, the household income, or the dual-income share is well below what our top markets show. Without strong demand, even cheap operations and zero competition would not produce a sustainable franchise.`;

            const tamSentence =
              tam >= 70
                ? `TAM Teachers scores ${tam}/100 — excellent. There is a large, recruitable pool of elementary teachers in this metro, which means hiring qualified operators and instructors should not be the bottleneck.`
                : tam >= 40
                ? `TAM Teachers scores ${tam}/100 — adequate. There are teachers to recruit, but the pool is not deep. Plan for a longer hiring cycle and budget for at least one fallback candidate per role.`
                : `TAM Teachers scores ${tam}/100 — thin. The supply of recruitable elementary teachers is small relative to our benchmark markets. Operator and instructor hiring will likely be the rate-limiting step here.`;

            const oppSentence =
              opp >= 70
                ? `Competitive Opportunity scores ${opp}/100 — wide open. National-brand STEM and enrichment competitors are under-represented in this market, so a new entrant has real white space to capture.`
                : opp >= 40
                ? `Competitive Opportunity scores ${opp}/100 — contested. National brands already have some presence. Entry is possible but requires sharper positioning and a credible local differentiator.`
                : `Competitive Opportunity scores ${opp}/100 — crowded. The market is already well-served by national-brand competitors. Remember: a low score here means high saturation, not low demand.`;

            const signalRows = sigRows.filter((r) => r.value !== "—");
            return (
              <>
                <div className="rounded-lg bg-white border border-[#eef2f7] p-3 flex-1 flex flex-col">
                  <h4 className="text-xs font-bold text-[#07142f] mb-1">{selectedCity}, {selectedState}</h4>
                  <p className="text-[10px] uppercase tracking-wide text-[#8794ab] mb-2">Executive Summary</p>
                  <p className="text-[11px] leading-relaxed text-[#3a4763] text-justify hyphens-auto">
                    {summary}{" "}
                    <button
                      type="button"
                      onClick={() => setExecReportOpen(true)}
                      className="font-semibold text-[#174be8] hover:underline whitespace-nowrap"
                    >
                      [Expand]
                    </button>
                  </p>
                </div>

                {/* Custom slide-out panel — NO overlay so the ranked-markets list behind it stays visible & usable */}
                {execReportOpen && (
                  <div
                    className="fixed inset-y-0 right-0 z-50 w-[50vw] bg-white border-l border-[#e5eaf2] shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
                    role="dialog"
                    aria-label={`${selectedCity}, ${selectedState} executive report`}
                  >
                    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-white/95 backdrop-blur px-6 py-4 border-b border-[#eef2f7]">
                      <h2 className="text-[15px] font-bold text-[#07142f]">
                        {selectedCity}, {selectedState} — Executive Report
                      </h2>
                      <button
                        type="button"
                        onClick={() => setExecReportOpen(false)}
                        className="rounded-md p-1.5 text-[#526078] hover:bg-[#f1f4f9] hover:text-[#07142f]"
                        aria-label="Close"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="px-6 py-5 space-y-5 pb-12">
                      <div className="rounded-lg bg-[#f7faff] border border-[#e5eaf2] px-4 py-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] uppercase tracking-wide text-[#8794ab]">Composite Score</span>
                          <span className="text-[22px] font-bold text-[#07142f] tabular-nums">{score}<span className="text-[12px] text-[#8794ab] font-normal">/100</span></span>
                        </div>
                        <p className="mt-1 text-[12px] font-semibold text-[#174be8] capitalize">{verdictLabel.replace("-", " ")} market</p>
                      </div>

                      <section>
                        <h3 className="text-[13px] font-bold text-[#07142f] mb-1.5">The bottom line</h3>
                        <p className="text-[12.5px] leading-relaxed text-[#14233b] text-justify hyphens-auto">{verdictSentence}</p>
                      </section>

                      <section>
                        <h3 className="text-[13px] font-bold text-[#07142f] mb-1.5">Why this score, in plain English</h3>
                        <p className="text-[12.5px] leading-relaxed text-[#14233b] text-justify hyphens-auto mb-2">
                          Every market is scored on three categories. Each category is built from real third-party data
                          (U.S. Census, BLS, NCES, and our competitive landscape scrape). Here is how {selectedCity} did
                          on each one:
                        </p>
                        <div className="space-y-2.5">
                          <div className="rounded-md border border-[#eef2f7] bg-white p-3">
                            <p className="text-[12px] font-bold text-[#07142f] mb-1">1. Demand <span className="text-[#8794ab] font-normal">— do families here want and afford after-school STEM?</span></p>
                            <p className="text-[12px] leading-relaxed text-[#3a4763] text-justify hyphens-auto">{demandSentence}</p>
                          </div>
                          <div className="rounded-md border border-[#eef2f7] bg-white p-3">
                            <p className="text-[12px] font-bold text-[#07142f] mb-1">2. TAM Teachers <span className="text-[#8794ab] font-normal">— can we staff this location?</span></p>
                            <p className="text-[12px] leading-relaxed text-[#3a4763] text-justify hyphens-auto">{tamSentence}</p>
                          </div>
                          <div className="rounded-md border border-[#eef2f7] bg-white p-3">
                            <p className="text-[12px] font-bold text-[#07142f] mb-1">3. Competitive Opportunity <span className="text-[#8794ab] font-normal">— how crowded is this market?</span></p>
                            <p className="text-[12px] leading-relaxed text-[#3a4763] text-justify hyphens-auto">{oppSentence}</p>
                          </div>
                        </div>
                      </section>

                      {signalRows.length > 0 && (
                        <section>
                          <h3 className="text-[13px] font-bold text-[#07142f] mb-1.5">Key market signals, explained</h3>
                          <p className="text-[12px] leading-relaxed text-[#526078] text-justify hyphens-auto mb-2">
                            These are the underlying data points feeding the score. Each one comes from a named public
                            source — nothing is invented. The colored badge under each value shows where this market
                            sits relative to our benchmark thresholds across the 817-city universe.
                          </p>
                          <div className="divide-y divide-[#f1f4f9] rounded-md border border-[#eef2f7] bg-white">
                            {signalRows.map((r) => {
                              const tone = r.benchmark?.tone;
                              const toneCls =
                                tone === "good" ? "bg-[#e6f7ef] text-[#0ea66e] border-[#bde9d2]" :
                                tone === "mid"  ? "bg-[#fff8e1] text-[#b88800] border-[#f3e0a8]" :
                                tone === "bad"  ? "bg-[#fdecea] text-[#c2410c] border-[#f5cbb8]" :
                                "bg-[#f1f4f9] text-[#526078] border-[#e5eaf2]";
                              return (
                                <div key={r.key} className="px-3 py-2.5">
                                  <div className="flex items-baseline justify-between gap-3">
                                    <p className="text-[12px] font-semibold text-[#07142f]">{r.label}</p>
                                    <span className="text-[12.5px] font-bold text-[#07142f] tabular-nums whitespace-nowrap">{r.value}</span>
                                  </div>
                                  <div className="mt-1 flex items-center justify-between gap-3">
                                    <p className="text-[10.5px] text-[#8794ab]">{r.source}</p>
                                    {r.benchmark && (
                                      <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide whitespace-nowrap ${toneCls}`}>
                                        {r.benchmark.label}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      )}

                      <section>
                        <h3 className="text-[13px] font-bold text-[#07142f] mb-1.5">What we would do next</h3>
                        <p className="text-[12.5px] leading-relaxed text-[#14233b] text-justify hyphens-auto">
                          {verdict === "high"
                            ? `Move ${selectedCity} into active recruiting. Pull the top teacher candidates from this metro, draft a personalized outreach sequence, and queue this market for a deeper competitive landscape review before any signing conversation.`
                            : verdict === "moderate"
                            ? `Hold ${selectedCity} as a secondary target. Re-run the score after the next data refresh, and only escalate it if a specific local thesis emerges (a strong inbound candidate, a confirmed real-estate opportunity, or a partner referral).`
                            : `Park ${selectedCity} unless a specific local catalyst appears. The current data does not support spending outbound effort here, but the score will be re-evaluated automatically on every data refresh.`}
                        </p>
                      </section>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          <div className="rounded-lg bg-white border border-[#eef2f7] p-3">

            <h4 className="text-xs font-bold text-[#07142f] mb-1">Market Research Report</h4>
            <p className="text-[10px] text-[#8794ab] mb-2">Comprehensive PDF report with data, insights, recommendations, and competitor analysis.</p>
            <Button variant="outline" className="w-full h-8 border-[#dbe4f2] text-[#2250eb] text-[11px] font-medium" onClick={() => { setReportAutoPdf(true); setReportOpen(true); }}>
              Generate PDF Report
            </Button>
          </div>


          <div className="rounded-lg bg-white border border-[#eef2f7] p-3">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className="text-[13px] font-semibold text-[#07142f]">Key Market Signals</p>
              <span className="text-[10px] text-[#8794ab]">{preSeededCount} of 12 seeded</span>
            </div>
            {hasLiveSignals ? (
              <div className="flex flex-col divide-y divide-[#f1f4f9]">
                {sigRows.map((r) => (
                  <div key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 py-1.5">
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-medium text-[#07142f] leading-tight truncate" title={r.label}>{r.label}</p>
                      <p className="text-[10px] text-[#8794ab] leading-tight truncate" title={r.source}>{r.source}</p>
                    </div>
                    <span className="text-right text-[11.5px] font-bold text-[#07142f] tabular-nums whitespace-nowrap">{r.value}</span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setDetailDrawerOpen(true)}
                  className="mt-2 self-start inline-flex items-center gap-1 rounded-md border border-[#dbe4f2] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#174be8] hover:bg-[#f1f5ff]"
                >
                  View all signals →
                </button>
              </div>
            ) : SHOW_LIVE_REFRESH ? (
              <div className="rounded-md border border-dashed border-[#dbe4f2] bg-[#f7faff] px-3 py-4 text-center">
                <p className="text-[11.5px] text-[#526078] leading-snug">No seeded values for this market yet.</p>
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
                <p className="text-[11.5px] text-[#526078] leading-snug">Showing pre-seeded scores.</p>
              </div>
            )}
          </div>

        </div>
      </div>
      </>
      )}
      </>
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
          pickMarket({ city, state });
        }}
      />
    </div>
  );
};

export default CityScoring;
