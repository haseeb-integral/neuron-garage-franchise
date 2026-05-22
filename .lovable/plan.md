## What changes
Rename the user-facing ranking category **Competitive Landscape → Competitive Opportunity** so all three master sliders mean the same thing (right = more of a good thing). Raw **CSI** and **Saturation** language stays everywhere it describes the underlying input (methodology, raw spreadsheet columns, raw-CSI detail panel).

No math changes. Labels and tooltips only. DB columns (`score_csi`, `csi_*`) untouched.

## Files to edit

**Rename to "Competitive Opportunity":**
1. `src/pages/CityScoring.tsx` — master slider label + description (line 139–140); ranking table column header `CSI` → `Opp` with new tooltip (line 2332); category cell tooltip (line 2415).
2. `src/lib/scoringPresets.ts` — three preset description strings.
3. `src/components/city-scoring/AddCriteriaDrawer.tsx` — dropdown option (line 13).
4. `src/hooks/useCustomCriteria.ts` — add `"Competitive Opportunity"` key; keep legacy `"Competitive Landscape"` key for backward-compat on existing rows (line 23–28).
5. `src/components/city-scoring/MarketCompareModal.tsx` — column label (line 11).
6. `src/components/city-scoring/MarketReportModal.tsx` — category label (line 84).
7. `src/components/city-scoring/MarketDetailDrawer.tsx` — section label (line 84).
8. `src/components/city-scoring/SubMetricWeightsDrawer.tsx` — section header at line 565, locked-panel sentence at line 463, formula footnote at line 594, table footer label at line 633. The raw CSI panel header at line 1110 stays as **"Competitive Opportunity · Raw CSI (Saturation)"** so users see both names side by side.

**Keep "CSI / Saturation" (these describe the raw input, not the ranking weight):**
- `src/pages/Methodology.tsx` — entire CSI methodology page unchanged.
- `src/components/city-scoring/CitySpreadsheetView.tsx` — spreadsheet column group stays "Competitive Landscape" (raw Manus inputs) for now; can revisit if you want.
- `src/components/city-scoring/CityDetailDrawer.tsx` line 66 — section lists actual competitor names, descriptive not a score; leave as-is.
- DB columns `score_csi`, `csi_*` — untouched.

## The bridge sentence (used everywhere it matters)
**"Competitive Opportunity = 100 − CSI. Low CSI / low saturation = high opportunity."**

This appears in:
- master slider tooltip on `/city-scoring`
- sub-metric drawer header for the category
- ranking table column tooltip (`Opp`)
- methodology page (as the link between the two names)

## Risk
**Low.** Copy and labeling only. No formula changes. No DB changes. No scoring logic touched.

## Undo
Revert the label strings. Everything else (math, DB, registry keys) is unchanged.

## Doc sync (after implementation, draft only — wait for "go")
- `GLOSSARY.md` — add entry: **Competitive Opportunity** = ranking-side name for `100 − CSI`; **CSI** stays as raw saturation input.
- `HOW_IT_WORKS.md` § City Search — one-line note about the rename + bridge formula.
- `PROJECT_CONTEXT.md` — short bullet under May 22 changes.