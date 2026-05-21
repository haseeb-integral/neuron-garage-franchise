## What I found

- `city_market_signals` is already severed from the live UI/scoring code, but the table still exists and still has **9,420 rows**. It is safe to drop after a migration.
- The scary line `TAM Teachers score (server fallback) 93` is coming from **`us_cities_scored.score_tam_teachers`** — not from the legacy table.
- For **Denver**, the TAM metric values do exist in `us_cities_scored`:
  - Public elementary schools = **143**
  - Public elementary teachers = **3659**
  - Private + charter elementary schools = **66**
  - Public elementary enrollment = **56,320**
  - COL / salary field available to UI = **107.33**
- For **Denver**, the center-panel overall score is currently consistent with the visible 3-category UI formula:
  - Demand **70**, TAM **93**, CSI **73**
  - `70×0.4 + 93×0.3 + 73×0.3 = 77.8 → 78`
- But across the seeded city table, the stored overall score is **not reliably aligned** with the current 3-category formula. I checked rows with all 3 category scores present:
  - **766 rows checked**
  - only **63 exact matches** to the current `40/30/30` formula
- There is also a **client/backend scoring mismatch** today:
  - frontend TAM normalization ranges differ from backend TAM normalization ranges
  - that can make the drawer math disagree with stored scores

## Grade-8 truth check

- **Yes** — TAM should come from the TAM metric values stored on `us_cities_scored`.
- **Yes** — overall score should come from the category scores (Demand + TAM + CSI) using the master weights.
- **No** — today I cannot honestly say every stored overall score in `us_cities_scored` matches the current visible 3-category formula.
- **So your concern is valid.** Denver happens to line up, but the system as a whole needs a real alignment fix.

## Plan

### 1) Drop the legacy table
**What changes**
- Create a migration to drop `public.city_market_signals`.

**Why**
- It is legacy, orphaned, and should not exist if it no longer feeds anything.

**Risk**
- Low.

**How to undo**
- Restore from migration history / recreate from backup if ever needed.

### 2) Remove the misleading fallback behavior in the TAM formula drawer
**What changes**
- Fix the formula UI so it computes from the real `us_cities_scored` metric values whenever those values exist.
- Replace the misleading “server fallback” wording with honest states:
  - if weights are zero: say that clearly
  - if a metric value is missing in the city row: show that clearly
  - only show a stored-score fallback when there is truly no calculable path

**Why**
- Right now the drawer can imply “all metrics unavailable” even when the city row does have TAM inputs.

**Risk**
- Low.

**How to undo**
- Revert the UI logic and wording change.

### 3) Make one canonical scoring formula for both backend and frontend
**What changes**
- Align frontend and backend normalization ranges for TAM.
- Ensure the formula drawer and the stored category scores use the same math.
- Keep the agreed structure:
  - category score from metric values
  - overall score from Demand + TAM + CSI master weights

**Why**
- Today the frontend and backend do not use the exact same TAM scaling.

**Risk**
- Medium, because it changes how seeded scores are recomputed.

**How to undo**
- Revert the shared scoring changes and restore the previous ranges.

### 4) Recompute and backfill all stored scores in `us_cities_scored`
**What changes**
- Re-run a canonical backfill so stored `score_demand`, `score_tam_teachers`, `score_csi`, and `composite_score_default` are regenerated from the real city-row inputs using the same formula the UI explains.

**Why**
- This is the real fix for your trust issue. After this, the stored score should match the explained score.

**Risk**
- Medium.

**How to undo**
- Restore previous stored scores from backup / rerun prior seed logic.

## Technical details

- Files likely touched:
  - `src/components/city-scoring/SubMetricWeightsDrawer.tsx`
  - `src/lib/clientSubWeightScoring.ts`
  - `src/lib/sowNormalize.ts`
  - `src/lib/cityScoringLiveData.ts`
  - `supabase/functions/_shared/scoring.ts`
  - `supabase/functions/seed-cities-database/index.ts`
- Database change:
  - drop `public.city_market_signals`
  - then run a score backfill on `public.us_cities_scored`
- I will also keep the name-vs-meaning rule in check while doing this, especially around `col_salary_index` vs raw `cost_of_living_index` fallback behavior.

## Expected result after implementation

- No legacy `city_market_signals` table.
- TAM “Show Formula” always shows real city-row inputs when they exist.
- No fake-looking “server fallback” message for rows that actually have TAM inputs.
- Stored overall score and displayed formula use the same math path.
- We can tell Sam and Brett a simple honest story:
  - “Each category comes from its city metrics.”
  - “Overall score comes from Demand + TAM + CSI weights.”
  - “The number in the table matches the number in Show Formula.”