import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CityData } from "@/data/cityData";
import { ArrowRight, Download, FileText, RefreshCw } from "lucide-react";
import { METRICS_BY_CATEGORY, type SowMetricEntry } from "@/lib/sowMetricRegistry";
import { FETCHER_DIAGNOSTIC_KEYS, canonicalKey } from "@/lib/signalAliases";
import { buildSeededFallbackSignalsFromScored } from "@/lib/cityScoringLiveData";
import type { CategoryKey } from "@/stores/cityScoringStore";
import { MetricRow, type LiveSignal, type MetricStatus } from "./market-detail/MetricRow";
import { DrawerHeroSummary } from "./market-detail/DrawerHeroSummary";
import { buildMarketView } from "@/lib/marketView";
import { CityNotesEditor } from "./market-detail/CityNotesEditor";

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

type MetricCategory = "demand" | "competitive_landscape" | "franchisee_supply";

const SOW_CATEGORIES: { key: MetricCategory; label: string }[] = [
  { key: "demand", label: "Demand" },
  { key: "franchisee_supply", label: "TAM Teachers" },
  { key: "competitive_landscape", label: "Competitive Opportunity" },
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
]);

function buildSeededFallbackSignals(market: CityData): LiveSignal[] {
  const scored = (market as any).scored;
  if (!scored) return [];
  const childrenPct = Number((market as any).childrenPct ?? (market as any).children_pct ?? 0) || undefined;
  return buildSeededFallbackSignalsFromScored(scored, childrenPct) as unknown as LiveSignal[];
}

function formatDate(value?: string | null) {
  if (!value) return "Seed pending";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

export function MarketDetailDrawer({
  market,
  refreshVersion = 0,
  open,
  onClose,
  categoryScores,
  onFindTeachers,
  onGenerateReport,
}: Props) {
  const stateAbbr = market.state === "Texas" ? "TX" : market.state === "Florida" ? "FL" : market.state;
  const [loading, setLoading] = useState(false);
  const [signals, setSignals] = useState<LiveSignal[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    try {
      if (!market.cityId) {
        setSignals([]);
        return;
      }
      // Legacy `city_market_signals` was severed on 2026-05-21. Live evidence
      // rows are synthesized from us_cities_scored columns.
      setSignals(buildSeededFallbackSignals(market));
    } finally {
      setLoading(false);
    }
  }, [open, market.cityId, market, refreshVersion]);

  const handleExportRawSignals = () => {
    const header = ["Signal Key", "Label", "Value", "Source", "Source URL", "Last Updated"];
    const rows: string[][] = [header];
    for (const s of signals) {
      rows.push([
        String(s.signal_key ?? ""),
        String(s.label ?? ""),
        String(s.value ?? ""),
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

  // Lookup of signals keyed by canonical signal_key (most-recent on duplicates).
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

  // Per-row coverage status derived from the registry + DB row.
  type Coverage = { metric: SowMetricEntry; signal: LiveSignal | null; status: MetricStatus };
  const coverageByCategory = useMemo(() => {
    const out: Record<MetricCategory, Coverage[]> = {
      demand: [],
      competitive_landscape: [],
      franchisee_supply: [],
    };
    (Object.keys(METRICS_BY_CATEGORY) as CategoryKey[]).forEach((catKey) => {
      METRICS_BY_CATEGORY[catKey].forEach((metric) => {
        const cat = metric.category as MetricCategory;
        if (!out[cat]) return;
        if (!metric.enabled) return;
        const signal = signalsByCanonical[metric.key] ?? null;
        let status: MetricStatus;
        if (metric.status === "blocked") status = "blocked";
        else if (signal && getStatus(signal) !== "missing") {
          status = (signal.raw_data?.status as MetricStatus | undefined)
            ?? (metric.status === "live" ? "live" : "proxy");
        } else status = "missing";
        out[cat].push({ metric, signal, status });
      });
    });
    return out;
  }, [signalsByCanonical]);

  const keyMetricSeededCount = useMemo(() => {
    let n = 0;
    Object.values(coverageByCategory).forEach((rows) => {
      rows.forEach(({ metric, status }) => {
        if (KEY_METRIC_KEYS.has(metric.key) && (status === "live" || status === "proxy")) n++;
      });
    });
    return n;
  }, [coverageByCategory]);

  const seedAtIso: string | null = ((market as any).scored?.scored_at ?? null) as string | null;
  const rawName = String(market.city ?? "").trim();
  const suffixMatch = /\s+(city|town|borough|village)$/i.test(rawName);
  const lowCoverage = keyMetricSeededCount > 0 && keyMetricSeededCount <= Math.floor(KEY_METRIC_KEYS.size / 2);
  const showManusBanner = suffixMatch && lowCoverage;

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

          {/* Hero summary — total score, tier, pillars, deterministic bottom line. */}
          <DrawerHeroSummary
            rawComposite={
              // Rule 12: composites must flow through the marketView selector.
              buildMarketView(market).rawComposite ?? 0
            }
            tier={(market as any).tier ?? null}
            categoryScores={{
              demand: categoryScores?.demand ?? null,
              franchiseeSupply: (categoryScores as any)?.franchiseeSupply ?? null,
              competitiveLandscape: (categoryScores as any)?.competitiveLandscape ?? null,
            }}
          />

          <div className="mb-3 rounded-lg border border-[#eef2f7] bg-[#f8fafe] p-3">
            <div className="space-y-0.5 text-[11px] text-[#526078]">
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

          {showManusBanner && (
            <div className="mb-3 rounded-lg border border-[#f6d68a] bg-[#fff8e6] p-3 text-[11px] text-[#7a4d00]">
              <p className="font-semibold mb-0.5">Manus-upload row — Census/NCES values live on the sibling row</p>
              <p>
                This row was loaded from Brett's 2026-05-21 Manus CSI upload, which joined on
                <span className="font-mono"> "{rawName}" </span>
                instead of the canonical Census name. Demographic and school metrics still live on the
                <span className="font-mono"> "{rawName.replace(/\s+(city|town|borough|village)$/i, "")}" </span>
                row in <span className="font-mono">us_cities_scored</span> and haven't been merged yet.
              </p>
            </div>
          )}

          <CityNotesEditor cityId={market.cityId ?? null} />

          <div className="space-y-3 mb-4">
            {SOW_CATEGORIES.map((category) => {
              const rows = (coverageByCategory[category.key] ?? []).filter((r) => KEY_METRIC_KEYS.has(r.metric.key));
              const seededRows = rows.filter((r) => r.status === "live" || r.status === "proxy");
              return (
                <div key={category.key} className="rounded-lg border border-[#eef2f7] bg-white">
                  <div className="flex items-center justify-between gap-2 border-b border-[#eef2f7] bg-[#f8fafe] px-3 py-1.5">
                    <h5 className="text-[12px] font-bold text-[#07142f]">{category.label}</h5>
                    <span className="text-[10px] font-semibold text-[#8794ab]">
                      {seededRows.length} of {rows.length} seeded
                    </span>
                  </div>
                  <div>
                    {rows.length === 0 ? (
                      <p className="px-3 py-2 text-[11px] text-[#8794ab]">No metrics in this category.</p>
                    ) : (
                      rows.map(({ metric, signal, status }) => (
                        <MetricRow key={`reg-${metric.key}`} metric={metric} signal={signal} status={status} />
                      ))
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
