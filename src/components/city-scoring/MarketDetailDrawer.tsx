import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CityData } from "@/data/cityData";
import { ArrowRight, Download, ExternalLink, FileText, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface CustomCriterion {
  name: string;
  category: string;
  weight: number;
  source: string;
  notes: string;
}

interface Props {
  market: CityData;
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

const SOW_CATEGORIES: { key: MetricCategory; label: string; description: string }[] = [
  { key: "demand", label: "Demand", description: "Family demand, child population, income, education, and weather signals." },
  { key: "pricing_power", label: "Pricing Power", description: "Ability to support profitable tuition and premium enrichment pricing." },
  { key: "competitive_landscape", label: "Competitive Landscape", description: "Whitespace, competitor density, national brands, search demand, and waitlist signals." },
  { key: "franchisee_supply", label: "Franchisee Supply", description: "Teacher-operator availability, teacher compensation, and local cost pressure." },
  { key: "ease_of_operations", label: "Ease of Operations", description: "Rental venues, regulations, commute/sprawl, and guide wage pressure." },
  { key: "parent_mindset", label: "Parent Mindset Indicators", description: "Enrichment-oriented parent culture and education community signals." },
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

function formatConfidence(value?: number | null) {
  if (value == null) return "—";
  return `${Math.round(value * 100)}%`;
}

function getStatus(signal: LiveSignal): MetricStatus {
  return signal.raw_data?.status ?? "proxy";
}

function getCategory(signal: LiveSignal): MetricCategory | null {
  return signal.raw_data?.metric_category ?? null;
}

function SourcePill({ source }: { source?: string | null }) {
  if (!source) return null;
  return (
    <span className="rounded-full bg-[#eef4ff] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#174be8]">
      {source}
    </span>
  );
}

function StatusBadge({ status }: { status: MetricStatus }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

export function MarketDetailDrawer({
  market,
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
            .order("created_at", { ascending: false })
            .limit(1),
        ]);

        setSignals((signalRows ?? []) as LiveSignal[]);
        setCompetitors((competitorRows ?? []) as LiveCompetitor[]);
        setLatestJob(jobRows?.[0] ?? null);
      } catch (error) {
        console.error("MarketDetailDrawer live evidence error", error);
      } finally {
        setLoading(false);
      }
    };

    loadLiveEvidence();
  }, [open, market.city, market.state]);

  const groupedSignals = useMemo(() => {
    return SOW_CATEGORIES.map((category) => ({
      ...category,
      rows: signals.filter((signal) => getCategory(signal) === category.key),
    }));
  }, [signals]);

  const uncategorizedSignals = useMemo(
    () => signals.filter((signal) => !getCategory(signal)),
    [signals],
  );

  const counts = latestJob?.response_summary?.counts ?? {};
  const warnings = latestJob?.response_summary?.warnings ?? {};
  const hasWarnings = Object.values(warnings).some(Boolean);
  const liveCount = signals.filter((signal) => getStatus(signal) === "live").length;
  const proxyCount = signals.filter((signal) => getStatus(signal) === "proxy").length;
  const missingCount = signals.filter((signal) => getStatus(signal) === "missing").length;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[620px] overflow-y-auto bg-white">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-[#07142f]">{market.city}, {stateAbbr} Source Evidence</SheetTitle>
          <p className="text-xs text-[#526078]">
            Sam SOW metric coverage from Apify, Firecrawl, Census, BLS, and future source integrations.
          </p>
        </SheetHeader>

        <div className="mb-4 rounded-lg border border-[#eef2f7] bg-[#f8fafe] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8794ab]">Latest refresh</p>
              <p className="text-[13px] font-bold text-[#07142f]">{formatDate(latestJob?.completed_at)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8794ab]">Status</p>
              <p className={hasWarnings ? "text-[13px] font-bold text-[#b8860b]" : "text-[13px] font-bold text-[#0ea66e]"}>
                {latestJob?.status ?? (loading ? "Loading" : "Ready")}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-white px-2 py-1.5">
              <p className="text-[15px] font-black text-[#0ea66e]">{liveCount}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8794ab]">Live</p>
            </div>
            <div className="rounded-md bg-white px-2 py-1.5">
              <p className="text-[15px] font-black text-[#174be8]">{proxyCount}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8794ab]">Proxy</p>
            </div>
            <div className="rounded-md bg-white px-2 py-1.5">
              <p className="text-[15px] font-black text-[#526078]">{missingCount}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8794ab]">Missing</p>
            </div>
          </div>
          {loading && (
            <div className="mt-3 flex items-center gap-2 text-[12px] text-[#526078]">
              <RefreshCw size={13} className="animate-spin" /> Loading live evidence…
            </div>
          )}
        </div>

        <section className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-[13px] font-bold text-[#07142f]">SOW Metric Coverage</h4>
            <span className="text-[11px] text-[#8794ab]">{signals.length} signals</span>
          </div>

          {signals.length === 0 && !loading ? (
            <div className="rounded-md border border-[#eef2f7] p-3 text-[12px] text-[#526078]">
              No live SOW metric rows found for this city yet. Run the SOW coverage refresh first.
            </div>
          ) : (
            <div className="space-y-3">
              {groupedSignals.map((category) => (
                <div key={category.key} className="rounded-lg border border-[#eef2f7] bg-white p-3">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <h5 className="text-[12.5px] font-bold text-[#07142f]">{category.label}</h5>
                      <p className="mt-0.5 text-[10.5px] leading-snug text-[#8794ab]">{category.description}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#f3f6fb] px-2 py-0.5 text-[10px] font-bold text-[#526078]">
                      {category.rows.length}
                    </span>
                  </div>

                  {category.rows.length === 0 ? (
                    <div className="rounded-md bg-[#f8fafe] px-3 py-2 text-[11.5px] text-[#526078]">
                      No rows stored for this category yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {category.rows.map((signal, index) => {
                        const status = getStatus(signal);
                        const notes = signal.raw_data?.notes;
                        return (
                          <div key={signal.id ?? signal.signal_key ?? `${category.key}-${index}`} className="rounded-md border border-[#eef2f7] bg-[#fbfcff] p-2.5">
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-[12px] font-semibold text-[#07142f]">{signal.label ?? signal.signal_key}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <StatusBadge status={status} />
                                  <SourcePill source={signal.source} />
                                  <span className="text-[10.5px] text-[#8794ab]">{formatConfidence(signal.confidence)} confidence</span>
                                  {signal.raw_data?.used_in_score && (
                                    <span className="rounded-full bg-[#fff6dc] px-2 py-0.5 text-[10px] font-semibold text-[#b8860b]">Used in score</span>
                                  )}
                                </div>
                              </div>
                              <div className="max-w-[170px] text-right">
                                <p className="truncate text-[12px] font-bold text-[#07142f]">{signal.value ?? "—"}</p>
                                {signal.source_url && (
                                  <a
                                    href={signal.source_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#174be8] hover:underline"
                                  >
                                    Source <ExternalLink size={10} />
                                  </a>
                                )}
                              </div>
                            </div>
                            {notes && (
                              <p className="mt-2 rounded bg-white px-2 py-1 text-[10.5px] leading-snug text-[#526078]">
                                {notes}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {uncategorizedSignals.length > 0 && (
                <div className="rounded-lg border border-[#eef2f7] bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h5 className="text-[12.5px] font-bold text-[#07142f]">Other Signals</h5>
                    <span className="rounded-full bg-[#f3f6fb] px-2 py-0.5 text-[10px] font-bold text-[#526078]">{uncategorizedSignals.length}</span>
                  </div>
                  <div className="space-y-2">
                    {uncategorizedSignals.map((signal, index) => {
                      const status = getStatus(signal);
                      return (
                        <div key={signal.id ?? signal.signal_key ?? `other-${index}`} className="rounded-md border border-[#eef2f7] bg-[#fbfcff] p-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-semibold text-[#07142f]">{signal.label ?? signal.signal_key}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <StatusBadge status={status} />
                                <SourcePill source={signal.source} />
                                <span className="text-[10.5px] text-[#8794ab]">{formatConfidence(signal.confidence)} confidence</span>
                              </div>
                            </div>
                            <p className="max-w-[170px] truncate text-right text-[12px] font-bold text-[#07142f]">{signal.value ?? "—"}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-[13px] font-bold text-[#07142f]">Competitors & Enrichment Programs</h4>
            <span className="text-[11px] text-[#8794ab]">{competitors.length} rows</span>
          </div>
          <div className="space-y-2">
            {competitors.length === 0 && !loading ? (
              <div className="rounded-md border border-[#eef2f7] p-3 text-[12px] text-[#526078]">
                No live competitor rows found yet.
              </div>
            ) : (
              competitors.map((comp, index) => (
                <div key={comp.id ?? `${comp.name}-${index}`} className="rounded-md border border-[#eef2f7] bg-[#f8fafe] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-semibold text-[#07142f]">{comp.name ?? "Unnamed competitor"}</p>
                      <p className="mt-0.5 text-[11.5px] text-[#526078]">{comp.type ?? comp.category ?? "Education / enrichment"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <SourcePill source={comp.source} />
                      {comp.source_url && (
                        <a
                          href={comp.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#174be8] hover:underline"
                        >
                          Source <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mb-5">
          <h4 className="mb-2 text-[13px] font-bold text-[#07142f]">Refresh Summary</h4>
          <div className="rounded-md border border-[#eef2f7] p-3">
            <div className="grid grid-cols-2 gap-2 text-[11.5px]">
              {Object.entries(counts).length === 0 ? (
                <p className="col-span-2 text-[#526078]">No refresh counts stored yet.</p>
              ) : (
                Object.entries(counts).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-2 rounded bg-[#f8fafe] px-2 py-1">
                    <span className="truncate text-[#526078]">{key.replaceAll("_", " ")}</span>
                    <span className="font-semibold text-[#07142f]">{String(value)}</span>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 border-t border-[#eef2f7] pt-2 text-[11.5px]">
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
        </section>

        <div className="sticky bottom-0 flex flex-col gap-2 bg-white pt-2">
          <Button onClick={onFindTeachers} className="w-full bg-[#174be8] hover:bg-[#1240c9] text-white font-semibold">
            Find Teachers in This Market <ArrowRight size={14} className="ml-2" />
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="border-[#dbe4f2] text-[#2250eb]" onClick={onGenerateReport}>
              <FileText size={14} className="mr-1" /> Generate Report
            </Button>
            <Button variant="outline" className="border-[#dbe4f2] text-[#2250eb]" onClick={onExport}>
              <Download size={14} className="mr-1" /> Export Source Data
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
