## Goal
Three UI cleanups on `/city-scoring`. No backend, no scoring math, no DB column changes. CSI wiring, formula, and `csi_score` usage stay untouched — only the user-facing label changes.

---

## 1. Rename "Competitive Saturation Index (CSI)" → "Competitive Landscape" (UI only)

Change the visible label in every place a user sees it. Internal code names (`competitiveLandscape` key, `csi_*` columns, `csi_score`, helper comments, file headers) **stay as-is** — pure display string change.

Files / lines touched:
- `src/pages/CityScoring.tsx` line 138 — `CATEGORIES[].label` for `competitiveLandscape` → `"Competitive Landscape"`.
- `src/components/city-scoring/SubMetricWeightsDrawer.tsx` — the locked CSI panel header text only:
  - L1008 `"CSI (saturation)…"` → `"Competitive Landscape (saturation)…"`
  - L1022 `"(100 − CSI)"` → leave as-is (it's the math identity); change surrounding sentence to read "Competitive Landscape opportunity" instead of "CSI opportunity".
  - L463 user-facing caption: rephrase to "Locked — pulled from Manus v2 table. Competitive Landscape is computed by Manus and used as-is."
- `src/components/city-scoring/MarketCompareModal.tsx` — if it prints the category label, it already reads from `CATEGORIES`, so the rename above propagates automatically. Quick verify, no extra edit expected.
- `src/lib/cityScoringLiveData.ts` — no user-visible label to change (only internal `// CSI` comments — leave).

**No rename of:** registry `category: "competitive_landscape"`, store key `competitiveLandscape`, any `csi_*` column, any function or file name. Per AGENTS.md Name-vs-Meaning rule, the *meaning* hasn't changed — only the user-facing label — so internal names stay.

---

## 2. Right column: remove "Nearby Markets", move "Key Market Signals" into its slot

In `src/pages/CityScoring.tsx`:
- Delete the `<NearbyMarketsPanel …/>` block (~L2569–2579) from the right column.
- Move the entire "Key Market Signals" subtree (L2485–2532, the `<div className="min-w-0 border-l border-[#eef2f7] pl-4">`) out of the two-column `grid grid-cols-[1fr_1.08fr]` (L2458) into the right column where Nearby Markets used to live.
- Collapse the now-single-column block (Category Scores) back to a normal full-width section instead of a 2-col grid.
- Leave `NearbyMarketsPanel.tsx` file in place but unused (no deletion needed this turn — safer to keep). Mark with a one-line `// Unused 2026-05-21 — kept for history` comment at top.

---

## 3. Rebuild the "Key Market Signals" list + its drawer to the 3-category / 12-metric subset

The 12 metrics that may appear (everything else is hidden — including the old 46-metric pile):

```text
Demand (4)
  children_5_12_count                — Source: U.S. Census ACS 5-yr
  median_household_income            — Source: U.S. Census ACS 5-yr
  dual_income_household_pct          — Source: U.S. Census ACS 5-yr
  education_bachelors_plus_pct       — Source: U.S. Census ACS 5-yr

TAM Teachers (5)
  public_elementary_school_count     — Source: NCES CCD
  public_elementary_teacher_count    — Source: NCES CCD (teachers_fte)
  private_charter_school_count       — Source: NCES PSS + CCD
  public_elementary_enrollment       — Source: NCES CCD
  col_salary_index                   — Source: BLS OEWS × BEA RPP

Competitive Landscape (3)
  csi_national_brand_supply          — Source: Manus v2 brand scrape
  csi_local_camp_estimate            — Source: Manus v2 estimate
  csi_demand_adjusted_market         — Source: derived (enrollment × income ratio)
```

### 3a. Right-column "Key Market Signals" panel (in `CityScoring.tsx`)
- Replace the `centerLiveSignals` / `SIGNAL_DISPLAY_PRIORITY` / `CENTER_SIGNAL_EXCLUDE` logic (L1440–1497) with a simple filter: include only the 12 `signal_key`s above, in the order shown. Each row renders:
  - Bold metric label (from registry — already correct).
  - Value (from `selectedLiveCity` row's `signalsForDisplay`).
  - Tiny gray subtitle = source string (pulled directly from `SOW_METRIC_REGISTRY[].source`).
- Compact row height (`py-1`, `text-[10.5px]`). No icons-as-status, no chips, no "Tracked / not used".
- Keep the existing "View all signals →" button (it opens the drawer).
- If the value is missing for a given city, show `—`.

### 3b. Drawer (`MarketDetailDrawer.tsx`) opened from "View all signals"
- **Header (L635–678):** strip out all coverage chips and the "Chips total…" footnote. Replace with a clean 3-line block:
  ```
  City: <city, ST>
  Last seeded: <date>
  Pre-seeded values: <N> of 12
  ```
  where `N` = count of the 12 metrics that currently have a non-null value for this city.
- **Body:** in the "Data Sources" tab (L781), filter `SOW_CATEGORIES` to the 3 visible categories only (`demand`, `franchisee_supply`, `competitive_landscape`), and within each, render only the metrics from the 12-list above. Hide the "Tracked, not used in score" sub-section (L887–897). Hide the "Fetcher diagnostics" collapsible (L903–924).
- **Row density:** tighten `renderRegistryRow` padding from `py-1.5` to `py-1`, label to `text-[11.5px]`, description to `text-[10px]`. Drop any "Tracked / Not used in score / Tracked-no-value / Source unavailable" badges from the row template.
- Remove the "Seed Coverage" section (the grid of counts at L686–732) — it was the old 46-metric audit, no longer relevant.
- Default the drawer to the "Data Sources" tab (already does); the "Overview" tab can be dropped entirely since its only content was the retired Seed Coverage + Competitors list. → Remove `<Tabs>` wrapper and render the simplified metric list directly. (Competitors section is unrelated to Key Market Signals — drop it from this drawer to keep the UI "simple plain UI" as requested.)

---

## What stays untouched (guardrails)

- All scoring math, normalization ranges, composite formula, `csi_score` ingestion.
- Database, RLS, edge functions, registry `category` strings, store keys.
- The 3 left-side weight widgets (Demand / TAM Teachers / Competitive Landscape).
- `recomputeCategoryScore` fallback behavior, `sowNormalize.ts`, `cityScoringStore.ts`.
- `SubMetricWeightsDrawer.tsx` locked-panel logic (only the visible text changes).

## Files edited
1. `src/pages/CityScoring.tsx` — label rename, right-column restructure, signal-list filter rewrite.
2. `src/components/city-scoring/SubMetricWeightsDrawer.tsx` — 3 label strings.
3. `src/components/city-scoring/MarketDetailDrawer.tsx` — simplified header, removed coverage chips/tabs/competitors, 3-category filter, denser rows.
4. `src/components/city-scoring/NearbyMarketsPanel.tsx` — one-line "unused" comment, no functional change.

## Risk & undo
Low risk — pure presentation. Undo by reverting the four files above. No store version bump needed (no persisted shape changes).

## Doc-sync (Mode A — drafted only, awaits "go")
After implementing, I'll draft one-line summaries for `PROJECT_CONTEXT.md` (label rename + right-col reshuffle), `HOW_IT_WORKS.md` (Key Market Signals now mirrors the 12 scoring inputs), and `GLOSSARY.md` (add "Competitive Landscape = user-facing name for CSI / csi_score"). No file writes until you say go.
