import { Calculator, Info, AlertTriangle } from "lucide-react";

const TIERS = [
  { range: "< 0.0010", label: "Very High Opportunity", bg: "#dcf5e6", fg: "#0a7a3d", dot: "#0ea66e" },
  { range: "0.0010 – 0.0019", label: "High Opportunity", bg: "#d6f0ec", fg: "#0b6f63", dot: "#14b8a6" },
  { range: "0.0020 – 0.0034", label: "Moderate", bg: "#fff4cc", fg: "#7a5b00", dot: "#eab308" },
  { range: "0.0035 – 0.0049", label: "Competitive", bg: "#ffe4cc", fg: "#8a4500", dot: "#f97316" },
  { range: "≥ 0.0050", label: "Saturated", bg: "#ffd6d6", fg: "#8a1a1a", dot: "#dc2626" },
];

const EXAMPLE_ROWS = [
  { step: "Demand", calc: "8,400 × (72,000 ÷ 65,000)", result: "9,295" },
  { step: "STEM supply", calc: "4 locations × 2.0", result: "8.0" },
  { step: "General supply", calc: "2 locations × 1.0", result: "2.0" },
  { step: "Local estimate", calc: "8,400 × 0.003", result: "25.2" },
  { step: "Total supply", calc: "8.0 + 2.0 + 25.2", result: "35.2" },
  { step: "CSI", calc: "35.2 ÷ 9,295", result: "0.00379" },
  { step: "Category", calc: "—", result: "Moderate" },
];

const STEM_BRANDS = [
  "Code Ninjas", "Snapology", "Engineering For Kids", "Bricks 4 Kidz",
  "iD Tech", "Camp Invention", "Mad Science", "Galileo Learning", "Challenge Island",
];

const GENERAL_BRANDS = [
  "Young Chefs Academy", "Primrose Schools", "Goddard School",
  "KinderCare", "i9 Sports", "Wiz Kids Camps",
];

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

export default function Methodology() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8 text-[#07142f]">
      {/* Header */}
      <header className="mb-8 border-b border-[#eef2f7] pb-5">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#174be8] mb-2">
          <Calculator size={14} />
          Methodology
        </div>
        <h1 className="text-2xl font-black tracking-tight text-[#07142f]">
          How the CSI Score is Calculated
        </h1>
        <p className="text-sm text-[#526078] mt-1">
          Methodology &amp; Data Documentation — Version 2.0
        </p>
      </header>

      {/* Section 1 */}
      <section className="mb-10">
        <SectionTitle n={1}>What is the CSI?</SectionTitle>
        <div className="space-y-3 text-[13.5px] leading-relaxed text-[#1a2540]">
          <p>
            The <strong>Competitive Saturation Index (CSI)</strong> is the core ranking metric in
            this tool. It measures how much competition exists in a city relative to the size and
            wealth of the market.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Lower CSI</strong> = less competition = more opportunity for a new franchise.</li>
            <li><strong>Higher CSI</strong> = more saturated market = harder to enter.</li>
          </ul>
          <p>
            The CSI is <strong>pre-calculated and stored in the database</strong>. The app displays
            it directly — it does not recalculate it on import. The only time the CSI recalculates
            is when a user manually edits the National Brand Count or Local Provider Estimate for a
            specific city.
          </p>
        </div>
      </section>

      {/* Section 2 */}
      <section className="mb-10">
        <SectionTitle n={2}>The Formula</SectionTitle>
        <FormulaBlock>{`CSI = Total Weighted Supply ÷ Demand Adjusted Market`}</FormulaBlock>

        <h3 className="text-[13px] font-bold text-[#07142f] mt-5 mb-2">Step 1 — Demand Adjusted Market</h3>
        <FormulaBlock>{`Demand = Elementary Enrollment × (Median HH Income ÷ 65,000)`}</FormulaBlock>
        <p className="text-[13px] text-[#526078] mt-2 leading-relaxed">
          The national median household income baseline is <strong>$65,000</strong>. Cities with
          higher income have more families who can afford paid camps, so demand is scaled up.
          Cities below the median are scaled down.
        </p>

        <h3 className="text-[13px] font-bold text-[#07142f] mt-5 mb-2">Step 2 — Total Weighted Supply</h3>
        <FormulaBlock>{`Supply = (STEM Brand Locations × 2.0)
       + (General Brand Locations × 1.0)
       + Local Provider Estimate`}</FormulaBlock>
        <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-[#1a2540]">
          <div>
            <p><strong>STEM brands × 2.0</strong> — direct competitors weighted double:</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {STEM_BRANDS.map((b) => (
                <span key={b} className="inline-block rounded bg-[#eef4ff] text-[#174be8] px-2 py-0.5 text-[11.5px] font-medium">{b}</span>
              ))}
            </div>
          </div>
          <div>
            <p><strong>General brands × 1.0</strong> — indirect competitors at face value:</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {GENERAL_BRANDS.map((b) => (
                <span key={b} className="inline-block rounded bg-[#f3f5f9] text-[#526078] px-2 py-0.5 text-[11.5px] font-medium">{b}</span>
              ))}
            </div>
          </div>
          <p>
            <strong>Local Provider Estimate = Elementary Enrollment × 0.003</strong> — a small
            baseline for unlisted local camps, YMCAs, churches and nonprofits (~25 providers per
            8,400 students).
          </p>
        </div>

        <h3 className="text-[13px] font-bold text-[#07142f] mt-5 mb-2">Step 3 — Divide</h3>
        <FormulaBlock>{`CSI = Supply ÷ Demand`}</FormulaBlock>

        <div className="mt-5 rounded-md border border-[#cfe0ff] bg-[#eef5ff] p-4 text-[13px] leading-relaxed text-[#1a2540]">
          <p className="font-semibold text-[#174be8] mb-1">Important — CSI direction vs. Competitive Opportunity</p>
          <p>
            The raw <strong>CSI score</strong> from this methodology is a <strong>saturation</strong> measure where <strong>lower = better</strong> (less competition = more opportunity). The rest of the app speaks in <strong>Competitive Opportunity</strong> — a 0–100 pillar where <strong>higher = better</strong>, so it aligns with Demand and TAM Teachers. The single shared helper <code>competitiveOpportunityFromCsi(csi)</code> in <code>src/lib/marketView.ts</code> performs the flip. No UI surface inverts CSI inline; everything reads through that helper so the polarity can never get out of sync.
          </p>
        </div>
      </section>


      {/* Section 3 */}
      <section className="mb-10">
        <SectionTitle n={3}>Worked Example</SectionTitle>
        <div className="rounded-md border border-[#eef2f7] bg-white">
          <div className="border-b border-[#eef2f7] bg-[#f8fafe] px-4 py-2.5 text-[12.5px] text-[#526078]">
            <strong className="text-[#07142f]">Example city:</strong> 8,400 K–6 students,
            $72,000 median income, 4 STEM brand locations, 2 general brand locations.
          </div>
          <table className="w-full text-[13px]">
            <thead className="bg-[#fafbfd] text-[#526078]">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Step</th>
                <th className="text-left px-4 py-2 font-semibold">Calculation</th>
                <th className="text-right px-4 py-2 font-semibold">Result</th>
              </tr>
            </thead>
            <tbody>
              {EXAMPLE_ROWS.map((r) => (
                <tr key={r.step} className="border-t border-[#eef2f7]">
                  <td className="px-4 py-2 font-semibold text-[#07142f]">{r.step}</td>
                  <td className="px-4 py-2 font-mono text-[12.5px] text-[#526078]">{r.calc}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold text-[#174be8]">{r.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 4 */}
      <section className="mb-10">
        <SectionTitle n={4}>Saturation Tiers</SectionTitle>
        <div className="rounded-md border border-[#eef2f7] bg-white overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-[#fafbfd] text-[#526078]">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">CSI Range</th>
                <th className="text-left px-4 py-2 font-semibold">Category</th>
                <th className="text-left px-4 py-2 font-semibold">Color</th>
              </tr>
            </thead>
            <tbody>
              {TIERS.map((t) => (
                <tr key={t.range} className="border-t border-[#eef2f7]">
                  <td className="px-4 py-2 font-mono tabular-nums text-[#07142f]">{t.range}</td>
                  <td className="px-4 py-2">
                    <span
                      className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[12px] font-semibold"
                      style={{ backgroundColor: t.bg, color: t.fg }}
                    >
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: t.dot }} />
                      {t.label}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[12.5px] text-[#526078]">
                    <span className="inline-block h-3 w-3 rounded mr-1.5 align-middle" style={{ backgroundColor: t.dot }} />
                    {t.label.includes("Very High") ? "Green" :
                     t.label.includes("High") ? "Teal / Light Green" :
                     t.label === "Moderate" ? "Yellow" :
                     t.label === "Competitive" ? "Orange" : "Red"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 5 */}
      <section className="mb-10">
        <SectionTitle n={5}>Important Notes</SectionTitle>
        <div className="space-y-3">
          <div className="flex gap-3 rounded-md border border-[#cfdcff] bg-[#f4f8ff] px-4 py-3">
            <Info size={16} className="text-[#174be8] flex-shrink-0 mt-0.5" />
            <p className="text-[13px] leading-relaxed text-[#1a2540]">
              The CSI score in the database is <strong>pre-calculated</strong> — display it as-is.
              Do not recalculate on import.
            </p>
          </div>
          <div className="flex gap-3 rounded-md border border-[#cfdcff] bg-[#f4f8ff] px-4 py-3">
            <Info size={16} className="text-[#174be8] flex-shrink-0 mt-0.5" />
            <p className="text-[13px] leading-relaxed text-[#1a2540]">
              The local provider estimate (<span className="font-mono">× 0.003</span>) is a modeled
              approximation, not a precise count. Users can override it per city using the inline
              edit feature; the CSI will recalculate automatically when they do.
            </p>
          </div>
          <div className="flex gap-3 rounded-md border border-[#fde68a] bg-[#fffbe6] px-4 py-3">
            <AlertTriangle size={16} className="text-[#a16207] flex-shrink-0 mt-0.5" />
            <p className="text-[13px] leading-relaxed text-[#854d0e]">
              <strong>V2.0 correction:</strong> The V1.0 multiplier was{" "}
              <span className="font-mono">0.15</span>, which produced ~1,260 local providers for a
              city with 8,400 students — 50× too high. V2.0 corrects this to{" "}
              <span className="font-mono">0.003</span>, producing ~25 local providers for the same
              city.
            </p>
          </div>
          <div className="flex gap-3 rounded-md border border-[#eef2f7] bg-white px-4 py-3">
            <Info size={16} className="text-[#526078] flex-shrink-0 mt-0.5" />
            <p className="text-[13px] leading-relaxed text-[#1a2540]">
              CSI scores are small decimal numbers (typically{" "}
              <span className="font-mono">0.00100 – 0.00800</span>). Display them to 5 decimal
              places.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
