## What I found

### Bug 1 — Redwood City drawer mostly shows "—"

`us_cities_scored` has **two rows for Redwood City, CA**:

| `city_name`         | population | children_5_12 | public_elementary_count | public_elementary_enrollment | csi_national_brand_count_weighted | csi_last_updated |
|---------------------|------------|---------------|-------------------------|------------------------------|------------------------------------|------------------|
| Redwood City        | 82,423     | 8,148         | 25                      | 12,491                       | NULL                               | NULL             |
| Redwood City city   | 82,982     | NULL          | NULL                    | 4,840                        | 1                                  | 2026-05-21       |

The drawer titled **"Redwood City city, California"** is loading the second row — Brett's Manus 2026-05-21 CSI upload, which has CSI/DAM populated but is missing the Census + NCES columns. That's why Children 5–12, % Dual-Income, Bachelor's+, Public Elementary Schools, Teachers (FTE), Private+Charter all show "—".

This is the same pattern Brett warned about in `TPD.md` — Manus joined on a slightly different `city_name` and created a duplicate row instead of upserting onto the existing one.

### Bug 2 — New York shows `NaN /100` and `Tier D`

NY's DB row is healthy: `composite_score_default = 53`, `score_demand = 60`, `score_csi = 40`, `score_tam_teachers = 71` → expected composite 53, expected tier C.

What's happening in code:

- `weightedComposite` (CityScoring.tsx ~1392) divides a sum of `categoryScore × masterWeight` by `appliedTotal`. When any `detailCategoryScores[c.key]` is `NaN`, the whole composite becomes `NaN`. `NaN >= 65` is false, so the tier check falls through to `"D"`. That matches the screenshot exactly.
- `NaN ?? 0` does **not** fall back to 0 — `??` only catches null/undefined. So a single NaN slot poisons the composite.
- Two upstream sources can feed a NaN in:
  1. **Stale category-key map**: lines 1318–1322 still use the pre-purge keys `competition_score → competitiveLandscape` and `stem_jobs → franchiseeSupply`. The current DB writes `competitive_landscape` and `tam_teachers` into `liveCategoryScores`, so those two never make it into `liveUiCategoryScores`. NY then falls back to whatever `selectedSample` (sampleCities[0] mock) provides, and for cities not in the mock list we end up combining mismatched shapes.
  2. **`recomputedByCategory`** can return `score = NaN` when `sum` accumulates a NaN contribution (e.g. a custom-criteria weight that became NaN, or a normalized value that went non-finite). The current code writes Math.round(NaN) back into `detailCategoryScores`.

## Fix plan

### A. Frontend (safe, no schema changes)

1. **Patch the stale category-key map** in `src/pages/CityScoring.tsx` (~line 1318):
   - `competition_score` → `competitive_landscape`
   - `stem_jobs` → `tam_teachers`
   - Keep `demand` → `demand`.
   - This is the same retired-key trail we just purged everywhere else; this one was missed.

2. **NaN-proof the composite** in `src/pages/CityScoring.tsx`:
   - In `detailCategoryScores`, only write `Math.round(r.score)` when `Number.isFinite(r.score)`.
   - In `weightedComposite`, replace `(detailCategoryScores[c.key] ?? 0)` with a `Number.isFinite(v) ? v : 0` helper, and skip non-finite categories from both numerator and denominator so the average isn't biased.
   - In `recomputeCategoryScore` (`src/lib/clientSubWeightScoring.ts`), guard the final `score` with `Number.isFinite(sum) ? Math.max(0, Math.min(100, sum)) : null` so a bad input always falls back to the server score instead of poisoning the UI.

3. **Guard the Redwood "missing values look like a UI bug" case** — when the selected city's `scoredRow` has both `csi_last_updated` set AND core Census fields null, surface a small banner in the drawer ("This row was loaded from Brett's 2026-05-21 Manus CSI upload — Census/NCES values are on a separate row and haven't been merged yet"). Cosmetic only; no math changes.

### B. Database (Redwood-style duplicate cleanup — requires Haseeb's "go")

I won't run any migration without explicit approval per Rule 9 / Rule 11. Proposed:

1. Audit: list every city in `us_cities_scored` where two rows differ only by the trailing `" city"` / `" town"` / `" borough"` in `city_name` (likely 50–200 duplicates from the Manus upload).
2. Per pair, merge into the canonical row (the one without the suffix): coalesce the Manus-only CSI columns onto it, keep its Census + NCES values, then delete the suffix row.
3. Add a one-line invariant note in `APIS.md` + `TPD.md`: Manus uploads MUST upsert on `(state_abbr, normalized city_name)`, never insert.

This is the right "snapshot = backend = spreadsheet" fix; the frontend banner in A.3 is the safety net while the data is being cleaned.

## Verification

- Open NY drawer → Overall Score shows 53, Tier C (not NaN/D).
- Open Redwood drawer → either the merged row shows all values, or the banner explains why and a working "Switch to Census row" link is offered (until DB cleanup runs).
- Spreadsheet view, XLSX export, and Compare modal all show the same composite/tier/category values as the drawer for NY and Redwood (Rule: spreadsheet = dashboard = backend).
- `rg "competition_score|stem_jobs"` returns no live references outside comments/migration docs.

## Open question for you

Do you want me to:

- **(A only)** ship the frontend fixes now and leave the DB duplicates alone for this turn, or
- **(A + B)** also draft the SQL migration to merge the duplicate Redwood-style rows? I'll show the audit query first and wait for "go" before any `UPDATE` / `DELETE`.
