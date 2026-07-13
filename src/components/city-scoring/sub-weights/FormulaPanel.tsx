// "Show Formula" panel for the sub-metric weights drawer. Renders:
//   - TwoLineFormulaPanel: category formula line + overall composite line
//   - RecipeBlock: plain-English Step 1/2/3 with real numbers
//   - Live values table (raw → norm → share → contribution)
//
// Competitive Landscape has a dedicated branch that shows the Manus v2 CSI
// formula and its inputs instead of the generic sub-metric math.
//
// Extracted from SubMetricWeightsDrawer.tsx.

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { CategoryKey } from "@/stores/cityScoringStore";
import type { recomputeCategoryScore } from "@/lib/clientSubWeightScoring";
import { formatMetric } from "@/lib/numberFormat";

type Recompute = ReturnType<typeof recomputeCategoryScore> | null;

const fmt = (n: number | null | undefined, decimals = 1) =>
  n == null || !Number.isFinite(n) ? "—" : n.toFixed(decimals);

interface FormulaPanelProps {
  categoryKey: CategoryKey;
  categoryLabel: string;
  selectedCityLabel?: string;
  previewRecompute: Recompute;
  serverCategoryScore: number | null;
  masterWeightPct: number | null;
  masterWeightPendingPct: number | null;
  enabledSum: number;
  pendingEdits: boolean;
  overallFormula?: {
    parts: Array<{ key: CategoryKey; label: string; score: number | null; weightPct: number }>;
    composite: number | null;
  };
}

export function FormulaPanel({
  categoryKey,
  categoryLabel,
  selectedCityLabel,
  previewRecompute,
  serverCategoryScore,
  masterWeightPct,
  masterWeightPendingPct,
  pendingEdits,
  overallFormula,
}: FormulaPanelProps) {
  const masterPending =
    masterWeightPendingPct != null &&
    masterWeightPct != null &&
    Math.abs(masterWeightPendingPct - masterWeightPct) > 0.05;

  const Th = ({ label, tip }: { label: string; tip: string }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <th className="text-right px-2 py-1.5 font-medium cursor-help underline decoration-dotted decoration-[#c5cdda] underline-offset-2">
          {label}
        </th>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-[12px] leading-snug">
        {tip}
      </TooltipContent>
    </Tooltip>
  );

  // CSI / Competitive Landscape is locked & sourced from Manus v2. The
  // sub-metric × share math and the overall-city composite formula are not
  // meaningful here — show the CSI formula and its inputs instead.
  if (categoryKey === "competitiveLandscape") {
    return (
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-[12px] text-[#07142f] leading-relaxed">
        <section className="rounded-md border border-[#cfdcff] bg-[#f4f8ff] px-3 py-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wide text-[#174be8] mb-2">
            Competitive Opportunity formula{selectedCityLabel ? ` — ${selectedCityLabel}` : ""}
          </h4>
          <pre className="text-[11.5px] leading-relaxed text-[#07142f] whitespace-pre-wrap font-mono">
{`CSI = (National_Brand_Count_Weighted + Local_Provider_Estimate)
      ÷ (Elementary_Enrollment × (Median_HH_Income ÷ 65,000))`}
          </pre>
          <div className="mt-3 space-y-2 text-[11.5px] leading-snug">
            <div>
              <span className="font-semibold text-[#174be8]">Numerator = Supply.</span>{" "}
              <span className="text-[#526078]">
                How many camp options exist in this city — national brands (STEM ×2.0, other ×1.0)
                plus an estimate of local providers.
              </span>
            </div>
            <div>
              <span className="font-semibold text-[#174be8]">Denominator = Demand.</span>{" "}
              <span className="text-[#526078]">
                How many families want and can afford summer camps — kids in the right age range,
                adjusted for local income.
              </span>
            </div>
            <div className="text-[#526078]">
              <span className="font-semibold text-[#07142f]">Interpretation:</span> a CSI of 0.10
              means 0.10 supply units per demand-adjusted kid. Lower CSI = less competition relative
              to the market = more room for a new camp. National-brand presence is what differentiates
              cities — the local-camp estimate adds a roughly constant baseline to every market.
            </div>
          </div>
          <p className="text-[10.5px] text-[#8794ab] italic mt-3 leading-snug">
            Bridge: <span className="font-mono">Competitive Opportunity = 100 − CSI</span>. Low CSI / low saturation = high opportunity. The composite uses <span className="font-mono">Opportunity × Competitive Opportunity master weight</span>, so high contribution = good (matching Demand and Operator & Venue Supply).
          </p>
        </section>

        <section>
          <h4 className="text-[11px] font-bold uppercase tracking-wide text-[#526078] mb-1.5">
            Inputs from Manus{selectedCityLabel ? ` — ${selectedCityLabel}` : ""}
          </h4>
          <div className="rounded border border-[#eef2f7] overflow-hidden">
            <table className="w-full text-[11.5px] font-mono">
              <thead className="bg-[#fafbfd] text-[#526078]">
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium">Input</th>
                  <th className="text-right px-2 py-1.5 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {(previewRecompute?.contributions ?? []).map((c) => (
                  <tr key={c.key} className="border-t border-[#eef2f7]">
                    <td className="px-2 py-1 truncate max-w-[260px]" title={c.label}>{c.label}</td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {formatMetric(c.rawValue, c.key)}
                    </td>
                  </tr>
                ))}
                {(!previewRecompute || previewRecompute.contributions.length === 0) && (
                  <tr>
                    <td colSpan={2} className="px-2 py-3 text-center text-[#8794ab] italic">
                      Open this drawer from a selected city to see Manus inputs.
                    </td>
                  </tr>
                )}
              </tbody>
              {serverCategoryScore != null && (
                <tfoot className="bg-[#f7faff] border-t-2 border-[#eef2f7]">
                  <tr>
                    <td className="px-2 py-1.5 text-right font-semibold text-[#1a2540]">
                      Competitive Opportunity score (100 − CSI)
                    </td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-[#174be8]">
                      {serverCategoryScore.toFixed(1)}
                    </td>
                  </tr>
                  {masterWeightPct != null && (
                    <tr>
                      <td className="px-2 py-1.5 text-right text-[#526078]">
                        × master weight {masterWeightPct.toFixed(1)}% → composite contribution
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-[#174be8]">
                        {((serverCategoryScore * masterWeightPct) / 100).toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tfoot>
              )}
            </table>
          </div>
        </section>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-[12px] text-[#07142f] leading-relaxed">

      {pendingEdits && (
        <div className="rounded border border-[#fde68a] bg-[#fffbe6] px-3 py-2 text-[11.5px] text-[#854d0e] leading-snug">
          <span className="font-semibold">Pending edits — not yet applied.</span>{" "}
          The numbers below preview what scores would become if you click <em>Save &amp; Recalculate</em>.
        </div>
      )}

      <TwoLineFormulaPanel
        categoryKey={categoryKey}
        categoryLabel={categoryLabel}
        cityLabel={selectedCityLabel}
        previewRecompute={previewRecompute}
        overallFormula={overallFormula}
      />

      <section>
        <h4 className="text-[11px] font-bold uppercase tracking-wide text-[#526078] mb-2">
          How {selectedCityLabel ? `${selectedCityLabel} got its` : "this"} {categoryLabel} score
        </h4>
        <p className="text-[10.5px] text-[#8794ab] italic mb-2 leading-snug">
          This explains the <strong>{categoryLabel}</strong> category only. For how all categories combine into the overall city score, see the composite breakdown on the city row.
        </p>

        <RecipeBlock
          categoryLabel={categoryLabel}
          cityLabel={selectedCityLabel}
          previewRecompute={previewRecompute}
          masterWeightPct={masterWeightPct}
          serverCategoryScore={serverCategoryScore}
        />
      </section>

      <section>
        <h4 className="text-[11px] font-bold uppercase tracking-wide text-[#526078] mb-1.5">
          Live values{selectedCityLabel ? ` — ${selectedCityLabel}` : ""}
        </h4>
        {!previewRecompute ? (
          <p className="text-[11px] text-[#8794ab] italic">
            Open this drawer from a selected city to see this category's metrics
            with live raw → normalized → contribution math.
          </p>
        ) : (
          <>
            <p className="text-[11px] text-[#526078] mb-1.5 italic">
              Raw → scaled to Norm (0–100) → weighted by your Share → contributes to category score. Hover any column header for details.
            </p>
            <div className="rounded border border-[#eef2f7] overflow-hidden">
              <table className="w-full text-[11px] font-mono">
                <thead className="bg-[#fafbfd] text-[#526078]">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-medium">Metric</th>
                    <Th label="Raw" tip="Raw — the actual measured value for this city (e.g. number of children, median income)." />
                    <Th label="Norm" tip="Norm — the raw value rescaled to a 0–100 score using this metric's expected range, so different metrics can be compared." />
                    <Th label="Share" tip="Share — this metric's slice of the category, after auto-normalizing your typed weights so they sum to 100%." />
                    <Th label="Contrib" tip="Contrib — Norm × Share. Adding all Contrib values together gives this category's score." />
                  </tr>
                </thead>
                <tbody>
                  {previewRecompute.contributions.map((c) => (
                    <tr key={c.key} className={`border-t border-[#eef2f7] ${c.used ? "" : "text-[#9aa3b5]"}`}>
                      <td className="px-2 py-1 truncate max-w-[160px]" title={c.label}>{c.label}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{formatMetric(c.rawValue, c.key)}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{c.normalized == null ? "—" : c.normalized.toFixed(1)}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{c.used ? `${(c.subShare * 100).toFixed(1)}%` : "—"}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{c.used ? c.contribution.toFixed(2) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#f7faff] border-t-2 border-[#eef2f7]">
                  <tr>
                    <td colSpan={4} className="px-2 py-1.5 text-right font-semibold text-[#1a2540]">
                      {categoryLabel} score
                    </td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-[#1a2540]">
                      {previewRecompute.score == null ? "—" : previewRecompute.score.toFixed(1)}
                    </td>
                  </tr>
                  {masterWeightPct != null && previewRecompute.score != null && (
                    <tr>
                      <td colSpan={4} className="px-2 py-1.5 text-right text-[#526078]">
                        × master weight {masterWeightPct.toFixed(1)}% → composite contribution
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-[#174be8]">
                        {((previewRecompute.score * masterWeightPct) / 100).toFixed(2)}
                      </td>
                    </tr>
                  )}
                  {masterPending && (
                    <tr>
                      <td colSpan={5} className="px-2 py-1.5 text-[11px] text-[#854d0e] bg-[#fffbe6] border-t border-[#fde68a] leading-snug">
                        ⚠ You've dragged this category's master slider to <strong>{masterWeightPendingPct!.toFixed(1)}%</strong> on the city screen but haven't clicked <strong>Apply Weights</strong> yet. The composite still uses {masterWeightPct!.toFixed(1)}%.
                      </td>
                    </tr>
                  )}
                  {serverCategoryScore != null && (
                    <tr>
                      <td colSpan={4} className="px-2 py-1.5 text-right text-[#8794ab]">
                        Last stored {categoryLabel} score (for reference)
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-[#8794ab]">
                        {fmt(serverCategoryScore, 0)}
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
    </TooltipProvider>
  );
}

// ─────────────────────────── Plain-English recipe ───────────────────────────

function RecipeBlock({
  categoryLabel,
  cityLabel,
  previewRecompute,
  masterWeightPct,
  serverCategoryScore,
}: {
  categoryLabel: string;
  cityLabel?: string;
  previewRecompute: Recompute;
  masterWeightPct: number | null;
  serverCategoryScore: number | null;
}) {
  if (!previewRecompute) {
    return (
      <p className="text-[11.5px] text-[#8794ab] italic">
        Open this drawer from a selected city to see the step-by-step math with real numbers.
      </p>
    );
  }

  const contribs = previewRecompute.contributions;
  const used = contribs.filter((c) => c.used);
  const skipped = contribs.filter((c) => !c.used);
  const categoryScore = previewRecompute.score;
  const compositeContribution =
    categoryScore != null && masterWeightPct != null
      ? (categoryScore * masterWeightPct) / 100
      : null;

  // No usable sub-metrics. Two honest states (no "server fallback" wording):
  //   (a) every metric value is null for this city → name the gap
  //   (b) all sub-weights are zero → tell the user to move a slider
  if (used.length === 0) {
    const anyRawValue = contribs.some((c) => c.rawValue != null && Number.isFinite(c.rawValue));
    const allZeroWeights = !anyRawValue ? false : true;
    const missingLabels = contribs.filter((c) => c.rawValue == null).map((c) => c.label);
    return (
      <div className="rounded border border-[#e5eaf2] bg-[#f7faff] px-3 py-2.5 text-[12px] text-[#1a2540] leading-snug">
        {allZeroWeights ? (
          <>
            <strong>All sub-weights are set to 0.</strong> Move at least one slider above 0
            and click <em>Save &amp; Recalculate</em> to compute a live {categoryLabel} score.
          </>
        ) : (
          <>
            <strong>This city is missing raw data for:</strong>{" "}
            {missingLabels.length > 0 ? missingLabels.join(", ") : "every metric in this category"}.
            {serverCategoryScore != null && (
              <>
                {" "}Last stored {categoryLabel} score:{" "}
                <strong>{Math.round(serverCategoryScore)}</strong>.
              </>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Step 1 */}
      <div className="rounded border border-[#e5eaf2] bg-white px-3 py-2.5">
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-[11px] font-bold text-[#174be8]">STEP 1</span>
          <span className="text-[12px] text-[#1a2540] font-medium">Score each metric on a 0–100 scale</span>
        </div>
        <table className="w-full text-[11.5px]">
          <tbody>
            {used.map((c) => (
              <tr key={c.key} className="border-t border-[#f3f6fb] first:border-0">
                <td className="py-1 text-[#3a4256]">{c.label}</td>
                <td className="py-1 text-right tabular-nums text-[#6b7894] pr-2">
                  {formatMetric(c.rawValue, c.key)}
                </td>
                <td className="py-1 text-right tabular-nums text-[#174be8] font-semibold w-[60px]">
                  → {c.normalized == null ? "—" : c.normalized.toFixed(0)}
                </td>
              </tr>
            ))}
            {skipped.map((c) => (
              <tr key={c.key} className="border-t border-[#f3f6fb] text-[#b6bfd0]">
                <td className="py-1 italic">{c.label}</td>
                <td className="py-1 text-right tabular-nums pr-2">n/a</td>
                <td className="py-1 text-right text-[10.5px] italic w-[60px]">skipped</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Step 2 */}
      <div className="rounded border border-[#e5eaf2] bg-white px-3 py-2.5">
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-[11px] font-bold text-[#174be8]">STEP 2</span>
          <span className="text-[12px] text-[#1a2540] font-medium">Multiply each score by its weight (your sliders)</span>
        </div>
        <table className="w-full text-[11.5px] font-mono">
          <tbody>
            {used.map((c) => (
              <tr key={c.key} className="border-t border-[#f3f6fb] first:border-0">
                <td className="py-1 text-[#3a4256] truncate max-w-[200px] font-sans" title={c.label}>{c.label}</td>
                <td className="py-1 text-right tabular-nums text-[#6b7894] w-[140px]">
                  {c.normalized == null ? "—" : c.normalized.toFixed(0)} × {(c.subShare * 100).toFixed(0)}%
                </td>
                <td className="py-1 text-right tabular-nums text-[#1a2540] font-semibold w-[60px]">
                  = {c.contribution.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#cfdcff]">
              <td colSpan={2} className="py-1.5 text-right text-[12px] font-sans font-semibold text-[#1a2540]">
                {categoryLabel} category score =
              </td>
              <td className="py-1.5 text-right tabular-nums text-[14px] font-bold text-[#174be8]">
                {categoryScore == null ? "—" : categoryScore.toFixed(1)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Step 3 */}
      {masterWeightPct != null && categoryScore != null && compositeContribution != null && (
        <div className="rounded border border-[#cfdcff] bg-[#eef4ff] px-3 py-2.5">
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-[11px] font-bold text-[#174be8]">STEP 3</span>
            <span className="text-[12px] text-[#1a2540] font-medium">
              Right now, {categoryLabel} is set to {masterWeightPct.toFixed(0)}% of the overall city score
            </span>
          </div>
          <div className="text-[12.5px] font-mono text-[#1a2540] text-center py-1">
            {categoryScore.toFixed(1)} × {masterWeightPct.toFixed(0)}% ={" "}
            <span className="font-bold text-[14px] text-[#174be8]">
              {compositeContribution.toFixed(1)} points
            </span>
          </div>
          <p className="text-[10.5px] text-[#526078] text-center mt-1 leading-snug">
            …toward {cityLabel ?? "this city"}'s composite score with your current master sliders. Move the master sliders on the city screen to change this share.
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────── Two-line Show Formula panel ───────────────
// One math line for the current category, one for the overall city composite.
// Inputs (normalized 0–100 scores) × weights = output.
function TwoLineFormulaPanel({
  categoryKey,
  categoryLabel,
  cityLabel,
  previewRecompute,
  overallFormula,
}: {
  categoryKey: CategoryKey;
  categoryLabel: string;
  cityLabel?: string;
  previewRecompute: Recompute;
  overallFormula?: {
    parts: Array<{ key: CategoryKey; label: string; score: number | null; weightPct: number }>;
    composite: number | null;
  };
}) {
  const categoryParts = previewRecompute?.contributions.filter((c) => c.used) ?? [];
  const categoryScore = previewRecompute?.score ?? null;

  // Substitute the live-recomputed category score (1-decimal precision) into
  // the overall composite parts so the two lines reconcile exactly.
  const reconciledParts = (overallFormula?.parts ?? []).map((p) =>
    p.key === categoryKey && categoryScore != null
      ? { ...p, score: categoryScore }
      : p,
  );
  const reconciledComposite = (() => {
    if (reconciledParts.length === 0) return overallFormula?.composite ?? null;
    const totalWeight = reconciledParts.reduce((s, p) => s + p.weightPct, 0);
    if (totalWeight <= 0) return overallFormula?.composite ?? null;
    const sum = reconciledParts.reduce(
      (s, p) => s + (p.score ?? 0) * p.weightPct,
      0,
    );
    return sum / totalWeight;
  })();

  return (
    <section className="rounded-md border border-[#cfdcff] bg-[#f4f8ff] px-3 py-3 space-y-3">
      <h4 className="text-[11px] font-bold uppercase tracking-wide text-[#174be8]">
        Show formula{cityLabel ? ` — ${cityLabel}` : ""}
      </h4>

      {/* Line 1 — category formula */}
      <div>
        <div className="text-[11px] font-semibold text-[#1a2540] mb-1">
          {categoryLabel} category formula
        </div>
        {categoryParts.length === 0 ? (
          <div className="text-[11.5px] italic text-[#8794ab]">
            No metric inputs available for this city/category yet.
          </div>
        ) : (
          <div className="text-[12px] font-mono text-[#1a2540] leading-relaxed break-words">
            {categoryParts.map((c, i) => (
              <span key={c.key}>
                {i > 0 ? " + " : ""}
                <span className="whitespace-nowrap">
                  ({shortLabel(c.label)}{" "}
                  <span className="text-[#174be8] font-semibold">
                    {c.normalized == null ? "—" : c.normalized.toFixed(1)}
                  </span>{" "}
                  × <span className="text-[#526078]">{(c.subShare * 100).toFixed(0)}%</span>)
                </span>
              </span>
            ))}
            {" = "}
            <span className="font-bold text-[14px] text-[#174be8]">
              {categoryScore == null ? "—" : categoryScore.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Line 2 — overall city composite formula (reconciled to category line) */}
      <div className="pt-2 border-t border-[#cfdcff]">
        <div className="text-[11px] font-semibold text-[#1a2540] mb-1">
          Overall city formula{cityLabel ? ` — ${cityLabel}` : ""}
        </div>
        {reconciledParts.length === 0 ? (
          <div className="text-[11.5px] italic text-[#8794ab]">
            No composite breakdown available.
          </div>
        ) : (
          <div className="text-[12px] font-mono text-[#1a2540] leading-relaxed break-words">
            {reconciledParts.map((p, i) => (
              <span key={p.key}>
                {i > 0 ? " + " : ""}
                <span className="whitespace-nowrap">
                  {shortLabel(p.label)}{" "}
                  <span className="text-[#174be8] font-semibold">
                    {p.score == null ? "—" : p.score.toFixed(1)}
                  </span>{" "}
                  × <span className="text-[#526078]">{p.weightPct.toFixed(0)}%</span>
                </span>
              </span>
            ))}
            {" = "}
            <span className="font-bold text-[14px] text-[#174be8]">
              {reconciledComposite == null ? "—" : reconciledComposite.toFixed(1)}
            </span>
          </div>
        )}
        <p className="text-[10.5px] text-[#8794ab] italic mt-1 leading-snug">
          Uses your current master sliders. Categories at 0% contribute nothing.
        </p>
      </div>
    </section>
  );
}

// Trim long metric labels so the one-line formula stays readable.
function shortLabel(label: string): string {
  return label.length > 28 ? label.slice(0, 26) + "…" : label;
}
