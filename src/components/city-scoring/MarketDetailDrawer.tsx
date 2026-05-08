import { useEffect, useState } from "react";
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

type LiveSignal = {
  id?: string;
  signal_key?: string;
  label?: string;
  value?: string | number | null;
  source?: string | null;
  source_url?: string | null;
  confidence?: number | null;
};

type LiveCompetitor = {
  id?: string;
  name?: string;
  type?: string | null;
  category?: string | null;
  source?: string | null;
  source_url?: string | null;
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
  if (value == null) return null;
  return `${Math.round(value * 100)}% confidence`;
}

function SourcePill({ source }: { source?: string | null }) {
  if (!source) return null;
  return (
    <span className="rounded-full bg-[#eef4ff] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#174be8]">
      {source}
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

        setSignals(signalRows ?? []);
        setCompetitors(competitorRows ?? []);
        setLatestJob(jobRows?.[0] ?? null);
      } catch (error) {
        console.error("MarketDetailDrawer live evidence error", error);
      } finally {
        setLoading(false);
      }
    };

    loadLiveEvidence();
  }, [open, market.city, market.state]);

  const counts = latestJob?.response_summary?.counts ?? {};
  const warnings = latestJob?.response_summary?.warnings ?? {};
  const hasWarnings = Object.values(warnings).some(Boolean);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto bg-white">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-[#07142f]">{market.city}, {stateAbbr} Source Evidence</SheetTitle>
          <p className="text-xs text-[#526078]">
            Live market signals from Apify, Firecrawl, Census, and BLS.
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
          {loading && (
            <div className="mt-3 flex items-center gap-2 text-[12px] text-[#526078]">
              <RefreshCw size={13} className="animate-spin" /> Loading live evidence…
            </div>
          )}
        </div>

        <section className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-[13px] font-bold text-[#07142f]">All Market Signals</h4>
            <span className="text-[11px] text-[#8794ab]">{signals.length} signals</span>
          </div>
          <div className="space-y-2">
            {signals.length === 0 && !loading ? (
              <div className="rounded-md border border-[#eef2f7] p-3 text-[12px] text-[#526078]">
                No live market signals found for this city yet. Run Refresh Data first.
              </div>
            ) : (
              signals.map((signal, index) => (
                <div key={signal.id ?? signal.signal_key ?? index} className="rounded-md border border-[#eef2f7] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-semibold text-[#07142f]">{signal.label ?? signal.signal_key}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <SourcePill source={signal.source} />
                        {formatConfidence(signal.confidence) && (
                          <span className="text-[10.5px] text-[#8794ab]">{formatConfidence(signal.confidence)}</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="max-w-[180px] truncate text-[12.5px] font-bold text-[#07142f]">{signal.value ?? "—"}</p>
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
                </div>
              ))
            )}
          </div>
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
