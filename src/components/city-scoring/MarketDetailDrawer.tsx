import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CityData } from "@/data/cityData";
import { ArrowRight, ChevronDown, ChevronRight, Download, ExternalLink, FileText, Info, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSignalGeography, GEO_BADGE_CLASS } from "@/lib/signalGeography";
import { useCustomCriteria, CATEGORY_LABEL_TO_KEY } from "@/hooks/useCustomCriteria";
import type { CategoryKey } from "@/stores/cityScoringStore";
import { METRICS_BY_CATEGORY, SOW_METRIC_REGISTRY, type SowMetricEntry } from "@/lib/sowMetricRegistry";
import { FETCHER_DIAGNOSTIC_KEYS, canonicalKey } from "@/lib/signalAliases";
import { buildSeededFallbackSignalsFromScored } from "@/lib/cityScoringLiveData";

export interface CustomCriterion {
  name: string;
  category: string;
  weight: number;
  source: string;
  notes: string;
}

interface Props {
  market: CityData;
  refreshVersion?: number;
  open: boolean;
  onClose: () => void;
  categoryScores: Record<string, number>;
  customCriteria: CustomCriterion[];
  onFindTeachers: () => void;
  onGenerateReport: () => void;
  onExport: () => void;
}

type MetricStatus = "live" | "proxy" | "missing" | "blocked" | "manual";
type MetricCategory =
  | "demand"
  | "pricing_power"
  | "competitive_landscape"
  | "franchisee_supply"
  | "ease_of_operations"
  | "parent_mindset";

type LiveSignal = {
  id?: string;
  signal_key?: string;
  label?: string;
  value?: string | number | null;
  source?: string | null;
  source_url?: string | null;
  confidence?: number | null;
  updated_at?: string | null;
  raw_data?: {
    status?: MetricStatus;
    metric_category?: MetricCategory;
    used_in_score?: boolean;
    notes?: string | null;
    [key: string]: unknown;
  } | null;
};

type LiveCompetitor = {
  id?: string;
  name?: string;
  type?: string | null;
  category?: string | null;
  source?: string | null;
  source_url?: string | null;
};

function buildSeededFallbackSignals(market: CityData): LiveSignal[] {
  const scored = (market as any).scored;
  if (!scored) return [];
  const childrenPct = Number((market as any).childrenPct ?? (market as any).children_pct ?? 0) || undefined;
  // Use the shared seeded-signal builder so the drawer stays in sync with the
  // center panel. Null values are kept and rendered as "—" so coverage gaps
  // are visible instead of looking like a UI bug.
  return buildSeededFallbackSignalsFromScored(scored, childrenPct) as unknown as LiveSignal[];
}

const SOW_CATEGORIES: { key: MetricCategory; label: string }[] = [
  { key: "demand", label: "Demand" },
  { key: "franchisee_supply", label: "TAM Teachers" },
  { key: "competitive_landscape", label: "Competitive Landscape" },
];

// 12-metric whitelist (Demand 4 + TAM Teachers 5 + Competitive Landscape 3)
// — locks the drawer to the same inputs shown in Key Market Signals.
const KEY_METRIC_KEYS: ReadonlySet<string> = new Set([
  "children_5_12_count",
  "median_household_income",
  "dual_income_household_pct",
  "education_bachelors_plus_pct",
  "public_elementary_school_count",
  "public_elementary_teacher_count",
  "private_charter_school_count",
  "public_elementary_enrollment",
  "col_salary_index",
  "csi_national_brand_supply",
  "csi_local_camp_estimate",
  "csi_demand_adjusted_market",
]);

// Per-category server-side formulas, extracted verbatim from
// supabase/functions/_shared/scoring.ts (calculateCurrentCategoryScores).
// Surfaced in the drawer so Sam can see how each 0–100 number is built
// without reading code (AGENTS.md Rule 1: "Show the math").
const CATEGORY_FORMULAS: Record<MetricCategory, { formula: string; inputs: string[]; clamp: string }> = {
  demand: {
    formula: "50 + (elementary_count × 3) + (preschool_count × 1.5) + (firecrawl_signal × 1) + censusBoost",
    inputs: [
      "censusBoost = min(15, log10(population) × 2.5) + min(10, (children_pct − 18) × 0.8)",
      "Census ACS: total_population, % children 5–12",
      "Counted: elementary schools, preschools, Firecrawl enrichment signals",
    ],
    clamp: "Result clamped to [40, 98].",
  },
  pricing_power: {
    formula: "45 + (private_school_count × 4) + (parent_mindset_signal × 1) + incomeBoost",
    inputs: [
      "incomeBoost = min(20, (median_HHI − 60000) / 4000) + min(10, (income_100k_pct − 25) × 0.4) + min(8, (income_150k_pct − 10) × 0.5)",
      "Census ACS: median household income, % $100k+, % $150k+",
      "Counted: private schools",
    ],
    clamp: "Result clamped to [40, 98].",
  },
  competitive_landscape: {
    formula: "95 − (competitor_count × 3) − (stem_camp_count × 1.5)",
    inputs: [
      "Apify/Google Maps: total summer camps, STEM/robotics/maker camps",
      "Inverted: more competitors = lower score (95 is the unsaturated ceiling)",
    ],
    clamp: "Result clamped to [40, 98].",
  },
  franchisee_supply: {
    formula: "55 + (elementary_count × 3) + (private_school_count × 2) + supplyAdj",
    inputs: [
      "supplyAdj = clamp(−6, +6, (65000 − BLS_teacher_mean_wage) / 4000)",
      "BLS OEWS: teacher mean wage",
      "NCES CCD: elementary + private school counts (proxy for teacher pool)",
      "Lower teacher pay nudges the score up (more recruiting pull).",
    ],
    clamp: "Result clamped to [40, 98].",
  },
  ease_of_operations: {
    formula: "55 + (rental_venue_count × 4) + easeAdj",
    inputs: [
      "easeAdj = clamp(−5, +5, (32000 − BLS_rec_or_childcare_wage) / 3000)",
      "BLS OEWS: recreation worker wage (fallback: childcare worker wage)",
      "Counted: rentable venues (schools, churches, rec centers)",
    ],
    clamp: "Result clamped to [40, 98].",
  },
  parent_mindset: {
    formula: "50 + (parent_signal × 3) + (private_school_count × 1.5) + (firecrawl_signal × 0.5) + mindsetBoost",
    inputs: [
      "mindsetBoost = min(20, (bachelors_pct − 30) × 0.6) + min(6, (children_pct − 18) × 0.4)",
      "Census ACS: % bachelor's degree or higher, % children 5–12",
      "Counted: private schools, Firecrawl enrichment hits",
    ],
    clamp: "Result clamped to [40, 98].",
  },
};

const CATEGORY_KEY_TO_SCORE_PROP: Record<MetricCategory, string> = {
  demand: "demand",
  pricing_power: "pricingPower",
  competitive_landscape: "competitiveLandscape",
  franchisee_supply: "franchiseeSupply",
  ease_of_operations: "easeOfOperations",
  parent_mindset: "parentMindset",
};

const STATUS_STYLES: Record<MetricStatus, string> = {
  live: "bg-[#e6f7ef] text-[#0ea66e] border-[#bfead6]",
  proxy: "bg-[#e6f7ef] text-[#0ea66e] border-[#bfead6]",
  missing: "bg-[#f3f6fb] text-[#526078] border-[#e5eaf2]",
  blocked: "bg-[#ffeede] text-[#ea580c] border-[#ffd0a8]",
  manual: "bg-[#fff6dc] text-[#b8860b] border-[#f4df9a]",
};

function formatDate(value?: string | null) {
  if (!value) return "Seed pending";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function relativeTime(value?: string | null) {
  if (!value) return "—";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "—";
  const diffSec = Math.max(0, (Date.now() - then) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400)}d ago`;
  if (diffSec < 86400 * 365) return `${Math.floor(diffSec / (86400 * 30))}mo ago`;
  return `${Math.floor(diffSec / (86400 * 365))}y ago`;
}

function getStatus(signal: LiveSignal): MetricStatus {
  const v = signal.value;
  const isEmpty =
    v == null ||
    v === "" ||
    v === "—" ||
    (typeof v === "string" && /not available/i.test(v));
  if (isEmpty) return "missing";
  const explicit = signal.raw_data?.status as MetricStatus | undefined;
  if (explicit) return explicit;
  return "live";
}

const STATUS_LABEL: Record<MetricStatus, string> = {
  live: "Pre-seeded",
  proxy: "Pre-seeded",
  missing: "Not seeded",
  blocked: "Source unavailable",
  manual: "Manual",
};

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

// Build a lookup from canonical signal_key → registry category, derived from
// the SOW registry itself so the drawer cannot drift from the spec.
// (registry-by-category lookup not needed — drawer iterates METRICS_BY_CATEGORY directly)

// (legacy getCategory removed — drawer is now driven by the SOW registry directly)

function StatusBadge({ status }: { status: MetricStatus }) {
  return (
    <span className={`rounded-full border px-1.5 py-px text-[9px] font-bold uppercase tracking-wide ${STATUS_STYLES[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function ScoreImpactBadge({ used }: { used: boolean }) {
  return used ? (
    <span
      className="rounded-full border border-[#bfead6] bg-[#e6f7ef] px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-[#0ea66e]"
      title="This metric counts toward the composite score"
    >
      ✓ Counts
    </span>
  ) : (
    <span
      className="rounded-full border border-[#e5eaf2] bg-[#f3f6fb] px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-[#526078]"
      title="Informational only — not used in score"
    >
      Info only
    </span>
  );
}

function GeoBadge({ source, signalKey }: { source?: string | null; signalKey?: string | null }) {
  const geo = getSignalGeography(source, signalKey);
  return (
    <span
      className={`rounded-full border px-1.5 py-px text-[9px] font-bold uppercase tracking-wide ${GEO_BADGE_CLASS[geo.level]}`}
      title={geo.full}
    >
      {geo.short}
    </span>
  );
}

export function MarketDetailDrawer({
  market,
  refreshVersion = 0,
  open,
  onClose,
  categoryScores,
  onFindTeachers,
  onGenerateReport,
  onExport,
}: Props) {
  const stateAbbr = market.state === "Texas" ? "TX" : market.state === "Florida" ? "FL" : market.state;
  const [loading, setLoading] = useState(false);
  const [signals, setSignals] = useState<LiveSignal[]>([]);
  const [competitors, setCompetitors] = useState<LiveCompetitor[]>([]);
  const [latestJob, setLatestJob] = useState<any | null>(null);

  useEffect(() => {
    if (!open) return;

    const loadLiveEvidence = async () => {
      setLoading(true);
      try {
        // Canonical-only: cityId is us_cities_scored.id. We no longer read
        // the discarded legacy `cities` table — its rows polluted counts.
        const cityId = market.cityId;
        if (!cityId) {
          setSignals([]);
          setCompetitors([]);
          setLatestJob(null);
          return;
        }

        // Legacy `city_market_signals` was severed on 2026-05-21.
        // Live evidence rows are synthesized from us_cities_scored columns.
        const fallbackSignals = buildSeededFallbackSignals(market);
        const competitorRows: any[] = [];
        const canonicalJobRows: any[] = [];

        setSignals(fallbackSignals as LiveSignal[]);
        setCompetitors(competitorRows as LiveCompetitor[]);
        setLatestJob(canonicalJobRows?.[0] ?? null);

      } catch (error) {
        console.error("MarketDetailDrawer live evidence error", error);
      } finally {
        setLoading(false);
      }
    };

    loadLiveEvidence();
  }, [open, market.cityId, market.city, market.state, refreshVersion]);

  const handleExportRawSignals = () => {
    if (!signals.length) {
      // Fall back to a header-only file so the user still gets feedback
      // instead of a silent click.
    }
    const header = ["Signal Key", "Label", "Value", "Unit", "Source", "Source URL", "Last Updated"];
    const rows: string[][] = [header];
    for (const s of signals) {
      const unit =
        (s.raw_data && typeof s.raw_data === "object" && "unit" in s.raw_data
          ? String((s.raw_data as any).unit ?? "")
          : "") || "";
      rows.push([
        String(s.signal_key ?? ""),
        String(s.label ?? ""),
        String(s.value ?? ""),
        unit,
        String(s.source ?? ""),
        String(s.source_url ?? ""),
        s.updated_at ? new Date(s.updated_at).toISOString() : "",
      ]);
    }
    const csv = rows
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = market.city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    a.href = url;
    a.download = `${slug}-source-data-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Build a lookup of stored signals keyed by canonical signal_key. We keep
  // the most-recently-updated row when duplicates exist (legacy + canonical).
  const signalsByCanonical = useMemo(() => {
    const out: Record<string, LiveSignal> = {};
    for (const s of signals) {
      const k = canonicalKey(s.signal_key);
      if (!k) continue;
      if (FETCHER_DIAGNOSTIC_KEYS.has(s.signal_key ?? "")) continue;
      const prev = out[k];
      if (!prev) { out[k] = s; continue; }
      const a = new Date(prev.updated_at ?? 0).getTime();
      const b = new Date(s.updated_at ?? 0).getTime();
      if (b >= a) out[k] = s;
    }
    return out;
  }, [signals]);

  // Diagnostic rows surface in their own collapsible at the bottom.
  const diagnosticRows = useMemo(
    () => signals.filter((s) => s.signal_key && FETCHER_DIAGNOSTIC_KEYS.has(s.signal_key)),
    [signals],
  );

  // Backend-authored per-metric status map. When present (current edge fn
  // writes this on every refresh), it is the single source of truth for
  // coverage badges and per-row status. Falls back to client-side derivation
  // for legacy job rows written before this field existed.
  const statusMap = (latestJob?.response_summary?.metric_status_map ?? null) as
    | Record<string, {
        status?: MetricStatus;
        used_in_score?: boolean;
        value?: unknown;
        source?: string | null;
        source_url?: string | null;
        confidence?: number | null;
        updated_at?: string | null;
        label?: string | null;
        notes?: string | null;
      }>
    | null;

  // Per-row coverage status derived from the registry + (preferred) status map
  // or (fallback) DB row.
  type Coverage = { metric: SowMetricEntry; signal: LiveSignal | null; status: MetricStatus };
  const coverageByCategory = useMemo(() => {
    const out: Record<MetricCategory, { enabled: Coverage[]; disabled: Coverage[] }> = {
      demand: { enabled: [], disabled: [] },
      pricing_power: { enabled: [], disabled: [] },
      competitive_landscape: { enabled: [], disabled: [] },
      franchisee_supply: { enabled: [], disabled: [] },
      ease_of_operations: { enabled: [], disabled: [] },
      parent_mindset: { enabled: [], disabled: [] },
    };
    (Object.keys(METRICS_BY_CATEGORY) as CategoryKey[]).forEach((catKey) => {
      METRICS_BY_CATEGORY[catKey].forEach((metric) => {
        const cat = metric.category as MetricCategory;
        const dbSignal = signalsByCanonical[metric.key] ?? null;
        let status: MetricStatus;
        let signal: LiveSignal | null;

        if (statusMap) {
          // BACKEND IS SOURCE OF TRUTH.
          const snap = statusMap[metric.key];
          if (snap?.status) {
            status = snap.status;
          } else if (metric.status === "blocked") {
            status = "blocked";
          } else {
            status = "missing";
          }
          // Synthesize a signal-like object so renderRegistryRow can show
          // value/source/updated_at without a second lookup. Prefer the DB
          // row when it exists (so source_url etc. are available), else
          // fall back to the snapshot.
          signal = dbSignal ?? (snap
            ? {
                signal_key: metric.key,
                label: snap.label ?? metric.label,
                value: (snap.value as any) ?? null,
                source: snap.source ?? null,
                source_url: snap.source_url ?? null,
                confidence: snap.confidence ?? null,
                updated_at: snap.updated_at ?? null,
                raw_data: { status: snap.status, used_in_score: snap.used_in_score, notes: snap.notes ?? null },
              }
            : null);
        } else {
          // LEGACY FALLBACK — old job row without metric_status_map.
          signal = dbSignal;
          if (metric.status === "blocked") {
            status = "blocked";
          } else if (signal && getStatus(signal) !== "missing") {
            status = (signal.raw_data?.status as MetricStatus | undefined)
              ?? (metric.status === "live" ? "live" : "proxy");
          } else {
            status = "missing";
          }
        }

        const bucket = metric.enabled ? out[cat].enabled : out[cat].disabled;
        bucket.push({ metric, signal, status });
      });
    });
    return out;
  }, [signalsByCanonical, statusMap]);



  const warnings = latestJob?.response_summary?.warnings ?? {};
  const hasWarnings = Object.values(warnings).some(Boolean);

  // Custom metrics (per-category) appear alongside live signals and count as Estimated.
  const { data: customCriteriaRows = [] } = useCustomCriteria();
  const customByMetricCategory = useMemo(() => {
    const out: Record<MetricCategory, typeof customCriteriaRows> = {
      demand: [], pricing_power: [], competitive_landscape: [],
      franchisee_supply: [], ease_of_operations: [], parent_mindset: [],
    };
    const KEY_TO_METRIC: Record<CategoryKey, MetricCategory> = {
      demand: "demand",
      pricingPower: "pricing_power",
      competitiveLandscape: "competitive_landscape",
      franchiseeSupply: "franchisee_supply",
      easeOfOperations: "ease_of_operations",
      parentMindset: "parent_mindset",
    };
    customCriteriaRows.forEach((r) => {
      const ck = CATEGORY_LABEL_TO_KEY[r.category];
      const mk = ck ? KEY_TO_METRIC[ck] : null;
      if (mk) out[mk].push(r);
    });
    return out;
  }, [customCriteriaRows]);
  const customCount = customCriteriaRows.length;

  // New, honest counting model. Each registry metric falls into exactly one
  // bucket. Custom metrics are reported separately (additive), not folded
  // into the denominator.
  const coverageCounts = useMemo(() => {
    let preSeeded = 0;          // enabled + value present
    let trackedNotScored = 0;   // disabled + value present
    let notSeededYet = 0;       // enabled + no value + not blocked
    let sourceUnavailable = 0;  // registry status === "blocked"
    let trackedNoValue = 0;     // disabled + no value (audit only)
    Object.values(coverageByCategory).forEach(({ enabled, disabled }) => {
      enabled.forEach(({ status }) => {
        if (status === "blocked") sourceUnavailable++;
        else if (status === "live" || status === "proxy") preSeeded++;
        else notSeededYet++;
      });
      disabled.forEach(({ status }) => {
        if (status === "blocked") sourceUnavailable++;
        else if (status === "live" || status === "proxy") trackedNotScored++;
        else trackedNoValue++;
      });
    });
    return { preSeeded, trackedNotScored, notSeededYet, sourceUnavailable, trackedNoValue };
  }, [coverageByCategory]);

  const totalRegistry = SOW_METRIC_REGISTRY.length;
  const seedAtIso: string | null = ((market as any).scored?.scored_at ?? null) as string | null;

  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const metroArea = (market as any).metroArea ?? null;
  const county = (market as any).county ?? null;
  const metroCounties: string[] | null = Array.isArray((market as any).metroCounties)
    ? (market as any).metroCounties
    : null;
  const marketType = (market as any).marketType ?? null;

  const renderSignalRow = (signal: LiveSignal, key: string) => {
    const status = getStatus(signal);
    const used = Boolean(signal.raw_data?.used_in_score);
    return (
      <div
        key={key}
        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[#f1f4f9] px-2 py-1.5 last:border-0 hover:bg-[#fbfcff]"
      >
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-[#07142f] line-clamp-2" title={signal.label ?? signal.signal_key ?? ""}>
            {signal.label ?? signal.signal_key}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <ScoreImpactBadge used={used} />
            <GeoBadge source={signal.source} signalKey={signal.signal_key} />
            <StatusBadge status={status} />
            {signal.source && (
              <span className="rounded-full border border-[#e5eaf2] bg-white px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-[#526078]">
                {signal.source}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-right">
          <div>
            <p className="text-[12px] font-bold text-[#07142f]">{displayValue(signal.value)}</p>
            <p className="text-[10px] text-[#8794ab]">{relativeTime(signal.updated_at)}</p>
          </div>
          {signal.source_url ? (
            <a
              href={signal.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-[#174be8] hover:text-[#1240c9]"
              title="Open source"
            >
              <ExternalLink size={12} />
            </a>
          ) : null}
        </div>
      </div>
    );
  };

  const renderRegistryRow = (
    metric: SowMetricEntry,
    signal: LiveSignal | null,
    status: MetricStatus,
  ) => {
    const value = signal && status !== "missing" ? displayValue(signal.value) : "—";
    return (
      <div
        key={`reg-${metric.key}`}
        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[#f1f4f9] px-2 py-1 last:border-0"
      >
        <div className="min-w-0">
          <p className="text-[11.5px] font-medium text-[#07142f] truncate" title={metric.label}>
            {metric.label}
          </p>
          <p className="text-[10px] text-[#8794ab] truncate" title={metric.source}>
            {metric.source}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-right">
          <p className="text-[11.5px] font-bold text-[#07142f] tabular-nums">{value}</p>
          {signal?.source_url ? (
            <a
              href={signal.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-[#174be8] hover:text-[#1240c9]"
              title="Open source"
            >
              <ExternalLink size={12} />
            </a>
          ) : null}
        </div>
      </div>
    );
  };


  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[640px] bg-white p-0 flex flex-col">
        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        <SheetHeader className="mb-3">
          <SheetTitle className="text-[#07142f]">{market.city}, {stateAbbr}</SheetTitle>
          <p className="text-[11px] text-[#526078]">
            Source-of-truth audit for every metric powering this market's score.
          </p>
        </SheetHeader>

        <div className="mb-3 rounded-lg border border-[#eef2f7] bg-[#f8fafe] p-3">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#3a4c72]">
            <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-[#07142f]">City: {market.city}</span>
            {metroArea && <span className="rounded-full bg-white px-2 py-0.5">Metro: {metroArea}</span>}
            {county && <span className="rounded-full bg-white px-2 py-0.5">County: {county}</span>}
            {metroCounties && metroCounties.length > 0 && (
              <span
                className="rounded-full bg-white px-2 py-0.5"
                title="All counties covered by this metro area"
              >
                Metro counties: {metroCounties.join(", ")}
              </span>
            )}
            {marketType && <span className="rounded-full bg-white px-2 py-0.5">Type: {marketType}</span>}
          </div>
          <div className="mt-2 space-y-0.5 text-[11px] text-[#526078]">
            <p>City: <span className="font-semibold text-[#07142f]">{market.city}{stateAbbr ? `, ${stateAbbr}` : ""}</span></p>
            <p>Last seeded: <span className="font-semibold text-[#07142f]">{formatDate(seedAtIso)}</span></p>
            <p>Pre-seeded values: <span className="font-semibold text-[#07142f]">{keyMetricSeededCount} of {KEY_METRIC_KEYS.size}</span></p>
          </div>
          {loading && (
            <div className="mt-2 flex items-center gap-2 text-[11px] text-[#526078]">
              <RefreshCw size={12} className="animate-spin" /> Loading live evidence…
            </div>
          )}
        </div>

        <div className="space-y-3 mb-4">
          {SOW_CATEGORIES.map((category) => {
            const bucket = coverageByCategory[category.key];
            const enabledRows = (bucket?.enabled ?? []).filter((r) => KEY_METRIC_KEYS.has(r.metric.key));
            const seededRows = enabledRows.filter((r) => r.status === "live" || r.status === "proxy");
            return (
              <div key={category.key} className="rounded-lg border border-[#eef2f7] bg-white">
                <div className="flex items-center justify-between gap-2 border-b border-[#eef2f7] bg-[#f8fafe] px-3 py-1.5">
                  <h5 className="text-[12px] font-bold text-[#07142f]">{category.label}</h5>
                  <span className="text-[10px] font-semibold text-[#8794ab]">
                    {seededRows.length} of {enabledRows.length} seeded
                  </span>
                </div>
                <div>
                  {enabledRows.length === 0 ? (
                    <p className="px-3 py-2 text-[11px] text-[#8794ab]">No metrics in this category.</p>
                  ) : (
                    enabledRows.map(({ metric, signal, status }) =>
                      renderRegistryRow(metric, signal, status),
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>


        </div>

        <div className="flex-shrink-0 flex flex-col gap-2 border-t border-[#eef2f7] bg-white px-6 py-3 shadow-[0_-4px_12px_-6px_rgba(7,20,47,0.12)]">
          <Button onClick={onFindTeachers} className="w-full bg-[#174be8] hover:bg-[#1240c9] text-white font-semibold">
            Find Teachers in This Market <ArrowRight size={14} className="ml-2" />
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="border-[#dbe4f2] text-[#2250eb]" onClick={onGenerateReport}>
              <FileText size={14} className="mr-1" /> Generate Report
            </Button>
            <Button variant="outline" className="border-[#dbe4f2] text-[#2250eb]" onClick={handleExportRawSignals}>
              <Download size={14} className="mr-1" /> Export Raw Signals
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
