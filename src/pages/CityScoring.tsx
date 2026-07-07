// Rule 12 (AGENTS.md): every UI surface in this file routes through
// `selectedView` / `buildMarketView()` for displayed composites. The raw
// `.compositeScore` reads that remain below are data-shaping (sorts,
// reductions, and the `selected` builder that *feeds* `selectedView`) and
// are deliberate. Drift is still caught at runtime by `assertNoCompositeDrift`.
// New rendered composite values must go through marketView — do not add raw reads.
/* eslint-disable no-restricted-syntax */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
// Lazy: jspdf (~165KB) only loads when the user opens the report modal.
const MarketReportModal = lazy(() =>
  import("@/components/city-scoring/MarketReportModal").then((m) => ({ default: m.MarketReportModal })),
);
import CitySpreadsheetView from "@/components/city-scoring/CitySpreadsheetView";
import { SourceDataPanel } from "@/components/city-scoring/SourceDataPanel";
// NearbyMarketsPanel removed from /city-scoring 2026-05-21 (its slot now hosts Key Market Signals).
// Lazy: react-leaflet (~84KB) only loads when the user toggles to Map view.
const MarketsMap = lazy(() =>
  import("@/components/city-scoring/MarketsMap").then((m) => ({ default: m.MarketsMap })),
);
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
import { ImportManusCsvDialog } from "@/components/phase2-demo/ImportManusCsvDialog";
import { useIsManager } from "@/hooks/dbHealth/useIsManager";

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
import { useSavedSearches } from "@/hooks/citySearch/useSavedSearches";
import { useAskAi } from "@/hooks/citySearch/useAskAi";
import { useScreenMode } from "@/hooks/citySearch/useScreenMode";
import { useLiveRankedMarkets, useLiveSelectedMarket } from "@/hooks/citySearch/useLiveMarketDetail";
import { useCityRanking } from "@/hooks/citySearch/useCityRanking";
import { CityTopBar } from "@/components/city-scoring/CityTopBar";
import { CityFiltersRow } from "@/components/city-scoring/CityFiltersRow";
import { CityWeightsPanel } from "@/components/city-scoring/CityWeightsPanel";
import { RankedMarketsList } from "@/components/city-scoring/RankedMarketsList";
import { QueryErrorState } from "@/components/QueryErrorState";
import { SelectedMarketPanel } from "@/components/city-scoring/SelectedMarketPanel";
import { ExecutiveSummaryPanel } from "@/components/city-scoring/ExecutiveSummaryPanel";


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
  COMPOSITE_CATEGORIES,
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
  const [screenMode, updateScreenMode] = useScreenMode();
  const [cityFilter, setCityFilter] = useState("");
  const [stateOpen, setStateOpen] = useState(false);
  // Snapshot of the user's manually-tuned ("Custom") weights so switching to a
  // preset and back doesn't lose them.
  const [customWeightsSnapshot, setCustomWeightsSnapshot] = useState<Record<CategoryKey, number> | null>(null);
  const [addCritOpen, setAddCritOpen] = useState(false);

  // Saved searches (per-user) — see src/hooks/citySearch/useSavedSearches.ts
  const {
    savedSearches,
    saveSearchOpen, setSaveSearchOpen,
    saveSearchName, setSaveSearchName,
    savingSearch,
    activeSavedSearchId,
    clearActive: clearActiveSavedSearch,
    openSaveDialog,
    handleSaveSearch,
    handleLoadSavedSearch,
    handleDeleteSavedSearch,
  } = useSavedSearches({
    onLoadedWeights: (mw) => setCustomWeightsSnapshot({ ...mw }),
  });

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
    clearActiveSavedSearch();
    setScoringModel(name);
    // Snap weights directly — the previous rAF tween caused visible page jitter
    // (rapid re-renders + animate-pulse on the connector chevron). The active-tile
    // ring + slider position change is enough to communicate cause→effect.
    setWeights(target);
    setAppliedWeights(target);
    // Presets are a "one-click recipe" — they must also wipe any sub-metric
    // overrides so a stale tweak from a past session can't silently skew the
    // composite. Without this, clicking Balanced still leaves e.g. Opportunity's
    // sub-weights pumped toward population → big cities float to the top and
    // the yellow "re-ranked with your weights" banner stays on.
    resetSubWeights();
  }, [scoringModel, appliedWeights, setWeights, setAppliedWeights, setScoringModel, resetSubWeights, clearActiveSavedSearch]);



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

  // (saved-search default name, refresh effect, and openSaveDialog moved into useSavedSearches)

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

  const toggleWatchlist = useCallback(async (cityId: string | null | undefined) => {
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
  }, [user, watchlistCityIds]);

  // (handleSaveSearch / handleLoadSavedSearch / handleDeleteSavedSearch moved into useSavedSearches)

  // ─── AI City Query (Ask AI) ──────────────────────────────────────────────
  // The fetch/threading/loading bookkeeping lives in src/hooks/citySearch/useAskAi.
  // The page is only responsible for translating the AiResult into filter +
  // weight state changes below.
  // useAskAi gets a getter so every request sends the CURRENT live session
  // state (filters, applied weights, visible count) — the AI can't reason
  // about "of these markets" / "Tier A markets" sensibly without it.
  const askAiSessionRef = useRef<{
    appliedFilters: { state: string | null; tier: string | null; minScore: number | null };
    appliedWeights: Record<string, number>;
    visibleCount: number;
    totalCount: number;
    watchlistCount: number;
  }>({
    appliedFilters: { state: null, tier: null, minScore: null },
    appliedWeights: { ...DEFAULT_WEIGHTS },
    visibleCount: 0,
    totalCount: 0,
    watchlistCount: 0,
  });
  const { aiThreadId: _aiThreadId, aiTurns, aiLoading, lastAiTurn, clearAi, ask } = useAskAi(
    () => askAiSessionRef.current,
  );
  void _aiThreadId;

  const [priorWeights, setPriorWeights] = useState<Record<string, number> | null>(null);

  const askAi = async (query: string) => {
    // Snapshot weights BEFORE the AI changes them, so the answer card can
    // show a "Demand 40 → 25" diff.
    const snapshot = { ...appliedWeights } as Record<string, number>;
    const result = await ask(query);
    if (!result) return;
    setPriorWeights(snapshot);

    // Defensive defaults — `answer_factual` returns no filters/weights blocks.
    // Without these guards the page crashes on every factual question with
    // "Cannot read properties of undefined (reading 'state')".
    const f = result.filters ?? { state: null, tier: null, minScore: null };
    if (f.state) setStateFilter(f.state);
    if (f.tier) setTierFilter(f.tier);
    if (typeof f.minScore === "number") setMinScore(f.minScore);

    // Apply weights — absolute mode sets sliders to exactly what user asked;
    // delta mode keeps the old nudge + dominant-detection behavior.
    const mode = (result as unknown as { weightMode?: string }).weightMode === "absolute" ? "absolute" : "delta";
    const abs = (result as unknown as { absoluteWeights?: Record<string, number> }).absoluteWeights ?? {};
    const adj = result.weightAdjustments ?? {};
    const adjEntries = (Object.entries(adj) as [CategoryKey, number][])
      .filter(([, v]) => Number(v) !== 0);

    if (mode === "absolute") {
      setScoringModel("Custom");
      clearActiveSavedSearch();
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
      clearActiveSavedSearch();
      setWeights((prev) => {
        const keys = Object.keys(prev) as CategoryKey[];
        // Single-category dominant intent ("rank by demand", "focus on pricing power")
        // should produce a clearly dominant slider, not a 17% nudge.
        const positives = adjEntries.filter(([, v]) => v > 0);
        const isDominant = positives.length === 1
          && adjEntries.every(([k, v]) => (k === positives[0][0] ? v > 0 : v <= 0));

        const next = { ...prev } as Record<CategoryKey, number>;
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

    // Apply sub-metric boosts (additive, then re-normalize within each pillar
    // to keep the slider invariant: each pillar's sub-weights sum to 100).
    const boosts = (result as unknown as { subMetricBoosts?: Array<{ key: string; delta: number; pillar: string; label: string }> }).subMetricBoosts ?? [];
    if (boosts.length > 0) {
      const grouped: Record<string, Array<{ key: string; delta: number }>> = {};
      for (const b of boosts) {
        const p = b.pillar as CategoryKey;
        if (!grouped[p]) grouped[p] = [];
        grouped[p].push({ key: b.key, delta: b.delta });
      }
      const nextSub = JSON.parse(JSON.stringify(appliedSubWeights)) as typeof appliedSubWeights;
      for (const pillar of Object.keys(grouped) as CategoryKey[]) {
        const pillarWeights = { ...(nextSub[pillar] ?? {}) };
        for (const { key, delta } of grouped[pillar]) {
          if (pillarWeights[key] == null) continue;
          pillarWeights[key] = Math.max(0, Math.min(100, pillarWeights[key] + delta));
        }
        const sum = Object.values(pillarWeights).reduce((s, v) => s + v, 0) || 1;
        const keys = Object.keys(pillarWeights);
        let running = 0;
        keys.forEach((k, i) => {
          if (i === keys.length - 1) pillarWeights[k] = Math.max(0, 100 - running);
          else {
            const v = Math.round((pillarWeights[k] / sum) * 100);
            pillarWeights[k] = v;
            running += v;
          }
        });
        nextSub[pillar] = pillarWeights;
      }
      setAppliedSubWeights(nextSub);
      toast.success(`AI nudged ${boosts.length} sub-metric${boosts.length > 1 ? "s" : ""} — ranking refined.`);
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




  // Ranked universe is mount-loaded; per-market detail is wired in below the
  // selectedCity/selectedState derivation.
  const { liveRankedMarkets, setLiveRankedMarkets, error: rankedError, refetch: refetchRanked } = useLiveRankedMarkets();
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [execReportOpen, setExecReportOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportAutoPdf, setReportAutoPdf] = useState(false);
  const [addCityOpen, setAddCityOpen] = useState(false);
  const viewMode = useCityScoringStore((s) => s.viewMode);
  const setViewMode = useCityScoringStore((s) => s.setViewMode);

  // (URL deep-link hydration moved into useMarketSelection.)

  // (live ranked markets + selected-detail effects moved into useLiveMarketDetail.)

  const baseRankedMarkets = useMemo<RankedMarket[]>(
    // Single source of truth: us_cities_scored. No sample fallback — if the
    // seeded list hasn't loaded yet, the list is empty (loading state) rather
    // than showing mock cities that don't exist in the backend.
    () => liveRankedMarkets,
    [liveRankedMarkets],
  );

  // Effective compare selection: drop any ids that aren't in the live
  // universe (defensive — handles stale localStorage from earlier versions
  // and the deduper) and cap at 4 so the count badge and the modal agree.
  // May 26 bug: user selected 2 rows but the Compare modal opened with 4.
  const effectiveSelectedForCompare = useMemo(() => {
    const live = new Set(baseRankedMarkets.map((m: any) => m.id));
    return selectedForCompare.filter((id) => live.has(id)).slice(0, 4);
  }, [selectedForCompare, baseRankedMarkets]);

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

  const {
    rerankedUniverse,
    filtered,
    weightsPending,
    committedTierCounts,
    liveScoredTotal,
    filteredLiveCount,
    previewTierCounts,
    tierBarExtras,
    mapMarkets,
    percentileById,
  } = useCityRanking({
    baseRankedMarkets,
    appliedWeights,
    appliedSubWeights,
    weights,
    filters: {
      searchTerm,
      stateFilter,
      tierFilter,
      nonRegOnly,
      minScore,
      minPop,
      cityFilter,
      watchlistOnly,
      watchlistCityIds,
    },
  });


  // Reset pagination whenever filter inputs change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, stateFilter, tierFilter, nonRegOnly, minScore, minPop, cityFilter]);

  // Keep the Ask AI session ref synced with live UI state. Every Ask AI
  // request reads from this ref so the model reasons about what the user
  // actually sees on screen right now.
  useEffect(() => {
    askAiSessionRef.current = {
      appliedFilters: {
        state: stateFilter && stateFilter !== "All" ? stateFilter : null,
        tier: tierFilter && tierFilter !== "All" ? tierFilter : null,
        minScore: Number(minScore) > 0 ? Number(minScore) : null,
      },
      appliedWeights: { ...appliedWeights },
      visibleCount: filtered.length,
      totalCount: baseRankedMarkets.length,
      watchlistCount: watchlistCityIds.size,
    };
  }, [stateFilter, tierFilter, minScore, appliedWeights, filtered.length, baseRankedMarkets.length, watchlistCityIds]);


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

  const hasOverrides =
    subWeightsKey !== defaultSubWeightsKey ||
    (scoringModel === "Custom" && appliedWeightsKey !== defaultMasterWeightsKey);

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
  const {
    liveCity, liveSignals, liveCategoryScores, liveCompetitors, liveJob,
    marketRefreshVersion, bumpRefresh, reloadSelectedMarketView,
  } = useLiveSelectedMarket({ selectedCity, selectedState, selectedMarketKey, setLiveRankedMarkets });
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
  // (loadLiveData + (selectedCity, selectedState) hydrate-then-refetch moved into useLiveMarketDetail.)

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

  // (reloadSelectedMarketView provided by useLiveMarketDetail.)

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
    const nextDefaults = { ...defaultWeights };
    setScoringModel("Balanced");
    setWeights(nextDefaults);
    setAppliedWeights(nextDefaults);
    setAppliedSubWeights(DEFAULT_SUB_WEIGHTS as typeof appliedSubWeights);
    resetSubWeights();
    toast.success("Weights reset to defaults");
  };

  const toggleCompare = useCallback((id: number) => {
    setSelectedForCompare((p) => {
      if (p.includes(id)) return p.filter((i) => i !== id);
      if (p.length >= 4) {
        toast.error("You can compare up to 4 markets at a time");
        return p;
      }
      return [...p, id];
    });
  }, [setSelectedForCompare]);

  const buildCsvDownload = async () => {
    try {
      // Sheet 1 ("Selected Cities (Raw Metrics)"): only the backend columns
      // the dashboard actually maps, so the exported sheet and the on-screen
      // spreadsheet show the same picture. Identity columns (City/State/
      // County/Metro) come from the mapped UI row so they're always populated.
      const DASHBOARD_DB_KEYS = [
        "place_type",
        "is_registration_state",
        "composite_score_default",
        "score_demand",
        "score_tam_teachers",
        // score_csi and csi_* columns removed 2026-07-07 — CSI is no longer part of the composite.
        "population",
        "children_5_12",
        "median_household_income",
        "dual_working_families_pct",
        "college_degree_pct",
        "stem_job_concentration",
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
        "scored_at",
        "census_last_updated",
      ];
      const dbKeys = DASHBOARD_DB_KEYS;
      // Two display-layer columns sit at the front so non-technical reviewers
      // immediately see both numbers side-by-side:
      //   • "Weighted Composite Index (raw)" — the raw weighted math (drives sort + tiers)
      //   • "Total Score (calibrated)"       — the school-grade display number
      // composite_score_default in dbKeys is the same as the raw Index.
      const { buildMarketView } = await import("@/lib/marketView");
      const backendHeader = [
        "City",
        "State",
        "County",
        "Metro Area",
        "Weighted Composite Index (raw)",
        "Total Score (calibrated)",
        ...dbKeys,
      ];
      const buildBackendRow = (m: any): (string | number | null)[] => {
        const r = m?.scoredRow ?? {};
        const v = buildMarketView(m);
        const head: (string | number | null)[] = [
          m.city ?? null,
          m.state ?? null,
          m.county ?? null,
          m.metroArea ?? null,
          v.hasLiveData ? v.rawComposite : null,
          v.hasLiveData ? v.composite : null,
        ];
        const tail = dbKeys.map((k) => {
          const val = (r as any)[k];
          if (val == null) return null;
          if (typeof val === "number" || typeof val === "string") return val;
          if (typeof val === "boolean") return val ? "true" : "false";
          try { return JSON.stringify(val); } catch { return String(val); }
        });
        return [...head, ...tail];
      };

      const backendRows: (string | number | null)[][] = filtered.map(buildBackendRow);

      // Sheet 4 ("All Cities (Raw Metrics)"): the FULL underlying dataset
      // (all ~817 cities), independent of the user's current filter. Same
      // column shape as the Selected Cities sheet.
      const fullDatabaseHeader = backendHeader;
      const fullDatabaseRows: (string | number | null)[][] =
        baseRankedMarkets.map(buildBackendRow);

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
        fullDatabaseHeader,
        fullDatabaseRows,
        weightsCities,
        appliedWeights: appliedWeights as Record<CategoryKey, number>,
        appliedSubWeights: appliedSubWeights as Record<CategoryKey, Record<string, number>>,
        exportedAt: new Date().toISOString(),
      });
      const filename = `ranked-markets-live-${new Date().toISOString().slice(0, 10)}.xlsx`;
      downloadWorkbook(wb, filename);

      toast.success(
        `Exported: Selected Cities (${filtered.length}) + Weights Snapshot + Per-City Weights + All Cities (${baseRankedMarkets.length})`,
      );
    } catch (err) {
      console.error("Export XLSX failed", err);
      toast.error("Export failed — see console");
    }
  };


  const openCompare = useCallback(() => {
    if (effectiveSelectedForCompare.length < 2) {
      toast.error("Select at least 2 markets to compare");
      return;
    }
    setCompareOpen(true);
  }, [effectiveSelectedForCompare]);

  const applyWeights = () => {
    if (totalWeight !== 100) return;
    setAppliedWeights({ ...weights });
    setAppliedSubWeights(subWeights);
    // While the user is in Custom mode, keep the snapshot in sync with the
    // most recently applied weights so a round-trip through a preset restores them.
    if (scoringModel === "Custom") setCustomWeightsSnapshot({ ...weights });
    toast.success("Composite score recalculated from current weights.");
  };

  const handleFindTeachers = useCallback(() => {
    navigate(`/teacher-prospects?city=${encodeURIComponent(selected.city)}&state=${encodeURIComponent(selected.state)}`);
  }, [navigate, selected.city, selected.state]);

  const handleFindTeachersForSelected = useCallback(() => {
    const picked = baseRankedMarkets.filter((m: any) => effectiveSelectedForCompare.includes(m.id)).slice(0, 10);
    if (picked.length === 0) {
      toast.error("Select at least 1 market first (use the checkbox).");
      return;
    }
    const cities = picked.map((m: any) => m.city).join(",");
    const states = picked.map((m: any) => m.state).join(",");
    navigate(`/teacher-prospects?city=${encodeURIComponent(cities)}&state=${encodeURIComponent(states)}`);
  }, [baseRankedMarkets, effectiveSelectedForCompare, navigate]);

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
      bumpRefresh();

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

  // 2026-05-27 unification: the displayed pillar scores MUST match what the
  // table row + RowScorePopover + Compare modal show for the same city under
  // the same weights. All three of those read the recomputed pillars written
  // back onto each row by `useCityRanking` (which calls
  // `buildRecomputedPillarScores`). Reading from `selectedRerankedMarket`
  // here makes this panel use exactly the same numbers — "one calibrated
  // number everywhere." `recomputedByCategory` below still drives the per-
  // metric Show-formula popover (which legitimately wants the merged-live-
  // signals view, including childrenPct overrides for the selected market).
  const detailCategoryScores = useMemo(() => {
    const rerankedCats = selectedRerankedMarket?.categoryScores as
      | Partial<Record<CategoryKey, number | null>>
      | undefined;
    const out = { ...baseDetailCategoryScores } as Record<CategoryKey, number>;
    (Object.keys(out) as CategoryKey[]).forEach((k) => {
      if (!Number.isFinite(out[k])) delete (out as any)[k];
    });
    if (rerankedCats) {
      (Object.keys(rerankedCats) as CategoryKey[]).forEach((k) => {
        const v = rerankedCats[k];
        if (v != null && Number.isFinite(Number(v))) out[k] = Math.round(Number(v));
      });
    }
    return out;
  }, [baseDetailCategoryScores, selectedRerankedMarket]);

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
    A: { bg: "#e6f7ef", fg: "#0ea66e", label: "Tier A" },
    B: { bg: "#eaf0ff", fg: "#174be8", label: "Tier B" },
    C: { bg: "#fff6dc", fg: "#b8860b", label: "Tier C" },
    D: { bg: "#ffeede", fg: "#ea580c", label: "Tier D" },

  };
  const tierBadge = TIER_BADGE[displayTier];
  const opportunityLabel =
    displayTier === "A" ? "Top Priority Market" :
    displayTier === "B" ? "Strong Market" :
    displayTier === "C" ? "Watch Market" : "Saturated Market";

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
    // Competitive Landscape (single input after Prompt 1 refactor 2026-07-07)
    "csi_national_brand_supply",
  ];

  const KEY_SIGNAL_META: Record<string, { label: string; source: string; sourceUrl?: string }> = (() => {
    const out: Record<string, { label: string; source: string; sourceUrl?: string }> = {};
    for (const m of SOW_METRIC_REGISTRY) {
      out[m.key] = { label: m.label, source: m.source, sourceUrl: m.sourceUrl };
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

  const sigRows = useMemo(() => KEY_SIGNAL_KEYS.map((key) => {
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
      sourceUrl: meta?.sourceUrl,
      value,
      rawValue: isEmpty ? null : String(rawVal),
      benchmark,
    };
  // benchmarkBand/formatSignalValue/KEY_SIGNAL_META/SIGNAL_DISPLAY are module-level constants.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [signalsByKey]);

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
      <CityTopBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        screenMode={screenMode}
        onExportCsv={buildCsvDownload}
        onOpenReport={() => setReportOpen(true)}
        initials={initials}
        displayName={displayName}
        role={role}
        email={profile?.email || user?.email}
        onNavigateTeam={() => navigate("/settings/team")}
        onLogout={handleLogout}
      />

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
      <CityWeightsPanel
        weights={weights}
        setWeights={setWeights}
        totalWeight={totalWeight}
        weightsPending={weightsPending}
        previewTierCounts={previewTierCounts}
        committedTierCounts={committedTierCounts}
        resetWeights={resetWeights}
        openSaveDialog={openSaveDialog}
        applyWeights={applyWeights}
        scoringModel={scoringModel}
        setScoringModel={setScoringModel}
        applyPresetByName={applyPresetByName}
        presetTweening={presetTweening}
        customCriteria={customCriteria}
        supabaseCustomCriteria={supabaseCustomCriteria}
        setOpenSubMetricsFor={setOpenSubMetricsFor}
      />

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
          parts: COMPOSITE_CATEGORIES.map((c) => ({
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
          priorWeights={priorWeights ?? undefined}
        />

      )}

      {/* Filters row */}
      <CityFiltersRow
        stateOpen={stateOpen}
        setStateOpen={setStateOpen}
        stateFilter={stateFilter}
        setStateFilter={setStateFilter}
        availableStates={availableStates}
        cityFilter={cityFilter}
        setCityFilter={setCityFilter}
        minPop={minPop}
        setMinPop={setMinPop}
        minScore={minScore}
        setMinScore={setMinScore}
        tierFilter={tierFilter}
        setTierFilter={setTierFilter}
        nonRegOnly={nonRegOnly}
        setNonRegOnly={setNonRegOnly}
        refreshingMarket={refreshingMarket}
        onRefreshData={handleRefreshData}
      />
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
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading map…</div>}>
          <MarketsMap
            markets={mapMarkets}
            onSelect={(m) => {
              const sample = sampleCities.find((s) => sameMarket(s.city, s.state, m.city, m.state));
              pickMarket({ city: m.city, state: m.state, id: sample?.id });
              setViewMode("table");
            }}
          />
        </Suspense>
      ) : (
      <>
      {/* TierCountsBar moved up — now sits between Scoring Weights and Ask AI. */}
      {rankedError && liveRankedMarkets.length === 0 && (
        <QueryErrorState
          title="Couldn't load markets"
          message={rankedError.message}
          onRetry={refetchRanked}
        />
      )}
      {rankedError && liveRankedMarkets.length > 0 && (
        <QueryErrorState
          variant="banner"
          title="Showing cached markets — latest refresh failed"
          message={rankedError.message}
          onRetry={refetchRanked}
        />
      )}
      {/* Three-column layout */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr_1fr] items-stretch">
        {/* Left: Ranked Markets */}
        <RankedMarketsList
          filteredCount={filtered.length}
          pageItems={pageItems}
          pageStart={pageStart}
          selectedCity={selectedCity}
          selectedState={selectedState}
          pickMarket={pickMarket}
          selectedForCompare={effectiveSelectedForCompare}
          toggleCompare={toggleCompare}
          compareMode={compareMode}
          watchlistOnly={watchlistOnly}
          setWatchlistOnly={setWatchlistOnly}
          watchlistCityIds={watchlistCityIds}
          toggleWatchlist={toggleWatchlist}
          handleFindTeachersForSelected={handleFindTeachersForSelected}
          openCompare={openCompare}
          hasOverrides={hasOverrides}
          resetWeights={resetWeights}
          appliedWeights={appliedWeights}
          percentileById={percentileById}
          showingFrom={showingFrom}
          showingTo={showingTo}
          page={safePage}
          safePage={safePage}
          totalPages={totalPages}
          pageNumbers={pageNumbers}
          setPage={setPage}
          activeFilterSummary={[
            stateFilter !== "All" && `State: ${stateFilter}`,
            tierFilter !== "All" && `Tier: ${tierFilter}`,
            nonRegOnly && "Non-registration only",
            Number(minScore) > 0 && `Min score: ${minScore}`,
            Number(minPop) > 0 && `Min pop: ${Number(minPop).toLocaleString()}`,
            cityFilter.trim() && `City: "${cityFilter.trim()}"`,
            searchTerm.trim() && `Search: "${searchTerm.trim()}"`,
          ].filter(Boolean).join(" · ") || undefined}
          hasActiveFilters={
            stateFilter !== "All" ||
            tierFilter !== "All" ||
            nonRegOnly ||
            Number(minScore) > 0 ||
            Number(minPop) > 0 ||
            cityFilter.trim().length > 0 ||
            searchTerm.trim().length > 0
          }
          onClearAllFilters={() => {
            setStateFilter("All");
            setTierFilter("All");
            setNonRegOnly(false);
            setMinScore(0);
            setMinPop("");
            setCityFilter("");
            setSearchTerm("");
            toast.success("Filters cleared.");
          }}
        />


        {/* Center: Selected Market Detail */}
        <SelectedMarketPanel
          showLiveRefresh={SHOW_LIVE_REFRESH}
          lastScrapedRelative={lastScrapedRelative}
          lastScrapedAbsolute={lastScrapedAbsolute}
          isStale={isStale}
          selected={selected}
          selectedHasLiveData={selectedHasLiveData}
          selectedLiveCity={selectedLiveCity}
          watchlistCityIds={watchlistCityIds}
          toggleWatchlist={toggleWatchlist}
          weightedComposite={weightedComposite}
          tierBadge={tierBadge}
          opportunityLabel={opportunityLabel}
          appliedWeights={appliedWeights}
          appliedTotal={appliedTotal}
          detailCategoryScores={detailCategoryScores}
          detailScore={detailScore}
          displayMarketType={displayMarketType}
          displayMetroArea={displayMetroArea}
          displayCounty={displayCounty}
          onFindTeachers={handleFindTeachers}
          onOpenCompare={openCompare}
          onOpenReport={() => setReportOpen(true)}
          onOpenDetailDrawer={() => setDetailDrawerOpen(true)}
        />


        {/* Right column */}
        <div className="min-w-0 space-y-3 flex flex-col">
          {SHOW_LIVE_REFRESH && (
            <SourceDataPanel
              cityId={liveCity?.id ?? null}
              refreshKey={marketRefreshVersion}
              onViewEvidence={() => setDetailDrawerOpen(true)}
            />
          )}

          <ExecutiveSummaryPanel
            selectedCity={selectedCity}
            selectedState={selectedState}
            cityId={selected.cityId ?? null}
            detailScore={detailScore}
            detailCategoryScores={detailCategoryScores}
            sigRows={sigRows}
            execReportOpen={execReportOpen}
            setExecReportOpen={setExecReportOpen}
          />


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
                      {r.sourceUrl ? (
                        <a
                          href={r.sourceUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] text-[#8794ab] hover:text-[#174be8] hover:underline leading-tight truncate block"
                          title={`Open source: ${r.source}`}
                        >
                          {r.source} ↗
                        </a>
                      ) : (
                        <p className="text-[10px] text-[#8794ab] leading-tight truncate" title={r.source}>{r.source}</p>
                      )}
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
        markets={baseRankedMarkets.filter((m) => effectiveSelectedForCompare.includes(m.id)).slice(0, 4)}
        appliedSubWeights={appliedSubWeights as Record<string, Record<string, number>>}
        appliedWeights={appliedWeights}
        presetName={scoringModel}
      />

      {reportOpen && (
        <Suspense fallback={null}>
          <MarketReportModal
            open={reportOpen}
            onClose={() => { setReportOpen(false); setReportAutoPdf(false); }}
            market={selected}
            categoryScores={detailCategoryScores}
            sigRows={sigRows}
            cityId={selected.cityId ?? null}
            autoDownload={reportAutoPdf}
            detailScore={Number(detailScore) || 0}
          />
        </Suspense>
      )}

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
