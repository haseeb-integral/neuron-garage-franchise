// RowScorePopover — "Why this tier?" popover content for a single market row.
//
// Shows BOTH numbers a user sees on the row:
//   • Weighted Composite Index (raw)  = Σ (weight% × raw category score)
//   • Total Score (calibrated)        = same number on the school-grade curve
//
// The popover receives both pre-minted from marketView so it does NOT
// re-calibrate. Previously it received only the already-calibrated composite
// and ran the curve a second time, which silently double-calibrated.

import type { CategoryKey } from "@/stores/cityScoringStore";
import { calibratePillarForDisplay } from "@/lib/marketView";

interface Cat {
  key: CategoryKey;
  label: string;
}

interface Props {
  city: string;
  state: string;
  categories: Cat[];
  categoryScores: Partial<Record<CategoryKey, number | null>>;
  appliedWeights: Record<CategoryKey, number>;
  /** Raw Weighted Composite Index (pre-calibration). */
  rawComposite: number;
  /** Calibrated Total Score (display). */
  displayComposite: number;
  tier: "A" | "B" | "C" | "D" | string;
}

export function RowScorePopover({
  city,
  state,
  categories,
  categoryScores,
  appliedWeights,
  rawComposite,
  displayComposite,
  tier,
}: Props) {
  const total = Object.values(appliedWeights).reduce((s, v) => s + v, 0) || 1;
  const rows = categories.map((c) => {
    const raw = categoryScores[c.key];
    const rawScore = raw == null ? null : Math.round(Number(raw));
    const displayScore = raw == null ? null : calibratePillarForDisplay(Number(raw));
    const weightPct = (appliedWeights[c.key] / total) * 100;
    const contribution = rawScore == null ? null : (weightPct * rawScore) / 100;
    return { key: c.key, label: c.label, weightPct, rawScore, displayScore, contribution };
  });
  const sumContribution = rows.reduce((s, r) => s + (r.contribution ?? 0), 0);
  const missingCount = rows.filter((r) => r.rawScore == null).length;

  return (
    <div className="w-[380px] p-3">
      <div className="mb-2">
        <p className="text-[12px] font-semibold text-[#07142f]">{city}, {state}</p>
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#526078]">Why Tier {tier}?</p>
      </div>
      <div className="rounded border border-[#eef2f7] overflow-hidden">
        <table className="w-full text-[11px] font-mono">
          <thead className="bg-[#fafbfd] text-[#526078]">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium">Category</th>
              <th className="text-right px-2 py-1.5 font-medium">Weight</th>
              <th className="text-right px-2 py-1.5 font-medium" title="Calibrated pillar score (school-grade)">Score</th>
              <th className="text-right px-2 py-1.5 font-medium" title="Weight% × raw pillar score">Contrib.</th>
            </tr>
          </thead>
          <tbody className="text-[#1a2540]">
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-[#eef2f7]">
                <td className="text-left px-2 py-1.5">{r.label}</td>
                <td className="text-right px-2 py-1.5 tabular-nums">{r.weightPct.toFixed(1)}%</td>
                <td className="text-right px-2 py-1.5 tabular-nums">
                  {r.displayScore == null
                    ? <span className="text-[#c2410c]" title="No data — excluded from composite">—</span>
                    : r.displayScore}
                </td>
                <td className="text-right px-2 py-1.5 tabular-nums">
                  {r.contribution == null ? "—" : r.contribution.toFixed(1)}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-[#c5cdda] bg-[#fafbfd] font-bold">
              <td className="text-left px-2 py-1.5" colSpan={2}>Weighted Composite Index (raw)</td>
              <td className="text-right px-2 py-1.5 tabular-nums text-[#526078]" title={`Σ contributions = ${sumContribution.toFixed(1)}`}>=</td>
              <td className="text-right px-2 py-1.5 tabular-nums text-[#07142f]">{Math.round(rawComposite)}</td>
            </tr>
            <tr className="bg-[#eef5ff] font-bold">
              <td className="text-left px-2 py-1.5 text-[#174be8]" colSpan={2}>Total Score (calibrated)</td>
              <td className="text-right px-2 py-1.5 tabular-nums text-[#526078]" title="Monotonic display curve — sort order and tier are preserved">→</td>
              <td className="text-right px-2 py-1.5 tabular-nums text-[#174be8]">{Math.round(displayComposite)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-[#526078] mt-2 leading-snug">
        Formula: <strong>Weighted Composite Index</strong> = Σ (master weight % × raw category score). The <strong>Total Score</strong> is the same number passed through a <strong>monotonic curve</strong> so it reads on the A–F grade scale (order &amp; tiers preserved). Tier boundaries are on the <strong>Total Score</strong>: A ≥ 90, B ≥ 80, C ≥ 70, D &lt; 70. <a href="/scoring-method" className="text-[#174be8] underline">Scoring Method →</a>
      </p>

      {missingCount > 0 && (
        <p className="text-[10.5px] text-[#c2410c] mt-1 leading-snug italic">
          {missingCount} categor{missingCount === 1 ? "y has" : "ies have"} no data and {missingCount === 1 ? "is" : "are"} excluded from the composite.
        </p>
      )}
    </div>
  );
}
