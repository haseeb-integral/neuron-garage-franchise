## Phase 5, Turn 5.1 — Wire shortlist to live data when `mvs_data_source='live'`

Phases 0–4 done. Phase 5 not started. This is Turn 5.1 of 5.

### What changes

1. **Add Austin as a 9th row in `SHORTLIST_DEMO`** (`src/data/phase2DemoData.ts`). City = "Austin", state = "TX". Sub-score / composite fields = placeholders (will be ignored on the live path; only used as fallback if the flag flips back to sample).

2. **Flip Austin's data-source flag.** Single SQL: `UPDATE mvs_city_flags SET mvs_data_source='live' WHERE city='Austin'`. (Insert the row if it doesn't exist yet.)

3. **`ShortlistTable.tsx` (and the city detail panel + sub-score cards + Show Formula drawers + premium-provider table on `MarketValidation.tsx`)** — read `mvs_city_flags.mvs_data_source` for the active city.
   - If `'live'` → fetch `mvs_providers` + `mvs_weeks` + ACS (same query path as `MVSPreview.tsx`), run `computeMvs` (shared helper), render row cells and detail panel from the result. Show "Live" badge (+ "Low Confidence" if `mvs_city_flags.low_confidence_badge=true`).
   - If `'sample'` (default, all other 8 cities) → existing demo path completely untouched. "Sample Data" badge unchanged.

4. **Single recompute helper.** Extract the data-loading + `computeMvs` call currently inside `MVSPreview.tsx` into `src/lib/mvs/useLiveMvs.ts` so the preview page and the shortlist table both go through the same hook. Brett's "one calibrated number everywhere" rule.

5. **Slider drag re-compute** — when a sub-score weight slider is dragged on Austin's detail panel, recompute the live composite via the same helper (in-memory weight override; no DB write).

### What does NOT change

- The 8 demo cities and the entire sample-data path.
- The Austin `/mvs-preview` route (stays as-is, now sharing the hook).
- `mvs_providers`, `mvs_weeks`, `computeMvs.ts`, the 31 unit tests, any edge function.
- Sub-score weights (still static for v1 per SOW Item 1; slider is preview-only).

### Files touched

- `src/data/phase2DemoData.ts` — append Austin row to `SHORTLIST_DEMO`.
- `src/lib/mvs/useLiveMvs.ts` — **new**. Hook returning `{ mvs, scores, inputs, providers, weeks, loading, error, dataSource, lowConfidence }` for a given city.
- `src/pages/MVSPreview.tsx` — refactor to use `useLiveMvs("Austin, TX")`. No visible change.
- `src/components/phase2-demo/ShortlistTable.tsx` — read `mvs_city_flags` for visible cities, swap row cells to live values when `dataSource='live'`.
- `src/pages/MarketValidation.tsx` — when active city has `dataSource='live'`, render the detail panel / sub-score cards / premium-provider table from the live hook; otherwise render the existing `sanAntonioMarketValidationDemo` path. Replace "Sample Data" badge with "Live" + optional "Low Confidence" pill.
- One `supabase--insert` SQL: upsert Austin row in `mvs_city_flags` with `mvs_data_source='live'`.

### Gate (per Build Plan)

- Austin row in the shortlist shows live MVS (~42.0 with current thin data — known).
- Other 7 cities still show their demo composites unchanged.
- Slider drag on Austin recomputes its composite via the shared helper; values stay identical between shortlist row, detail panel hero, and `/mvs-preview`.

### Unwind

Single SQL: `UPDATE mvs_city_flags SET mvs_data_source='sample' WHERE city='Austin'`. All UI falls back to demo path with no code change.

### Out of scope (later turns)

- Turn 5.2: admin "Run Pipeline" button + `mvs_pipeline_runs` status surface.
- Phase 6: PDF Market Brief edge function + download button.
- Phase 7: run pipeline for 7 Tier A cities + calibration check.
