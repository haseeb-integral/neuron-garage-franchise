import { useMemo, useState } from "react";
import { Loader2, MapPin, FileDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { DEFAULT_WEIGHTS } from "@/lib/mvs/computeMvs";
import { useLiveMvs } from "@/lib/mvs/useLiveMvs";
import { RunPipelineButton } from "@/components/phase2-demo/RunPipelineButton";
import { renderMvsBriefPdfBlob, type MvsBriefWeekDetail } from "@/lib/mvsBrief/MvsBriefDocument";


const NAVY = "#07142f";
const MUTED = "#526078";
const BORDER = "#eef2f7";
const SOFT = "#f7faff";
const BLUE = "#174be8";

const CHIP =
  "inline-flex items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold";

const SUB_SCORE_META: {
  key: keyof typeof DEFAULT_WEIGHTS;
  title: string;
  subtitle: string;
  formula: string;
}[] = [
  {
    key: "pricingAcceptance",
    title: "Pricing Acceptance",
    subtitle: "Are families already paying premium pricing?",
    formula:
      "0.40 × normalize(median, $300–$700) + 0.40 × normalize(75th pct, $400–$800) + 0.20 × (% at $500+)",
  },
  {
    key: "marketAbsorption",
    title: "Market Absorption",
    subtitle: "Are premium operators actually selling out?",
    formula:
      "v1.0: normalize(Sellout Rate, 0–80%). Time-to-sellout & YoY velocity are Year 2 signals.",
  },
  {
    key: "scaledOperator",
    title: "Scaled Operator",
    subtitle: "Validated vs saturated by national operators?",
    formula:
      "0.65 × normalize(Operator Validation, 0–8) + 0.35 × (100 − normalize(Direct Competitor Load, 0–5 per 10k))",
  },
  {
    key: "enrichmentDiversity",
    title: "Enrichment Diversity",
    subtitle: "Do families invest across multiple categories?",
    formula:
      "0.70 × normalize(Category Count, 2–10) + 0.30 × normalize(Diversity Ratio, 0.1–0.6)",
  },
  {
    key: "marketDepth",
    title: "Market Depth",
    subtitle: "How large is the premium ecosystem?",
    formula: "normalize(Premium Provider Count, 4–40)",
  },
  {
    key: "marketBalance",
    title: "Market Balance Index",
    subtitle: "Is there still room in this market?",
    formula:
      "normalize(Coverage Ratio, 50–500); ≥350 Underserved · 200–349 Balanced · 100–199 Competitive · <100 Saturated",
  },
];

interface Props {
  cityKey: string;            // e.g. "Austin, TX"
  cityDisplay: string;        // e.g. "Austin"
  stateDisplay: string;       // e.g. "TX"
}

/**
 * Live deep-dive panel rendered on Market Validation when a city's
 * `mvs_city_flags.mvs_data_source = 'live'`. Reads providers/weeks/ACS via
 * `useLiveMvs` and computes MVS through the shared helper. Sliders are
 * preview-only (v1.0): they change the in-memory weight blend without
 * persisting, so users can sanity-check sensitivity.
 */
export function LiveCityDeepDive({ cityKey, cityDisplay, stateDisplay }: Props) {
  const [weights, setWeights] = useState<Record<string, number>>({ ...DEFAULT_WEIGHTS });
  const { result, providers, weeks, acs, flag, loading, error, refresh } = useLiveMvs(cityKey, {
    weights,
  });
  const [downloading, setDownloading] = useState(false);


  const provCount = providers.length;
  const weekCount = weeks.length;
  const lowConfidence = flag?.low_confidence_badge ?? false;

  const premiumProviders = useMemo(
    () => providers.filter((p) => p.tier === "premium"),
    [providers],
  );

  const handleDownloadBrief = async () => {
    if (!result || !acs) {
      toast.error("MVS data not ready yet.");
      return;
    }
    setDownloading(true);
    try {
      const { data: runRow } = await supabase
        .from("mvs_pipeline_runs")
        .select("id, status, started_at, finished_at, firecrawl_calls, error")
        .eq("city", cityKey)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch the appendix: per-week rows (with dates + screenshots) joined to
      // provider names. Only premium providers are surfaced in the PDF, but we
      // fetch all and filter client-side to match the on-screen helper.
      const providerIds = providers.map((p) => p.id);
      const providerNameById = new Map(providers.map((p) => [p.id, p.name]));
      let weeksDetailed: MvsBriefWeekDetail[] = [];
      if (providerIds.length > 0) {
        const { data: wkRows } = await supabase
          .from("mvs_weeks")
          .select("provider_id, week_start, week_end, status, confidence, screenshot_url")
          .in("provider_id", providerIds)
          .order("week_start", { ascending: true });
        weeksDetailed = (wkRows ?? []).map((w: any) => ({
          provider_id: w.provider_id as string,
          provider_name: providerNameById.get(w.provider_id) ?? "—",
          week_start: String(w.week_start),
          week_end: w.week_end ? String(w.week_end) : null,
          status: String(w.status),
          confidence: w.confidence == null ? null : Number(w.confidence),
          screenshot_url: (w.screenshot_url as string) ?? null,
        }));
      }

      const blob = await renderMvsBriefPdfBlob({
        cityKey,
        cityDisplay,
        stateDisplay,
        result,
        providers,
        weeks,
        weeksDetailed,
        acs,
        weights,
        lowConfidence,
        latestRun: runRow
          ? {
              id: runRow.id as string,
              status: String(runRow.status),
              started_at: (runRow.started_at as string) ?? null,
              finished_at: (runRow.finished_at as string) ?? null,
              firecrawl_calls: Number(runRow.firecrawl_calls ?? 0),
              error: (runRow.error as string) ?? null,
            }
          : null,
        generatedAt: new Date(),
      });
      const today = new Date().toISOString().slice(0, 10);
      const slug = cityDisplay.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mvs-brief-${slug}-${today}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("MVS brief PDF downloaded");
    } catch (err) {
      console.error("MVS brief PDF failed", err);
      toast.error(
        `PDF export failed: ${err instanceof Error ? err.message : "unknown"}`,
      );
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <section
        className="mb-5 flex h-32 items-center justify-center rounded-lg border bg-white"
        style={{ borderColor: BORDER }}
      >
        <Loader2 className="h-5 w-5 animate-spin text-[#174be8]" />
        <span className="ml-2 text-sm text-[#526078]">
          Loading live {cityDisplay} pipeline data…
        </span>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load live {cityDisplay} data: {error}
      </section>
    );
  }

  return (
    <>
      <RunPipelineButton city={cityKey} onComplete={refresh} />
      {/* Composite hero card */}

      <section
        className="mb-5 rounded-lg border bg-white p-5"
        style={{ borderColor: BORDER }}
      >
        <div className="flex flex-wrap items-start gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <MapPin size={16} style={{ color: BLUE }} />
              <h2 className="text-[18px] font-black" style={{ color: NAVY }}>
                {cityDisplay}, {stateDisplay}
              </h2>
              <span
                className={CHIP}
                style={{ backgroundColor: "#e3f3e7", color: "#1d6b32" }}
              >
                Live · v1.0-fixed
              </span>
              {lowConfidence && (
                <span
                  className={CHIP}
                  style={{ backgroundColor: "#fce7ec", color: "#a3142b" }}
                  title="Low-confidence flag set on mvs_city_flags"
                >
                  ⚑ Low Confidence
                </span>
              )}
            </div>
            <p
              className="mt-2 text-[12px] leading-relaxed"
              style={{ color: MUTED }}
            >
              {provCount === 0 && weekCount === 0 ? (
                <>
                  No pipeline data yet for {cityDisplay}. Open the{" "}
                  <a href="/market-validation/rollout" className="font-semibold text-[#174be8] underline">
                    City Scoring Console
                  </a>{" "}
                  and click <strong>Run</strong> for {cityDisplay} to generate a Market Validation Score
                  (1–2 min). Once the run finishes, the score and sub-metrics will appear here automatically.
                </>
              ) : (
                <>
                  Computed from {provCount} provider{provCount === 1 ? "" : "s"} and {weekCount} week row
                  {weekCount === 1 ? "" : "s"}. Drag a weight slider below to sanity-check sensitivity
                  (preview-only, not persisted).
                </>
              )}
            </p>
          </div>
          <div className="flex w-[240px] shrink-0 flex-col items-end gap-2">
            <div className="text-[42px] font-black leading-none tabular-nums" style={{ color: NAVY }}>
              {result?.mvs != null ? result.mvs.toFixed(1) : "—"}
            </div>
            <div className="text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>
              {result?.mvs != null ? "Market Validation Score" : "Not scored yet"}
            </div>
            <button
              type="button"
              onClick={handleDownloadBrief}
              disabled={downloading || !result || !acs}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[#174be8] px-3 py-1.5 text-[12px] font-bold text-white hover:bg-[#1240c9] disabled:opacity-60"
              title="Download internal MVS brief (PDF)"
            >
              {downloading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <FileDown size={12} />
              )}
              {downloading ? "Generating…" : "Export PDF"}
            </button>
          </div>
        </div>
      </section>

      {/* Sub-score grid with live sliders */}
      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SUB_SCORE_META.map((meta) => {
          const score = result?.scores[meta.key] ?? null;
          const input = result?.inputs[meta.key] as any;
          const weight = weights[meta.key];
          return (
            <div
              key={meta.key}
              className="flex flex-col rounded-lg border bg-white p-4"
              style={{ borderColor: BORDER, minHeight: 260 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="text-[13px] font-bold" style={{ color: NAVY }}>
                      {meta.title}
                    </h3>
                    <span
                      className={CHIP}
                      style={{ backgroundColor: SOFT, color: BLUE }}
                    >
                      {Math.round(weight * 100)}%
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px]" style={{ color: MUTED }}>
                    {meta.subtitle}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div
                    className="text-[24px] font-black leading-none tabular-nums"
                    style={{ color: NAVY }}
                  >
                    {score != null ? score.toFixed(1) : "—"}
                  </div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>
                    / 100
                  </div>
                </div>
              </div>

              <div className="mt-2.5 rounded-md border border-dashed p-2" style={{ borderColor: BORDER }}>
                <div className="mb-1 flex items-center justify-between text-[10px]" style={{ color: MUTED }}>
                  <span>Weight (preview)</span>
                  <span className="font-semibold tabular-nums" style={{ color: NAVY }}>
                    {Math.round(weight * 100)}%
                  </span>
                </div>
                <Slider
                  value={[Math.round(weight * 100)]}
                  min={5}
                  max={40}
                  step={1}
                  aria-label={`${meta.title} weight`}
                  onValueChange={(vals) => {
                    const pct = vals[0] / 100;
                    setWeights((w) => ({ ...w, [meta.key]: pct }));
                  }}
                />
              </div>

              {input && (
                <ul className="mt-3 space-y-1 border-t border-dashed pt-2" style={{ borderColor: BORDER }}>
                  {Object.entries(input).map(([k, v]) => {
                    if (v == null || k === "year2Signal") return null;
                    return (
                      <li key={k} className="flex items-center justify-between text-[11px]">
                        <span style={{ color: MUTED }}>{k}</span>
                        <span className="font-medium tabular-nums" style={{ color: NAVY }}>
                          {typeof v === "number" ? (Number.isInteger(v) ? v : v.toFixed(2)) : String(v)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              <details className="mt-auto pt-3 text-[11px]">
                <summary
                  className="cursor-pointer font-semibold"
                  style={{ color: BLUE }}
                >
                  Show formula
                </summary>
                <pre
                  className="mt-2 whitespace-pre-wrap rounded-md p-2 text-[11px] leading-snug"
                  style={{
                    backgroundColor: SOFT,
                    color: NAVY,
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                  }}
                >
                  {meta.formula}
                </pre>
              </details>
            </div>
          );
        })}
      </section>

      {/* Premium provider table — live */}
      <section className="mb-6 rounded-lg border bg-white" style={{ borderColor: BORDER }}>
        <div
          className="flex items-center justify-between gap-2 border-b px-4 py-3"
          style={{ borderColor: BORDER }}
        >
          <div>
            <h3 className="text-[14px] font-bold" style={{ color: NAVY }}>
              Premium providers — live
            </h3>
            <p className="text-[11px]" style={{ color: MUTED }}>
              {premiumProviders.length} premium provider
              {premiumProviders.length === 1 ? "" : "s"} from{" "}
              <code className="rounded bg-[#f7faff] px-1 py-px text-[#174be8]">mvs_providers</code>.
            </p>
          </div>
          <span
            className={CHIP}
            style={{ backgroundColor: "#e3f3e7", color: "#1d6b32" }}
          >
            Live
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ color: MUTED }}>
                <th className="px-4 py-2 text-left font-semibold">Provider</th>
                <th className="px-4 py-2 text-right font-semibold">$ min/wk</th>
                <th className="px-4 py-2 text-right font-semibold">$ max/wk</th>
                <th className="px-4 py-2 text-left font-semibold">Category</th>
                <th className="px-4 py-2 text-right font-semibold">Weeks</th>
              </tr>
            </thead>
            <tbody>
              {premiumProviders.map((p) => {
                const pweeks = weeks.filter((w) => w.provider_id === p.id);
                const nameHref =
                  (p as any).website_url ||
                  (p as any).source_listing_url ||
                  p.url ||
                  null;
                const weekSourceHref =
                  pweeks.find((w) => (w as any).source_url)?.["source_url" as keyof typeof pweeks[number]] ?? null;
                return (
                  <tr
                    key={p.id}
                    className="border-t"
                    style={{ borderColor: BORDER }}
                  >
                    <td className="px-4 py-2.5 font-semibold" style={{ color: NAVY }}>
                      {nameHref ? (
                        <a
                          href={nameHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                          style={{ color: BLUE }}
                        >
                          {p.name}
                        </a>
                      ) : (
                        p.name
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: NAVY }}>
                      {p.price_min ? `$${p.price_min}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: NAVY }}>
                      {p.price_max ? `$${p.price_max}` : "—"}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: NAVY }}>
                      {p.category_classified ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: NAVY }}>
                      <span>{pweeks.length}</span>
                      {weekSourceHref ? (
                        <>
                          {" "}
                          <a
                            href={weekSourceHref as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] hover:underline"
                            style={{ color: BLUE }}
                            title="Open the page where these weeks were extracted"
                          >
                            source ↗
                          </a>
                        </>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {premiumProviders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[12px]" style={{ color: MUTED }}>
                    No premium providers classified yet. Run the pipeline (coming in Turn 5.2) to populate.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
