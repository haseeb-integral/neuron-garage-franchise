import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CityData } from "@/data/cityData";
import { ArrowRight, ChevronDown, ChevronRight, Download, ExternalLink, FileText, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSignalGeography, GEO_BADGE_CLASS } from "@/lib/signalGeography";
import { useCustomCriteria, CATEGORY_LABEL_TO_KEY } from "@/hooks/useCustomCriteria";
import type { CategoryKey } from "@/stores/cityScoringStore";
import { METRICS_BY_CATEGORY, CATEGORY_KEY_MAP, type SowMetricEntry } from "@/lib/sowMetricRegistry";
import { LEGACY_TO_CANONICAL, FETCHER_DIAGNOSTIC_KEYS, canonicalKey } from "@/lib/signalAliases";

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

const SOW_CATEGORIES: { key: MetricCategory; label: string }[] = [
  { key: "demand", label: "Demand" },
  { key: "pricing_power", label: "Pricing Power" },
  { key: "competitive_landscape", label: "Competitive Landscape" },
  { key: "franchisee_supply", label: "Franchisee Supply" },
  { key: "ease_of_operations", label: "Ease of Operations" },
  { key: "parent_mindset", label: "Parent Mindset" },
];

const STATUS_STYLES: Record<MetricStatus, string> = {
  live: "bg-[#e6f7ef] text-[#0ea66e] border-[#bfead6]",
  proxy: "bg-[#eaf0ff] text-[#174be8] border-[#cbd8ff]",
  missing: "bg-[#f3f6fb] text-[#526078] border-[#e5eaf2]",
  blocked: "bg-[#ffeede] text-[#ea580c] border-[#ffd0a8]",
  manual: "bg-[#fff6dc] text-[#b8860b] border-[#f4df9a]",
};

function formatDate(value?: string | null) {
  if (!value) return "Not refreshed yet";
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
  live: "Live",
  proxy: "Estimated",
  missing: "Missing",
  blocked: "Unavailable",
  manual: "Manual",
};

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

// Build a lookup from canonical signal_key → registry category, derived from
// the SOW registry itself so the drawer cannot drift from the spec.
const REGISTRY_KEY_TO_CATEGORY: Record<string, MetricCategory> = (() => {
  const out: Record<string, MetricCategory> = {};
  (Object.keys(METRICS_BY_CATEGORY) as CategoryKey[]).forEach((cat) => {
    METRICS_BY_CATEGORY[cat].forEach((m) => {
      out[m.key] = m.category as MetricCategory;
    });
  });
  return out;
})();

// Map a raw DB signal_key (possibly legacy) to its registry category.
function getCategory(signal: LiveSignal): MetricCategory | null {
  if (signal.raw_data?.metric_category) return signal.raw_data.metric_category;
  const canon = canonicalKey(signal.signal_key);
  if (canon && REGISTRY_KEY_TO_CATEGORY[canon]) return REGISTRY_KEY_TO_CATEGORY[canon];
  return null;
}

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
        const { data: cityRow } = await supabase
          .from("cities")
          .select("*")
          .eq("city", market.city)
          .eq("state", market.state)
          .maybeSingle();

        if (!cityRow) {
          setSignals([]);
          setCompetitors([]);
          setLatestJob(null);
          return;
        }

        const [{ data: signalRows }, { data: competitorRows }, { data: jobRows }] = await Promise.all([
          supabase
            .from("city_market_signals")
            .select("*")
            .eq("city_id", cityRow.id),
          supabase
            .from("city_competitors")
            .select("*")
            .eq("city_id", cityRow.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("city_fetch_jobs")
            .select("*")
            .eq("city_id", cityRow.id)
            .eq("source", "sow_metric_coverage")
            .order("created_at", { ascending: false })
            .limit(1),
        ]);

        const latestSowJob = jobRows?.[0] ?? null;

        setSignals((signalRows ?? []) as LiveSignal[]);
        setCompetitors((competitorRows ?? []) as LiveCompetitor[]);
        setLatestJob(latestSowJob);
      } catch (error) {
        console.error("MarketDetailDrawer live evidence error", error);
      } finally {
        setLoading(false);
      }
    };

    loadLiveEvidence();
  }, [open, market.city, market.state, refreshVersion]);

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

  // Per-row coverage status derived from the registry + DB row.
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
        const signal = signalsByCanonical[metric.key] ?? null;
        let status: MetricStatus;
        if (metric.status === "blocked") {
          status = "blocked";
        } else if (signal && getStatus(signal) !== "missing") {
          // Honor the row's own status when present; otherwise inherit registry status.
          status = (signal.raw_data?.status as MetricStatus | undefined)
            ?? (metric.status === "live" ? "live" : "proxy");
        } else {
          status = "missing";
        }
        const bucket = metric.enabled ? out[cat].enabled : out[cat].disabled;
        bucket.push({ metric, signal, status });
      });
    });
    return out;
  }, [signalsByCanonical]);

  // Truthful counter: count enabled SOW metrics by status.
  const coverageCounts = useMemo(() => {
    let live = 0, proxy = 0, missing = 0, blocked = 0;
    Object.values(coverageByCategory).forEach(({ enabled }) => {
      enabled.forEach(({ status }) => {
        if (status === "live") live++;
        else if (status === "proxy") proxy++;
        else if (status === "blocked") blocked++;
        else missing++;
      });
    });
    return { live, proxy, missing, blocked };
  }, [coverageByCategory]);

  const enabledRegistryTotal = useMemo(() => {
    let n = 0;
    Object.values(coverageByCategory).forEach(({ enabled }) => { n += enabled.length; });
    return n;
  }, [coverageByCategory]);

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

  const liveCount = coverageCounts.live;
  const proxyCount = coverageCounts.proxy + customCount;
  const missingCount = coverageCounts.missing;
  const blockedCount = coverageCounts.blocked;
  const manualCount = 0;
  const totalCount = enabledRegistryTotal + customCount;

  const [showDisabled, setShowDisabled] = useState<Record<MetricCategory, boolean>>({
    demand: false, pricing_power: false, competitive_landscape: false,
    franchisee_supply: false, ease_of_operations: false, parent_mindset: false,
  });
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const metroArea = (market as any).metroArea ?? null;
  const county = (market as any).county ?? null;
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

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[640px] bg-white p-0 flex flex-col">
        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        <SheetHeader className="mb-3">
          <SheetTitle className="text-[#07142f]">{market.city}, {stateAbbr}</SheetTitle>
          <p className="text-[11px] text-[#526078]">
            Source-of-truth audit for the SOW metric coverage powering this market's score.
          </p>
        </SheetHeader>

        <div className="mb-3 rounded-lg border border-[#eef2f7] bg-[#f8fafe] p-3">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#3a4c72]">
            <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-[#07142f]">City: {market.city}</span>
            {metroArea && <span className="rounded-full bg-white px-2 py-0.5">Metro: {metroArea}</span>}
            {county && <span className="rounded-full bg-white px-2 py-0.5">County: {county}</span>}
            {marketType && <span className="rounded-full bg-white px-2 py-0.5">Type: {marketType}</span>}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-[11px] text-[#526078]">
              Latest refresh: <span className="font-semibold text-[#07142f]">{formatDate(latestJob?.completed_at)}</span>
            </p>
            <div className="flex gap-1.5 text-[11px]">
              <span className="rounded-md bg-white px-1.5 py-0.5 font-bold text-[#0ea66e]">{liveCount} live</span>
              <span className="rounded-md bg-white px-1.5 py-0.5 font-bold text-[#174be8]">{proxyCount} estimated</span>
              <span className="rounded-md bg-white px-1.5 py-0.5 font-bold text-[#526078]">{missingCount} missing</span>
            </div>
          </div>
          {loading && (
            <div className="mt-2 flex items-center gap-2 text-[11px] text-[#526078]">
              <RefreshCw size={12} className="animate-spin" /> Loading live evidence…
            </div>
          )}
        </div>

        <Tabs defaultValue="data-sources" className="mb-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="data-sources">Data Sources</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-3 space-y-4">
            <section>
              <h4 className="mb-2 text-[12.5px] font-bold text-[#07142f]">Refresh Summary</h4>
              <div className="rounded-md border border-[#eef2f7] p-3">
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  {[
                    ["Live", liveCount],
                    ["Estimated", proxyCount],
                    ["Manual", manualCount],
                    ["Blocked", blockedCount],
                    ["Missing", missingCount],
                    ["Total SOW metrics", totalCount],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex justify-between gap-2 rounded bg-[#f8fafe] px-2 py-1">
                      <span className="truncate text-[#526078]">{label}</span>
                      <span className="font-semibold text-[#07142f]">{String(value)}</span>
                    </div>
                  ))}
                </div>
                {customCount > 0 && (
                  <p className="mt-2 text-[10.5px] text-[#526078]">
                    Includes {customCount} custom metric{customCount === 1 ? "" : "s"} (counted as Estimated — uses neutral 50 until live data is wired).
                  </p>
                )}
                <div className="mt-3 border-t border-[#eef2f7] pt-2 text-[11px]">
                  <p className="mb-1 font-semibold text-[#07142f]">Warnings</p>
                  {Object.entries(warnings).length === 0 ? (
                    <p className="text-[#0ea66e]">No warnings recorded.</p>
                  ) : (
                    <div className="space-y-1">
                      {Object.entries(warnings).map(([key, value]) => (
                        <p key={key} className={value ? "text-[#b8860b]" : "text-[#0ea66e]"}>
                          {key}: {value ? String(value) : "clean"}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {hasWarnings && (
                <p className="mt-1 text-[10.5px] text-[#b8860b]">Some sources returned warnings — see Data Sources tab to inspect.</p>
              )}
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-[12.5px] font-bold text-[#07142f]">Competitors & Enrichment Programs</h4>
                <span className="text-[11px] text-[#8794ab]">{competitors.length} rows</span>
              </div>
              <div className="space-y-1.5">
                {competitors.length === 0 && !loading ? (
                  <div className="rounded-md border border-[#eef2f7] p-3 text-[11.5px] text-[#526078]">
                    No live competitor rows found yet.
                  </div>
                ) : (
                  competitors.slice(0, 25).map((comp, index) => (
                    <div key={comp.id ?? `${comp.name}-${index}`} className="flex items-center justify-between gap-3 rounded-md border border-[#eef2f7] bg-[#f8fafe] px-2.5 py-1.5">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold text-[#07142f]">{comp.name ?? "Unnamed competitor"}</p>
                        <p className="mt-0.5 truncate text-[10.5px] text-[#526078]">{comp.type ?? comp.category ?? "Education / enrichment"}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {comp.source && (
                          <span className="rounded-full bg-[#eef4ff] px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-[#174be8]">
                            {comp.source}
                          </span>
                        )}
                        {comp.source_url ? (
                          <a
                            href={comp.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#174be8] hover:text-[#1240c9]"
                            title="Open source"
                          >
                            <ExternalLink size={11} />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
                {competitors.length > 25 && (
                  <p className="text-[10.5px] text-[#8794ab]">+{competitors.length - 25} more not shown</p>
                )}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="data-sources" className="mt-3">
            <div className="space-y-3">
              {SOW_CATEGORIES.map((category) => {
                const bucket = coverageByCategory[category.key];
                const customs = customByMetricCategory[category.key] ?? [];
                const enabledRows = bucket.enabled;
                const disabledRows = bucket.disabled;
                const enabledTotal = enabledRows.length;
                const liveProxy = enabledRows.filter((r) => r.status === "live" || r.status === "proxy").length;
                return (
                  <div key={category.key} className="rounded-lg border border-[#eef2f7] bg-white">
                    <div className="flex items-center justify-between border-b border-[#eef2f7] bg-[#f8fafe] px-3 py-1.5">
                      <h5 className="text-[12px] font-bold text-[#07142f]">{category.label}</h5>
                      <span className="text-[10px] font-semibold text-[#8794ab]">
                        {liveProxy}/{enabledTotal} covered
                        {customs.length > 0 ? ` · ${customs.length} custom` : ""}
                      </span>
                    </div>
                    <div>
                      {enabledRows.map(({ metric, signal, status }) =>
                        renderRegistryRow(metric, signal, status),
                      )}
                      {customs.map((c) => (
                        <div
                          key={`custom-${c.id}`}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[#f1f4f9] px-2 py-1.5 last:border-0 hover:bg-[#fbfcff]"
                        >
                          <div className="min-w-0">
                            <p className="text-[12px] font-medium text-[#07142f] line-clamp-2" title={c.name}>
                              {c.name}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              <span className="rounded-full border border-[#cbd8ff] bg-[#eaf0ff] px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-[#174be8]">
                                Custom
                              </span>
                              <StatusBadge status="proxy" />
                              {c.data_source && (
                                <span className="rounded-full border border-[#e5eaf2] bg-white px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-[#526078]">
                                  {c.data_source}
                                </span>
                              )}
                            </div>
                            {c.notes && (
                              <p className="mt-0.5 text-[10.5px] text-[#8794ab] line-clamp-2">{c.notes}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2 text-right">
                            <div>
                              <p className="text-[12px] font-bold text-[#07142f]">Neutral 50</p>
                              <p className="text-[10px] text-[#8794ab]">no live data</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {disabledRows.length > 0 && (
                        <div className="border-t border-[#eef2f7] bg-[#fbfcff]">
                          <button
                            type="button"
                            onClick={() =>
                              setShowDisabled((s) => ({ ...s, [category.key]: !s[category.key] }))
                            }
                            className="flex w-full items-center justify-between px-3 py-1.5 text-[10.5px] font-semibold text-[#526078] hover:text-[#07142f]"
                          >
                            <span className="flex items-center gap-1">
                              {showDisabled[category.key] ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                              Not in current scoring model
                            </span>
                            <span>{disabledRows.length}</span>
                          </button>
                          {showDisabled[category.key] && (
                            <div>
                              {disabledRows.map(({ metric, signal, status }) =>
                                renderRegistryRow(metric, signal, status, true),
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {diagnosticRows.length > 0 && (
                <div className="rounded-lg border border-dashed border-[#eef2f7] bg-[#fbfcff]">
                  <button
                    type="button"
                    onClick={() => setShowDiagnostics((v) => !v)}
                    className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold text-[#526078] hover:text-[#07142f]"
                  >
                    <span className="flex items-center gap-1.5">
                      {showDiagnostics ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      Fetcher diagnostics
                    </span>
                    <span className="text-[10px] text-[#8794ab]">{diagnosticRows.length} rows · not metrics</span>
                  </button>
                  {showDiagnostics && (
                    <div className="border-t border-[#eef2f7] bg-white">
                      {diagnosticRows.map((signal, index) =>
                        renderSignalRow(signal, signal.id ?? signal.signal_key ?? `diag-${index}`),
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

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
