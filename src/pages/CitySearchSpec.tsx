import { Map, ShieldCheck } from "lucide-react";
import { DocShell, DocCard } from "@/components/DocShell";
import { DownloadMDButton } from "@/components/DownloadMDButton";

// Kept in sync with the rendered page below so the download button gives users
// the same content as the live doc. If you edit the JSX, edit SPEC_MD too.
const SPEC_MD = `# Feature 1 — City Search (Spec)

**Status:** Shipped, evolving. **Version:** v1.0 (updated 2026-07-07). **Source of truth:** this page + \`src/pages/CityScoring.tsx\` + this chat.

City Search is the first feature in the franchise-development funnel. It ranks the 817-city US universe by a weighted composite score, lets the user filter, re-weight, save, compare, and export — and hands a curated shortlist to Feature 1A (Market Validation).

---

## 1. What this feature does

Takes the pre-scored universe of **817 US cities** and produces a **single composite score (0–100)** per city that answers: *"Is this a promising market to open a Neuron Garage in?"*

Output surfaces on \`/city-scoring\`:

- **Ranked list** of cities (city, state, composite score, tier letter, pillar scores).
- **Selected market panel** with pillar breakdown and signal-level evidence.
- **Compare modal** (2–4 cities side-by-side).
- **CSV export** and **PDF market report**.
- **Ask AI bar** — natural-language changes to filters + weights.
- **Saved searches** and **Watchlist** per user.

Not in scope: live scraping, provider counts (that's Feature 1A), site-level analysis (Feature 1B).

---

## 2. The city universe (817 cities)

- Source: \`public.us_cities_scored\` — one row per city, US-only, population ≥ ~25k.
- Every city carries pre-computed pillar sub-signals: demand signals (families, income, growth), franchisee-supply signals (teacher pool, education access), competitive-landscape signals (CSI counts — currently 0-weight).
- Scores are **recomputed client-side** through the shared marketView helper (\`src/lib/marketView.ts\`) every time weights or sub-weights change. **No stored composite** is trusted anywhere — table row, selected-market panel, compare modal, CSV, and PDF all read the same recomputed value (Brett's rule: "one calibrated number everywhere").

---

## 3. The composite formula

\`\`\`
Composite (0–100) =
    Demand weight            × Demand pillar score
  + Franchisee-Supply weight × Operator & Venue Supply pillar score
  + 0                        × Competitive Landscape  (retired from composite)
\`\`\`

- Weights sum to 100 and are exposed as two sliders.
- **Competitive Landscape** (CSI) is displayed for reference but does **not** contribute to the composite (Tier 1 rework, 2026-07-07). The Competition pillar will replace CSI in Phase 5.
- Each pillar is itself a weighted blend of its own sub-signals — editable per pillar via the Sub-Metric Weights drawer.
- The displayed 0–100 number goes through a monotonic calibration curve so the school-grade tier cutoffs are meaningful across the whole universe.

---

## 4. Tiers (A / B / C / D)

Tiers are assigned by **absolute display score** (not percentile rank), same scale a teacher would use in school.

| Tier | Display score |
| :--- | :--- |
| A | ≥ 90 |
| B | 80 – 89 |
| C | 70 – 79 |
| D | < 70 |

Because the cutoffs are absolute, tier counts respond to weight changes — bump Demand from 50 → 70 and you actually see "+10 Tier A" in the preview pills.

---

## 5. Presets (one-click recipes)

Three tiles at the top of the weights panel. Clicking one snaps both sliders and clears any sub-weight overrides.

| Preset | Demand | Operator & Venue Supply | Meaning |
| :--- | ---: | ---: | :--- |
| Balanced | 50 | 50 | Equal weight — the default |
| Demand-Heavy | 70 | 30 | Cities with more target families rise |
| Operator-Heavy | 30 | 70 | Cities with a large teacher pool rise |
| Custom | — | — | Auto-selected when sliders don't match a tile |

The three CSI-heavy legacy presets (Blue Ocean, Quick Launch, High Upside) were removed on 2026-07-07 with CSI leaving the composite.

---

## 6. Sub-Metric Weights drawer

Each pillar has a "⚙" button that opens a right-side drawer:

- Lists every SOW-registered sub-signal for that pillar with its current weight.
- Weights inside a pillar sum to 100.
- Reset button restores SOW defaults.
- Applying sub-weight changes triggers a full client-side recompute — table row, panel, compare modal, and export all update in place.

---

## 7. Filters

- **State** (multi-select combobox).
- **Minimum population**.
- **Minimum score**.
- **Tier** filter (A / B / C / D).
- **Non-registration-states only** (blocks franchise-registration states).
- **Watchlist only** (per-user, persisted).
- **City search** (free-text — narrows the visible list).

Every filter is state in \`useCityScoringStore\` and reflected in the URL where appropriate so the view is shareable.

---

## 8. Ranked list

- Sortable columns: city, state, composite, tier, each pillar.
- Row click → opens the Selected Market panel.
- Star icon → toggles watchlist for that city.
- Compare checkbox → adds to the Compare set (max 4).
- Row-level score popover ("RowScorePopover") shows the recomputed formula for that city — pillar × weight = contribution — using the shared helper.

---

## 9. Selected Market panel

Opens under the ranked list when a row is clicked. Sections:

- **Header:** city, state, composite score, tier letter, population, watchlist toggle.
- **Executive summary:** short narrative built from pillar bands (strong ≥ 90, moderate 70–89, weak < 70).
- **Pillar cards:** Demand and Operator & Venue Supply, each with sub-signal evidence and a source-data popover.
- **Key Market Signals:** the underlying signals (families with kids 5–12, HH income, teacher counts, licensed-worker counts, etc.) with source labels.
- **Actions:** Compare, Add to watchlist, Open PDF report.

---

## 10. Compare modal

- Up to 4 cities side-by-side.
- Rows for composite, tier, each pillar, and each key signal.
- **CSV export** of the comparison via \`src/lib/compareExport.ts\`.

---

## 11. Exports

- **CSV** — the full ranked list under current filters and weights. Handled by \`downloadRankedMarketsCsv()\` in \`src/lib/cityScoringLiveData.ts\`.
- **PDF Market Report** — per-city summary with pillar scores, signals, and sources. Uses jsPDF (lazy-loaded — only pulled in when the report modal opens).

---

## 12. Ask AI bar

Natural-language input at the top of the page (e.g. *"show me Tier A cities in Texas with high teacher supply"*).

- Sends the current session state (filters, applied weights, visible count) to the \`ai-city-query\` edge function.
- Response is an \`AiResult\` — filters + weights + a short explanation.
- Applies filter changes and weight changes to the store, and shows an "AI answer" card with a before/after weights diff.
- Uses Lovable AI Gateway (Gemini 2.0 Flash by default). No user API key required.

---

## 13. Saved searches (per-user)

- Table: \`public.saved_searches\` (RLS: own-row only).
- Stores filters + master weights + preset name.
- Load restores the full view. Delete removes the row.
- Managed by \`useSavedSearches\` hook (\`src/hooks/citySearch/useSavedSearches.ts\`).

---

## 14. Watchlist (per-user)

- Table: \`public.watchlist_items\` (RLS: own-row only).
- Star icon on any row toggles membership.
- "Watchlist only" filter narrows the list to starred cities.

---

## 15. Header notifications

Bell in the top header (\`PageHeader.tsx\` / \`CityTopBar.tsx\`) — see the *Notifications — Header Bell Plan*. City Search fires \`city_scoring_finished\` when a batch action completes.

---

## 16. Data sources feeding the pillars

| Pillar | Primary source | Notes |
| :--- | :--- | :--- |
| Demand | US Census ACS (families with kids 5–12, HH income ≥ $150k, growth) | Reused across features |
| Operator & Venue Supply | US Census ACS + BLS OES (teacher counts by occupation) | The "franchisee supply" number |
| Competitive Landscape | CSI counts (legacy) | Displayed only — weight 0 |

Full signal-level details live in **Demographics Method** and **Scoring Method**.

---

## 17. Locked-in behavior (do not change without approval)

- Composite = Demand + Operator & Venue Supply only. CSI does not count.
- Tier cutoffs are absolute display-score (A ≥ 90, B ≥ 80, C ≥ 70, D < 70).
- Every rendered composite reads through \`buildMarketView()\` — no raw stored composite reads outside the data-shaping layer.
- Presets clear sub-weight overrides on click.
- Saved searches and watchlist are per-user with RLS.

---

## 18. Deferred / out of scope for v1.0

- Live provider counts on the row (that's Feature 1A / MVS).
- Site-level analysis (that's Feature 1B).
- Real Competition pillar to replace legacy CSI display (**Phase 5**, blocked on the Manus v1.8 CSV import).
- International cities.
- Automatic re-scoring on Census data refresh (currently manual reseed via edge function).
`;

const PRESETS = [
  { name: "Balanced", demand: "50", tam: "50", tagline: "Equal weight — the default" },
  { name: "Demand-Heavy", demand: "70", tam: "30", tagline: "Cities with more target families rise" },
  { name: "Operator-Heavy", demand: "30", tam: "70", tagline: "Cities with a large teacher pool rise" },
  { name: "Custom", demand: "—", tam: "—", tagline: "Auto-selected when sliders don't match a tile" },
];

const TIERS = [
  { tier: "A", cutoff: "≥ 90", detail: "Top of the class." },
  { tier: "B", cutoff: "80 – 89", detail: "Strong candidate." },
  { tier: "C", cutoff: "70 – 79", detail: "Worth a look." },
  { tier: "D", cutoff: "< 70", detail: "Not a priority." },
];

const SURFACES = [
  { label: "Ranked list", detail: "Sortable columns: city, state, composite, tier, each pillar. Row click opens the Selected Market panel. Star toggles watchlist. Compare checkbox adds to the Compare set (max 4)." },
  { label: "Row-level score popover", detail: "Shows the recomputed formula for that city — pillar × weight = contribution — using the shared marketView helper." },
  { label: "Selected Market panel", detail: "Header, executive summary narrative, pillar cards (Demand + Operator & Venue Supply), Key Market Signals, actions (Compare, Watchlist, Open PDF)." },
  { label: "Compare modal", detail: "Up to 4 cities side-by-side. Rows for composite, tier, each pillar, each key signal. CSV export." },
  { label: "Ask AI bar", detail: "Natural language → filter + weight changes via ai-city-query edge function. Shows before/after weights diff." },
  { label: "Saved searches", detail: "Per-user (RLS). Stores filters + master weights + preset name. Load restores the full view." },
  { label: "Watchlist", detail: "Per-user (RLS). Star any row to add. 'Watchlist only' filter narrows the list." },
  { label: "CSV export", detail: "The full ranked list under current filters and weights (downloadRankedMarketsCsv)." },
  { label: "PDF Market Report", detail: "Per-city summary with pillar scores, signals, sources. Uses jsPDF — lazy-loaded when the report modal opens." },
  { label: "Header notifications bell", detail: "Fires city_scoring_finished when batch actions complete. 60s polling, RLS per user, capped '9+' badge." },
];

const FILTERS = [
  "State (multi-select combobox)",
  "Minimum population",
  "Minimum composite score",
  "Tier (A / B / C / D)",
  "Non-registration-states only (blocks franchise-registration states)",
  "Watchlist only",
  "Free-text city search",
];

const LOCKED_IN = [
  "Composite = Demand + Operator & Venue Supply only. CSI does not count.",
  "Tier cutoffs are absolute display-score (A ≥ 90, B ≥ 80, C ≥ 70, D < 70).",
  "Every rendered composite reads through buildMarketView() — no raw stored composite reads outside the data-shaping layer.",
  "Presets clear sub-weight overrides on click.",
  "Saved searches and watchlist are per-user with RLS.",
];

const DEFERRED = [
  "Live provider counts on the row (that's Feature 1A / MVS).",
  "Site-level analysis (Feature 1B).",
  "Real Competition pillar to replace legacy CSI display (Phase 5, blocked on Manus v1.8 CSV import).",
  "International cities.",
  "Automatic re-scoring on Census data refresh (currently manual reseed via edge function).",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-[#07142f] mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <pre className="rounded-md border border-[#cfdcff] bg-[#f4f8ff] px-4 py-3 text-[13px] font-mono text-[#07142f] leading-relaxed whitespace-pre-wrap">
      {children}
    </pre>
  );
}

export default function CitySearchSpec() {
  return (
    <DocShell
      eyebrow="Feature 1 · v1.0 Spec"
      eyebrowIcon={ShieldCheck}
      title="City Search — v1.0 Full Spec"
      subtitle="How the 817-city ranked list, presets, weights, tiers, filters, and exports work. Source of truth: this page + CityScoring.tsx + this chat. Updated 2026-07-07."
      action={<DownloadMDButton content={SPEC_MD} filename="city-search-spec.md" />}
    >
      <DocCard>
        <div className="space-y-12 text-[14px] leading-relaxed text-[#1a2540]">

          {/* Status */}
          <section className="rounded-md border border-[#cfdcff] bg-[#f4f8ff] p-4">
            <div className="text-[12px] font-bold uppercase tracking-wide text-[#174be8] mb-1">Status</div>
            <p className="text-[#07142f]">
              <strong>Shipped, evolving.</strong> Version <strong>v1.0</strong>. City Search is the first feature in the franchise-development funnel. It ranks the 817-city US universe by a weighted composite, lets you filter, re-weight, save, compare, and export — and hands a curated shortlist to Feature 1A (Market Validation).
            </p>
          </section>

          <Section title="1. What this feature does">
            <p>
              Takes the pre-scored universe of <strong>817 US cities</strong> and produces a <strong>single composite score (0–100)</strong> per city that answers: <em>"Is this a promising market to open a Neuron Garage in?"</em>
            </p>
            <p className="font-semibold text-[#07142f]">Output surfaces on <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">/city-scoring</code>:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Ranked list of cities (city, state, composite, tier, pillar scores).</li>
              <li>Selected market panel with pillar breakdown and signal-level evidence.</li>
              <li>Compare modal (2–4 cities side-by-side).</li>
              <li>CSV export and PDF market report.</li>
              <li>Ask AI bar — natural-language changes to filters + weights.</li>
              <li>Saved searches and Watchlist per user.</li>
            </ul>
            <p className="text-[13px] text-[#526078]">
              Not in scope: live scraping, provider counts (Feature 1A), site-level analysis (Feature 1B).
            </p>
          </Section>

          <Section title="2. The city universe (817 cities)">
            <ul className="list-disc pl-6 space-y-1">
              <li>Source table: <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">public.us_cities_scored</code> — one row per city, US-only, population ≥ ~25k.</li>
              <li>Every city carries pre-computed pillar sub-signals: demand (families, income, growth), franchisee-supply (teacher pool, education access), and legacy competitive-landscape signals.</li>
              <li>Scores are <strong>recomputed client-side</strong> through <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">src/lib/marketView.ts</code> every time weights or sub-weights change. <strong>No stored composite</strong> is trusted anywhere — table row, panel, compare, CSV, and PDF all read the same recomputed value (Brett's rule: "one calibrated number everywhere").</li>
            </ul>
          </Section>

          <Section title="3. The composite formula">
            <Formula>{`Composite (0–100) =
    Demand weight            × Demand pillar score
  + Franchisee-Supply weight × Operator & Venue Supply pillar score
  + 0                        × Competitive Landscape  (retired from composite)`}</Formula>
            <ul className="list-disc pl-6 space-y-1">
              <li>Weights sum to 100 and are exposed as two sliders.</li>
              <li><strong>Competitive Landscape</strong> (CSI) is displayed for reference but does <strong>not</strong> contribute to the composite (Tier 1 rework, 2026-07-07). The Competition pillar will replace CSI in Phase 5.</li>
              <li>Each pillar is a weighted blend of its own sub-signals — editable per pillar via the Sub-Metric Weights drawer.</li>
              <li>The displayed 0–100 number goes through a monotonic calibration curve so tier cutoffs are meaningful across the whole universe.</li>
            </ul>
          </Section>

          <Section title="4. Tiers (A / B / C / D)">
            <p>Tiers are assigned by <strong>absolute display score</strong> (not percentile rank).</p>
            <div className="rounded-md border border-[#eef2f7] bg-white overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-[#fafbfd] text-[#526078]">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold w-16">Tier</th>
                    <th className="text-left px-4 py-2 font-semibold w-32">Display score</th>
                    <th className="text-left px-4 py-2 font-semibold">Meaning</th>
                  </tr>
                </thead>
                <tbody className="text-[#1a2540]">
                  {TIERS.map((t) => (
                    <tr key={t.tier} className="border-t border-[#eef2f7]">
                      <td className="px-4 py-2 font-bold text-[#07142f]">{t.tier}</td>
                      <td className="px-4 py-2 font-mono">{t.cutoff}</td>
                      <td className="px-4 py-2">{t.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[13px] text-[#526078]">
              Because cutoffs are absolute, tier counts respond to weight changes — bump Demand from 50 → 70 and you actually see "+10 Tier A" in the preview pills.
            </p>
          </Section>

          <Section title="5. Presets (one-click recipes)">
            <p>Three tiles at the top of the weights panel. Clicking one snaps both sliders and clears any sub-weight overrides.</p>
            <div className="rounded-md border border-[#eef2f7] bg-white overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-[#fafbfd] text-[#526078]">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Preset</th>
                    <th className="text-right px-4 py-2 font-semibold w-24">Demand</th>
                    <th className="text-right px-4 py-2 font-semibold w-32">Operator & Venue Supply</th>
                    <th className="text-left px-4 py-2 font-semibold">Meaning</th>
                  </tr>
                </thead>
                <tbody className="text-[#1a2540]">
                  {PRESETS.map((p) => (
                    <tr key={p.name} className="border-t border-[#eef2f7]">
                      <td className="px-4 py-2 font-semibold text-[#07142f]">{p.name}</td>
                      <td className="px-4 py-2 text-right font-mono">{p.demand}</td>
                      <td className="px-4 py-2 text-right font-mono">{p.tam}</td>
                      <td className="px-4 py-2">{p.tagline}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[13px] text-[#526078]">
              The three legacy CSI-heavy presets (Blue Ocean, Quick Launch, High Upside) were removed on 2026-07-07 with CSI leaving the composite.
            </p>
          </Section>

          <Section title="6. Sub-Metric Weights drawer">
            <p>Each pillar has a "⚙" button that opens a right-side drawer:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Lists every SOW-registered sub-signal for that pillar with its current weight.</li>
              <li>Weights inside a pillar sum to 100.</li>
              <li>Reset button restores SOW defaults.</li>
              <li>Applying sub-weight changes triggers a full client-side recompute — table row, panel, compare modal, and export all update in place.</li>
            </ul>
          </Section>

          <Section title="7. Filters">
            <ul className="list-disc pl-6 space-y-1">
              {FILTERS.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <p className="text-[13px] text-[#526078]">
              Every filter is state in <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">useCityScoringStore</code> and reflected in the URL where appropriate so the view is shareable.
            </p>
          </Section>

          <Section title="8. Output surfaces (behavior)">
            <div className="rounded-md border border-[#eef2f7] bg-white overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-[#fafbfd] text-[#526078]">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold w-56">Surface</th>
                    <th className="text-left px-4 py-2 font-semibold">Behavior</th>
                  </tr>
                </thead>
                <tbody className="text-[#1a2540] align-top">
                  {SURFACES.map((s) => (
                    <tr key={s.label} className="border-t border-[#eef2f7]">
                      <td className="px-4 py-2 font-semibold text-[#07142f]">{s.label}</td>
                      <td className="px-4 py-2">{s.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="9. Data sources feeding the pillars">
            <div className="rounded-md border border-[#eef2f7] bg-white overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-[#fafbfd] text-[#526078]">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Pillar</th>
                    <th className="text-left px-4 py-2 font-semibold">Primary source</th>
                    <th className="text-left px-4 py-2 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody className="text-[#1a2540]">
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-2 font-semibold text-[#07142f]">Demand</td>
                    <td className="px-4 py-2">US Census ACS (families with kids 5–12, HH income ≥ $150k, growth)</td>
                    <td className="px-4 py-2 text-[12.5px] text-[#526078]">Reused across features</td>
                  </tr>
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-2 font-semibold text-[#07142f]">Operator & Venue Supply</td>
                    <td className="px-4 py-2">US Census ACS + BLS OES (teacher counts by occupation)</td>
                    <td className="px-4 py-2 text-[12.5px] text-[#526078]">The "franchisee supply" number</td>
                  </tr>
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-2 font-semibold text-[#07142f]">Competitive Landscape</td>
                    <td className="px-4 py-2">CSI counts (legacy)</td>
                    <td className="px-4 py-2 text-[12.5px] text-[#526078]">Displayed only — weight 0</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[13px] text-[#526078]">
              Full signal-level details live in <strong>Demographics Method</strong> and <strong>Scoring Method</strong>.
            </p>
          </Section>

          <Section title="10. Locked-in behavior (do not change without approval)">
            <ul className="list-disc pl-6 space-y-1">
              {LOCKED_IN.map((l) => <li key={l}>{l}</li>)}
            </ul>
          </Section>

          <Section title="11. Deferred / out of scope for v1.0">
            <ul className="list-disc pl-6 space-y-1">
              {DEFERRED.map((d) => <li key={d}>{d}</li>)}
            </ul>
          </Section>

        </div>
      </DocCard>
    </DocShell>
  );
}

// Silence unused-import warning if the icon isn't rendered above.
void Map;
