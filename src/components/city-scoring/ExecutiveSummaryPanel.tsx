import { memo } from "react";
import { X } from "lucide-react";
import { CATEGORIES } from "@/lib/cityScoringPageHelpers";

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
  detailScore: number | string;
  detailCategoryScores: Record<string, number>;
  sigRows: SigRow[];
  execReportOpen: boolean;
  setExecReportOpen: (v: boolean) => void;
}

function ExecutiveSummaryPanelImpl({
  selectedCity,
  selectedState,
  detailScore,
  detailCategoryScores,
  sigRows,
  execReportOpen,
  setExecReportOpen,
}: Props) {
  const score = Math.round(Number(detailScore) || 0);
  const verdict = score >= 70 ? "high" : score >= 50 ? "moderate" : "low";
  const verdictLabel = verdict === "high" ? "high-opportunity" : verdict === "moderate" ? "moderate-opportunity" : "low-opportunity";
  // CATEGORY KEYS — must match src/lib/cityScoringPageHelpers.ts (`demand`,
  // `franchiseeSupply`, `competitiveLandscape`). Reading the wrong keys here
  // silently returns 0 and makes the expand panel narrate "thin / crowded"
  // for every city. Bug fixed May 24, 2026 after Brett caught it on Stillwater.
  const demand = Math.round(detailCategoryScores["demand"] ?? 0);
  const tam = Math.round(detailCategoryScores["franchiseeSupply"] ?? 0);
  const opp = Math.round(detailCategoryScores["competitiveLandscape"] ?? 0);
  const catParts = CATEGORIES.map((c) => {
    const v = Math.round(detailCategoryScores[c.key] ?? 0);
    return `${c.label} ${v}`;
  }).join(", ");
  const topSignals = sigRows.filter((r) => r.value !== "—").slice(0, 3);
  const sigText = topSignals.length
    ? topSignals.map((s) => `${s.label} (${s.value})`).join(", ")
    : "key market signals are still loading";
  const strongestCat = CATEGORIES
    .map((c) => ({ label: c.label, v: Math.round(detailCategoryScores[c.key] ?? 0) }))
    .sort((a, b) => b.v - a.v)[0];
  const weakestCat = CATEGORIES
    .map((c) => ({ label: c.label, v: Math.round(detailCategoryScores[c.key] ?? 0) }))
    .sort((a, b) => a.v - b.v)[0];
  let argument = "";
  if (verdict === "high") {
    argument = `Taken together, a composite of ${score} puts ${selectedCity} firmly in our high-priority bucket — the underlying signals point to durable family demand and a recruitable operator pool that, in our experience, translate into a franchise location worth a serious conversation rather than another data refresh.`;
  } else if (verdict === "moderate") {
    argument = `Netted out, a composite of ${score} lands ${selectedCity} squarely in the moderate band: worth keeping on the watchlist as a secondary target, with the ${weakestCat.label.toLowerCase()} side of the equation determining whether it eventually graduates into a priority market.`;
  } else {
    argument = `On balance, a composite of ${score} reads as a low-priority market today — the category mix simply does not yet justify outbound investment in ${selectedCity} without a compelling local thesis (an inbound operator, a real-estate opening, or a partner referral) to change the calculus.`;
  }
  const summary = `${selectedCity}, ${selectedState} earns a ${score}/100 composite, placing it in the ${verdictLabel.replace("-", " ")} band of our 817-city universe. The score is anchored by ${strongestCat.label} at ${strongestCat.v} and pulled down most by ${weakestCat.label} at ${weakestCat.v} (full breakdown: ${catParts}). Standout signals beneath the score include ${sigText} — concrete, sourced data points rather than impressions. ${argument}`;

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
}

export const ExecutiveSummaryPanel = memo(ExecutiveSummaryPanelImpl);

