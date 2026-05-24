import { memo } from "react";
import { X, RefreshCw, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { CATEGORIES } from "@/lib/cityScoringPageHelpers";
import { buildPillarView, type PillarKey } from "@/lib/marketView";
import { bandFromDisplayScore, tierFromDisplayScore } from "@/lib/cityTiers";
import { useCityNarrative } from "@/lib/useCityNarrative";
import { AskCityPanel } from "./AskCityPanel";

export interface SigRow {
  key: string;
  label: string;
  source: string;
  value: string;
  rawValue: string | null;
  benchmark: { tone?: "good" | "mid" | "bad"; label: string } | null;
}

interface Props {
  selectedCity: string;
  selectedState: string;
  cityId: string | null;
  detailScore: number | string;
  detailCategoryScores: Record<string, number>;
  sigRows: SigRow[];
  execReportOpen: boolean;
  setExecReportOpen: (v: boolean) => void;
}

// Per-signal one-line explanations kept deterministic — short, factual,
// real value to the reader. The long prose is AI-generated.
const SIGNAL_EXPLAIN: Record<string, { good: string; mid: string; bad: string }> = {
  children_5_12_count: {
    good: "A large pool of elementary-age children — the core target customer is well-represented here.",
    mid: "A moderate pool of elementary-age children — the target customer base is present but not unusually deep.",
    bad: "A thin pool of elementary-age children — the core target customer base is small relative to top markets.",
  },
  median_household_income: {
    good: "Household income is high enough to comfortably support discretionary education spending.",
    mid: "Household income is workable for the program's price point, but not a tailwind.",
    bad: "Household income is below the level where after-school STEM spend is reliably discretionary — pricing or financial-aid messaging matters more here.",
  },
  dual_income_household_pct: {
    good: "A high share of dual-income households — strong demand driver for after-school programming.",
    mid: "A moderate share of dual-income households — some after-school demand pull, but not dominant.",
    bad: "A low share of dual-income households — less structural pull for paid after-school care.",
  },
  education_bachelors_plus_pct: {
    good: "Parents are highly educated, which correlates with willingness to pay for enrichment.",
    mid: "Parent education levels are average — receptive but not a standout driver.",
    bad: "Parent education levels are below benchmark — expect more friction explaining the value proposition.",
  },
  public_elementary_school_count: {
    good: "A dense network of elementary schools — many natural marketing and partnership channels.",
    mid: "A moderate elementary school footprint — workable for school-channel marketing.",
    bad: "A sparse elementary school footprint — fewer obvious distribution channels into families.",
  },
  public_elementary_teacher_count: {
    good: "A large pool of public-elementary teachers to recruit instructors and operators from.",
    mid: "An adequate teacher pool — hiring is possible but not abundant.",
    bad: "A small teacher pool — instructor and operator hiring will likely be the constraint.",
  },
  private_charter_school_count: {
    good: "Many private and charter schools — secondary partnership and enrollment channels are deep.",
    mid: "A moderate private/charter footprint — useful but not a primary driver.",
    bad: "Few private or charter schools — limited alternative distribution channels.",
  },
  public_elementary_enrollment: {
    good: "Total elementary enrollment is large — the addressable market of in-school children is substantial.",
    mid: "Elementary enrollment is moderate — workable addressable base.",
    bad: "Elementary enrollment is small — the in-school addressable base is limited.",
  },
  col_salary_index: {
    good: "Teacher salaries (cost-of-living adjusted) are favorable for recruiting at our payable wage.",
    mid: "Teacher salaries are in line with cost of living — recruiting economics are neutral.",
    bad: "Teacher salaries are high relative to cost of living — expect upward pressure on instructor pay.",
  },
  csi_national_brand_supply: {
    good: "National-brand STEM and enrichment competitors are under-represented — genuine white space for a new entrant.",
    mid: "Some national-brand competitors are present — entry is workable but requires sharper positioning.",
    bad: "The market is saturated with national-brand competitors — a new entrant needs a clear differentiator to win share.",
  },
  csi_local_camp_estimate: {
    good: "Few local camp and enrichment alternatives — local competitive pressure is limited.",
    mid: "A moderate field of local camp and enrichment alternatives — some competitive pressure on share of wallet.",
    bad: "Many local camp and enrichment alternatives — families already have plenty of substitutes for share of wallet.",
  },
  csi_demand_adjusted_market: {
    good: "Demand-adjusted market size (enrollment × income index) is large — the underlying spendable market is strong.",
    mid: "Demand-adjusted market size is moderate — workable but not a standout.",
    bad: "Demand-adjusted market size is small — the spendable market is limited relative to top metros.",
  },
};

function ExecutiveSummaryPanelImpl({
  selectedCity,
  selectedState,
  cityId,
  detailScore,
  detailCategoryScores,
  sigRows,
  execReportOpen,
  setExecReportOpen,
}: Props) {
  const score = Math.round(Number(detailScore) || 0);
  const band = bandFromDisplayScore(score);
  const tier = tierFromDisplayScore(score);
  const verdictLabel = band === "strong" ? "high-opportunity" : band === "moderate" ? "moderate-opportunity" : "low-opportunity";

  const pillars = buildPillarView(detailCategoryScores as Partial<Record<PillarKey, number>>);
  const pillarDisplay = (key: string): number => {
    if (key === "demand" || key === "franchiseeSupply" || key === "competitiveLandscape") {
      return pillars[key as PillarKey].display ?? 0;
    }
    const v = detailCategoryScores[key];
    return v == null ? 0 : Math.round(Number(v));
  };

  const signalRows = sigRows.filter((r) => r.value !== "—");
  const { data: narrative, loading, error, regenerate } = useCityNarrative({
    cityId,
    weightsHash: JSON.stringify({
      score,
      tier,
      pillars: {
        demand: pillarDisplay("demand"),
        tam_teachers: pillarDisplay("franchiseeSupply"),
        competitive_opportunity: pillarDisplay("competitiveLandscape"),
      },
      signals: signalRows.map((r) => ({
        key: r.key,
        value: r.value,
        benchmark: r.benchmark?.label ?? null,
      })),
    }),
    context: {
      total_score: score,
      tier: `Tier ${tier}`,
      pillars: {
        demand: pillarDisplay("demand"),
        tam_teachers: pillarDisplay("franchiseeSupply"),
        competitive_opportunity: pillarDisplay("competitiveLandscape"),
      },
      signals: signalRows.map((r) => ({
        key: r.key,
        label: r.label,
        source: r.source,
        value: r.value,
        benchmark: r.benchmark?.label ?? null,
      })),
    },
  });

  return (
    <>
      <div className="rounded-lg bg-white border border-[#eef2f7] p-3 flex-1 flex flex-col">
        <h4 className="text-xs font-bold text-[#07142f] mb-1">{selectedCity}, {selectedState}</h4>
        <p className="text-[10px] uppercase tracking-wide text-[#8794ab] mb-2 flex items-center gap-1">
          <Sparkles size={10} className="text-[#174be8]" /> AI Executive Summary
        </p>
        {loading && !narrative ? (
          <p className="text-[11px] text-[#8794ab] flex items-center gap-2"><Loader2 size={11} className="animate-spin" /> Generating analyst summary…</p>
        ) : error ? (
          <p className="text-[11px] text-[#c2410c]">
            Narrative unavailable. <button onClick={() => regenerate({ force: true })} className="underline">Retry</button>
          </p>
        ) : narrative ? (
          <p className="text-[11px] leading-relaxed text-[#3a4763] text-justify hyphens-auto">
            {narrative.executive_summary}{" "}
            <button
              type="button"
              onClick={() => setExecReportOpen(true)}
              className="font-semibold text-[#174be8] hover:underline whitespace-nowrap"
            >
              [Expand]
            </button>
          </p>
        ) : null}
      </div>

      {execReportOpen && (
        <div
          className="fixed inset-y-0 right-0 z-50 w-[50vw] bg-white border-l border-[#e5eaf2] shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
          role="dialog"
          aria-label={`${selectedCity}, ${selectedState} executive report`}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-white/95 backdrop-blur px-6 py-4 border-b border-[#eef2f7]">
            <h2 className="text-[15px] font-bold text-[#07142f]">
              {selectedCity}, {selectedState} — Market Research Report
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => regenerate({ force: true })}
                disabled={loading}
                className="inline-flex items-center gap-1 rounded-md border border-[#dbe4f2] px-2 py-1 text-[10.5px] text-[#174be8] hover:bg-[#f7faff] disabled:opacity-50"
                title="Regenerate (Flash)"
              >
                <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Regenerate
              </button>
              <button
                type="button"
                onClick={() => regenerate({ force: true, model: "pro" })}
                disabled={loading}
                className="inline-flex items-center gap-1 rounded-md border border-[#dbe4f2] bg-[#f7faff] px-2 py-1 text-[10.5px] text-[#174be8] hover:bg-[#eaf1ff] disabled:opacity-50"
                title="Regenerate using the higher-quality Pro model"
              >
                <Sparkles size={11} /> Pro
              </button>
              <button
                type="button"
                onClick={() => setExecReportOpen(false)}
                className="rounded-md p-1.5 text-[#526078] hover:bg-[#f1f4f9] hover:text-[#07142f]"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="px-6 py-5 space-y-5 pb-12">
            <div className="rounded-lg bg-[#f7faff] border border-[#e5eaf2] px-4 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] uppercase tracking-wide text-[#8794ab]">Total Score</span>
                <span className="text-[22px] font-bold text-[#07142f] tabular-nums">{score}<span className="text-[12px] text-[#8794ab] font-normal">/100</span></span>
              </div>
              <p className="mt-1 text-[12px] font-semibold text-[#174be8] capitalize">{verdictLabel.replace("-", " ")} market</p>
            </div>

            {loading && !narrative ? (
              <div className="rounded-lg border border-[#eef2f7] bg-white px-4 py-8 text-center text-[12px] text-[#8794ab]">
                <Loader2 size={16} className="mx-auto animate-spin mb-2" />
                Generating analyst write-up for {selectedCity}…
              </div>
            ) : error ? (
              <div className="rounded-lg border border-[#f5cbb8] bg-[#fdecea] px-4 py-3 text-[12px] text-[#c2410c]">
                Narrative unavailable. {error}.{" "}
                <button onClick={() => regenerate({ force: true })} className="underline font-semibold">Retry</button>
              </div>
            ) : narrative ? (
              <div className="prose prose-sm max-w-none text-[12.5px] leading-relaxed text-[#14233b]">
                <h3 className="text-[13px] font-bold text-[#07142f] mb-1.5">Market Snapshot</h3>
                <ReactMarkdown>{narrative.report_snapshot}</ReactMarkdown>
                <h3 className="text-[13px] font-bold text-[#07142f] mt-4 mb-1.5">Demand-Side Read</h3>
                <ReactMarkdown>{narrative.report_demand}</ReactMarkdown>
                <h3 className="text-[13px] font-bold text-[#07142f] mt-4 mb-1.5">Supply &amp; Competitive Read</h3>
                <ReactMarkdown>{narrative.report_supply}</ReactMarkdown>
                <h3 className="text-[13px] font-bold text-[#07142f] mt-4 mb-1.5">Recommended Next Move</h3>
                <ReactMarkdown>{narrative.report_next_move}</ReactMarkdown>
                {narrative.model_id && (
                  <p className="mt-3 text-[10px] text-[#8794ab] not-prose">
                    Generated by {narrative.model_id}{narrative.cached ? " (cached)" : ""}.
                  </p>
                )}
              </div>
            ) : null}

            {signalRows.length > 0 && (
              <section>
                <h3 className="text-[13px] font-bold text-[#07142f] mb-1.5">Key market signals, explained</h3>
                <p className="text-[12px] leading-relaxed text-[#526078] text-justify hyphens-auto mb-2">
                  These are the underlying data points feeding the score. Each comes from a named public source — nothing invented.
                </p>
                <div className="divide-y divide-[#f1f4f9] rounded-md border border-[#eef2f7] bg-white">
                  {signalRows.map((r) => {
                    const tone = r.benchmark?.tone;
                    const toneCls =
                      tone === "good" ? "bg-[#e6f7ef] text-[#0ea66e] border-[#bde9d2]" :
                      tone === "mid"  ? "bg-[#fff8e1] text-[#b88800] border-[#f3e0a8]" :
                      tone === "bad"  ? "bg-[#fdecea] text-[#c2410c] border-[#f5cbb8]" :
                      "bg-[#f1f4f9] text-[#526078] border-[#e5eaf2]";
                    const pillExplain = tone ? SIGNAL_EXPLAIN[r.key]?.[tone] ?? "" : "";
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
                        {pillExplain && (
                          <p className="mt-1.5 text-[11px] leading-relaxed text-[#3a4763]">{pillExplain}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <AskCityPanel
              cityId={cityId}
              cityName={selectedCity}
              stateName={selectedState}
              totalScore={score}
              narrativeContext={narrative ?? null}
            />
          </div>
        </div>
      )}
    </>
  );
}

export const ExecutiveSummaryPanel = memo(ExecutiveSummaryPanelImpl);
