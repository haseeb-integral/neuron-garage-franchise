// Scoring Method — explains the two-number contract for every market:
//   1. Weighted Composite Index (raw math, drives sort)
//   2. Total Score (display, calibrated via a monotonic curve to match A–F grades)
// Plus how the four tiers (A/B/C/D) are assigned by absolute Total Score
// (A ≥ 90, B ≥ 80, C ≥ 70, D < 70) so tier counts respond to weight changes.

import { Gauge, Info, ArrowRight } from "lucide-react";
import { DocShell, DocCard } from "@/components/DocShell";


function FormulaBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="rounded-md border border-[#cfdcff] bg-[#f4f8ff] px-4 py-3 text-[13px] font-mono text-[#07142f] leading-relaxed whitespace-pre-wrap">
      {children}
    </pre>
  );
}

function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 mb-3">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[#174be8]">
        Section {n}
      </span>
      <h2 className="text-base font-bold text-[#07142f]">{children}</h2>
    </div>
  );
}

// Calibration anchors mirror src/lib/marketView.ts. Keep in sync.
const ANCHORS: Array<[number, number]> = [
  [0, 0],
  [20, 40],
  [35, 60],
  [41, 70],
  [50, 80],
  [59, 90],
  [74, 100],
  [100, 100],
];

const TIER_ROWS = [
  { tier: "A", scoreBand: "90 – 100", rawBand: "raw ≥ 59", reads: "A — top of the class",      bg: "#e6f7ef", fg: "#0a7a3d" },
  { tier: "B", scoreBand: "80 – 89",  rawBand: "raw 50 – 58", reads: "B — strong market",      bg: "#eaf0ff", fg: "#174be8" },
  { tier: "C", scoreBand: "70 – 79",  rawBand: "raw 41 – 49", reads: "C — passable",           bg: "#fff6dc", fg: "#b8860b" },
  { tier: "D", scoreBand: "< 70",     rawBand: "raw < 41",    reads: "D / F — below cutoff",   bg: "#fff1e6", fg: "#c2410c" },
];

export default function ScoringMethod() {
  return (
    <DocShell
      eyebrow="Scoring Method"
      eyebrowIcon={Gauge}
      title={<>From Weighted Composite Index to Total Score</>}
      subtitle="How city scores are computed, calibrated for display, and bucketed into Tiers A–D."
    >
      <DocCard>
        <div className="text-[#07142f]">


      {/* Section 1 */}
      <section className="mb-10">
        <SectionTitle n={1}>Two numbers, one truth</SectionTitle>
        <div className="space-y-3 text-[13.5px] leading-relaxed text-[#1a2540]">
          <p>
            Every market in this tool carries <strong>two numbers</strong> that describe the same
            underlying truth on two different scales. They are always shown side-by-side wherever
            the math is exposed (popovers, drawers, XLSX exports) so the calibration is fully
            auditable.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <div className="rounded-md border border-[#cfdcff] bg-[#f4f8ff] p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#174be8] mb-1">Internal — the math</div>
              <div className="text-[15px] font-bold text-[#07142f]">Weighted Composite Index</div>
              <p className="text-[12.5px] text-[#526078] mt-2">
                The raw weighted sum of the three pillars. Used for sorting cities and assigning
                Tiers A–D. This is the engine's ground truth and is never altered for display.
              </p>
            </div>
            <div className="rounded-md border border-[#bfe7d3] bg-[#f1faf4] p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#0a7a3d] mb-1">Display — the grade</div>
              <div className="text-[15px] font-bold text-[#07142f]">Total Score</div>
              <p className="text-[12.5px] text-[#526078] mt-2">
                The same number passed through a <strong>monotonic curve</strong> so the scale
                reads like a school grade (A–F). Sort order and tiers are mathematically identical
                to the Index — only the displayed value shifts up.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 */}
      <section className="mb-10">
        <SectionTitle n={2}>How the Weighted Composite Index is calculated</SectionTitle>
        <div className="space-y-3 text-[13.5px] leading-relaxed text-[#1a2540]">
          <p>
            The Index is a weighted sum of two pillar scores, each on a 0–100 scale where
            <strong> higher = better</strong>:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Demand</strong> — child population, dual-income families, household income, college-educated parents.</li>
            <li><strong>Operator & Venue Supply</strong> — elementary teacher supply, school counts, cost-of-living-adjusted salaries.</li>
          </ul>
          <FormulaBlock>{`Weighted Composite Index
  = (master_weight_demand × DemandScore)
  + (master_weight_tam    × TAMTeachersScore)

where master weights are normalized to sum to 100%.`}</FormulaBlock>
          <p className="text-[12.5px] text-[#526078] italic">
            Note (2026-07-07): the CSI-derived Competitive Opportunity pillar was removed from
            the composite. Provider counts and saturation still appear as reference data on the
            selected-market panel, but they no longer influence the score or the rank.
          </p>
          <p>
            The Index is stored in the database (<code>composite_score_default</code>) so the
            national ranking is instant at query time. When a user adjusts master weights or
            sub-metric weights in the right panel, the Index is recomputed client-side from the
            same pillar inputs — never from the calibrated display number.
          </p>
        </div>
      </section>

      {/* Section 3 */}
      <section className="mb-10">
        <SectionTitle n={3}>Why we calibrate for display</SectionTitle>
        <div className="space-y-3 text-[13.5px] leading-relaxed text-[#1a2540]">
          <p>
            In practice the strongest U.S. metros land in the raw 60s–70s on the Index (current
            observed max ≈ 74, median ≈ 41). A teacher looking at a Tier A city labeled
            <strong> 63</strong> silently reads "C-/D+" and discounts the market. That is a UI
            calibration problem, not a math problem.
          </p>
          <p>
            The fix is a <strong>monotonic curve</strong> — a strictly-increasing piecewise-linear
            function that stretches the raw 0–100 scale into the intuitive A–F grade range. Every
            displayed Total Score is the raw Index passed through this single function in
            <code> src/lib/marketView.ts</code>.
          </p>
          <p className="text-[12.5px] text-[#526078] italic">
            Properties of the curve we rely on: <strong>monotonic</strong> (relative ordering is
            preserved exactly), <strong>anchored at 0 and 100</strong> (the scale still claims
            "/100"), <strong>tier-aligned</strong> (the 70/80/90 display cutoffs correspond to
            fixed raw cutoffs so tier counts respond to weight changes),
            <strong> pure</strong> (same input → same output, so the drift detector still works).
          </p>
        </div>
      </section>

      {/* Section 4 — anchor table */}
      <section className="mb-10">
        <SectionTitle n={4}>The calibration curve (anchor table)</SectionTitle>
        <div className="space-y-3 text-[13.5px] leading-relaxed text-[#1a2540]">
          <p>
            Total Score is computed by linear interpolation between these anchors. The curve is
            strictly increasing, so two cities cannot swap rank under it.
          </p>
          <div className="rounded-md border border-[#eef2f7] overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-[#fafbfd] text-[#526078]">
                <tr>
                  <th className="text-right px-4 py-2 font-semibold">Raw Weighted Composite Index</th>
                  <th className="text-center px-4 py-2 font-semibold w-12"></th>
                  <th className="text-right px-4 py-2 font-semibold">Total Score (displayed)</th>
                </tr>
              </thead>
              <tbody>
                {ANCHORS.map(([raw, display]) => (
                  <tr key={raw} className="border-t border-[#eef2f7]">
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-[#07142f]">{raw}</td>
                    <td className="px-4 py-2 text-center text-[#8794ab]"><ArrowRight size={14} className="inline" /></td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold text-[#174be8]">{display}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-[#526078]">
            Source of truth: <code>CALIBRATION_ANCHORS</code> in <code>src/lib/marketView.ts</code>.
            Changing these anchors requires Brett or Haseeb sign-off; ordering and tiers stay
            invariant as long as the sequence remains strictly increasing in both axes.
          </p>
        </div>
      </section>

      {/* Section 5 — tiers */}
      <section className="mb-10">
        <SectionTitle n={5}>Tiers A–D: by absolute Total Score</SectionTitle>
        <div className="space-y-3 text-[13.5px] leading-relaxed text-[#1a2540]">
          <p>
            Tiers are assigned by <strong>absolute Total Score</strong> using the same A–F cutoffs
            every teacher knows from school. Because each cutoff is a fixed score, tier
            <em> counts</em> respond to weight changes: bump a preset and you'll see cities cross
            the 90 / 80 / 70 thresholds in the Weighting Preview pills.
          </p>
          <div className="rounded-md border border-[#eef2f7] overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-[#fafbfd] text-[#526078]">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Tier</th>
                  <th className="text-left px-4 py-2 font-semibold">Total Score</th>
                  <th className="text-left px-4 py-2 font-semibold">Equivalent Raw Index</th>
                  <th className="text-left px-4 py-2 font-semibold">Reads Like</th>
                </tr>
              </thead>
              <tbody>
                {TIER_ROWS.map((r) => (
                  <tr key={r.tier} className="border-t border-[#eef2f7]">
                    <td className="px-4 py-2">
                      <span className="inline-block rounded px-2 py-0.5 text-[12px] font-bold" style={{ backgroundColor: r.bg, color: r.fg }}>
                        Tier {r.tier}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono tabular-nums text-[#07142f]">{r.scoreBand}</td>
                    <td className="px-4 py-2 font-mono tabular-nums text-[#526078]">{r.rawBand}</td>
                    <td className="px-4 py-2 text-[#526078]">{r.reads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 rounded-md border border-[#cfdcff] bg-[#f4f8ff] p-3 flex gap-2 items-start">
            <Info size={14} className="mt-0.5 text-[#174be8] flex-shrink-0" />
            <p className="text-[12.5px] text-[#1a2540] leading-relaxed">
              The raw-Index cutoffs are derived from the monotonic curve, so the two columns are
              two views of the same boundary. We compare against the raw Index internally so the
              tier of a city is determined the instant its weighted composite is computed — no
              extra rounding step.
            </p>
          </div>
        </div>
      </section>

      {/* Section 6 — guarantees */}
      <section className="mb-10">
        <SectionTitle n={6}>Correctness guarantees</SectionTitle>
        <div className="space-y-3 text-[13.5px] leading-relaxed text-[#1a2540]">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>One mint point.</strong> Every Total Score and raw Index displayed anywhere
              in the app is minted by <code>buildMarketView()</code> in
              <code> src/lib/marketView.ts</code>. Components never compute, never re-derive, and
              never round either value inside JSX. The branded <code>CompositeScore</code>
              TypeScript type enforces this at compile time.
            </li>
            <li>
              <strong>Drift detector.</strong> In dev, a guard rail throws a red console error if
              the same <code>(cityId, weightsHash)</code> ever mints two different composites in
              one render pass. This rule exists because we once shipped a bug where a table cell
              showed <code>88</code> while the gauge above it showed <code>23</code> for the same
              city.
            </li>
            <li>
              <strong>Auditable everywhere.</strong> The "Why this tier?" popover, the city detail
              drawer, and the XLSX export all show both the raw Weighted Composite Index and the
              calibrated Total Score side-by-side. The curve cannot hide.
            </li>
          </ul>
        </div>
      </section>
        </div>
      </DocCard>
    </DocShell>
  );

}
