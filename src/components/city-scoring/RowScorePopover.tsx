// RowScorePopover — "Why this tier?" popover content for a single market row.
// Shows the same math the central recomputeComposite uses: weight × score per
// category, summed to composite. Numbers are committed (last Apply) — this
// popover never displays preview math, to keep it consistent with the table.
//
// Transparency note (May 24, 2026): we surface BOTH the Weighted Composite
// Index (raw math, used for sort + tier assignment) and the Total Score
// (calibrated for readability) so power users can audit the calibration.

import type { CategoryKey } from "@/stores/cityScoringStore";
import { calibrateCompositeForDisplay } from "@/lib/marketView";


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
  composite: number;
  tier: "A" | "B" | "C" | "D" | string;
}

export function RowScorePopover({ city, state, categories, categoryScores, appliedWeights, composite, tier }: Props) {
  const total = Object.values(appliedWeights).reduce((s, v) => s + v, 0) || 1;
  const rows = categories.map((c) => {
    const raw = categoryScores[c.key];
    const score = raw == null ? null : Math.round(Number(raw));
    const weightPct = (appliedWeights[c.key] / total) * 100;
    const contribution = score == null ? null : (weightPct * score) / 100;
    return { key: c.key, label: c.label, weightPct, score, contribution };
  });
  const sumContribution = rows.reduce((s, r) => s + (r.contribution ?? 0), 0);
  const missingCount = rows.filter((r) => r.score == null).length;

  return (
    <div className="w-[360px] p-3">
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
              <th className="text-right px-2 py-1.5 font-medium">Score</th>
              <th className="text-right px-2 py-1.5 font-medium">Contribution</th>
            </tr>
          </thead>
          <tbody className="text-[#1a2540]">
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-[#eef2f7]">
                <td className="text-left px-2 py-1.5">{r.label}</td>
                <td className="text-right px-2 py-1.5 tabular-nums">{r.weightPct.toFixed(1)}%</td>
                <td className="text-right px-2 py-1.5 tabular-nums">
                  {r.score == null
                    ? <span className="text-[#c2410c]" title="No data — excluded from composite">—</span>
                    : r.score}
                </td>
                <td className="text-right px-2 py-1.5 tabular-nums">
                  {r.contribution == null ? "—" : r.contribution.toFixed(1)}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-[#c5cdda] bg-[#fafbfd] font-bold">
              <td className="text-left px-2 py-1.5" colSpan={2}>Composite</td>
              <td className="text-right px-2 py-1.5 tabular-nums text-[#526078]" title={`Σ contributions = ${sumContribution.toFixed(1)}`}>=</td>
              <td className="text-right px-2 py-1.5 tabular-nums text-[#07142f]">{Math.round(composite)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-[#526078] mt-2 leading-snug">
        Formula: Composite = Σ (master weight % × category score). Tier boundaries: A ≥ 80, B ≥ 65, C ≥ 50, D &lt; 50.
      </p>
      {missingCount > 0 && (
        <p className="text-[10.5px] text-[#c2410c] mt-1 leading-snug italic">
          {missingCount} categor{missingCount === 1 ? "y has" : "ies have"} no data and {missingCount === 1 ? "is" : "are"} excluded from the composite.
        </p>
      )}
    </div>
  );
}
