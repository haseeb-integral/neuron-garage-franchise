
# City Search Functionality & UI Consistency Pass

Scope is strictly `/city-scoring` UI behavior plus the details drawer. No backend, auth, Supabase, routes, env, secrets, or paid API calls.

## 1. Add Criteria
File: `src/pages/CityScoring.tsx`, `src/components/city-scoring/AddCriteriaDrawer.tsx`

- Drawer already saves into `customCriteria` and shows toast. Confirm category card already shows `+N custom metric` chip (it does).
- Pass `customCriteria` into the new Market Details drawer so they appear nested under their parent category section.
- No new top-level scoring card is created.

## 2. Compare Mode
File: `src/pages/CityScoring.tsx` (+ new `MarketCompareModal.tsx`)

- When `compareMode` is ON: highlight the checkbox column in Ranked Markets (blue ring/background on checkbox cell), and show a hint row "Select 2–4 markets to compare".
- Limit selection to max 4; show toast if user tries a 5th.
- Compare button label shows live count: `Compare (n)`. Disabled when `n < 2`.
- Clicking it opens a `MarketCompareModal` (Dialog) that renders a comparison table for the chosen markets:
  - Columns per market: Overall Score, six category scores (from `categoryScores()` with Frisco override), Tier, plus a couple of Key Market Signals (children %, household income, competitor count derived from `sampleCities`).
- All sample-data; no API calls.

## 3. Scoring Weights
File: `src/pages/CityScoring.tsx`

- Total weight already updates live. Add an inline warning row when `totalWeight !== 100`: small amber text "Weights must total 100% to apply scoring."
- Add an `Apply Weights` button next to "Reset to Default":
  - Disabled when total ≠ 100.
  - On click: toast "Sample scores recalculated." (No external call; we keep mock data unchanged.)

## 4. Non-Registration States filter
File: `src/pages/CityScoring.tsx`

- Already wired into `filtered` via `nonRegOnly`. Add a toast on toggle: "Non-registration state filter applied to available sample data." when none of the sample cities have `isNonRegistration`, fall back to that toast only; otherwise filter quietly.

## 5. Refresh Data
- Replace current toast with: `"Sample data refreshed. Live source refresh will be connected later."`

## 6. Export Source Data
- On click, build a CSV from currently `filtered` Ranked Markets (rank, city, state, tier, composite score, population) and trigger a Blob download. Toast on success. No API.

## 7. Generate Market Report / Generate PDF Report
File: new `src/components/city-scoring/MarketReportModal.tsx`

- Both the header `Generate Market Report` button and the right-column `Generate PDF Report` button open the same modal.
- Title: `"{City}, {ST} Market Research Report Preview"`.
- Sections (sample data): Market Summary, Overall Score, Six Category Scores, Key Market Signals, Nearby Markets, Source Data, Recommendation paragraph.
- Footer: a "Close" button and a non-functional "Download PDF (coming soon)" outline button that shows a toast.

## 8. Rebuild View Full Details drawer
New component: `src/components/city-scoring/MarketDetailDrawer.tsx` (replaces use of legacy `CityDetailDrawer` on this page; the old file stays intact for any other usage).

- Sheet, white background, blue accents. Title: `"{City}, {ST} Market Details"`.
- Sections:
  - Overall Score gauge (blue `#174be8` fill, not orange).
  - Six category score breakdown — blue progress bars.
  - Detailed metrics grouped under each of the six categories (use mapped values from `scoreBreakdown` plus any matching `customCriteria` listed under their chosen category).
  - Competitive landscape evidence (uses `selected.competitors`).
  - Notes textarea (local state, not persisted).
  - Source data list.
  - Buttons (blue primary + outline blues):
    - `Find Teachers in This Market` → reuses existing `navigate('/teacher-prospects?city=...&state=...')` logic.
    - `Generate Report` → opens MarketReportModal.
    - `Export Source Data` → triggers same CSV export.
- All copy says "Market", never "City".

## Technical notes

- Three new files under `src/components/city-scoring/`: `MarketCompareModal.tsx`, `MarketReportModal.tsx`, `MarketDetailDrawer.tsx`.
- `CityScoring.tsx`: wire new state/handlers; swap drawer; share a `buildCsv(rows)` helper.
- No edits to Supabase client/types/config, no route or auth changes.

## Acceptance checklist

- Add Criteria adds custom metric under selected category; visible in details drawer.
- Compare Mode visibly highlights checkboxes, enforces 2–4, opens compare modal.
- Weight sliders show warning + Apply button with proper disabled state.
- Non-Reg filter, Refresh, Export, Report buttons all give MVP feedback or sample output.
- Details drawer is blue/white, says "Market", primary CTA is blue.
- No backend changes.
