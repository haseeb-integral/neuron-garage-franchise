## Goal
Add **Affluent Families with Children** as a 5th Demand sub-metric and rebalance Demand sub-weights to **30 / 30 / 25 / 10 / 5**. Design the change so a single revert commit removes it cleanly.

## Design principles for low risk + easy unwind

1. **Feature-flagged from day one.** New metric is registered behind `FEATURE_AFFLUENT_FAMILIES` (default: on for staff, off for everyone else the first day). Flip the flag → old 4-metric Demand math returns. No code revert needed to disable.
2. **Additive only.** New DB columns, new registry row, new normalizer entries. **No existing column or metric key is renamed, dropped, or repurposed.** Median Income + Dual-Income keep the same keys and data — only their default weights change.
3. **Data is columns, not a new table.** 4 new nullable columns on `us_cities_scored`. Dropping them is a one-line migration.
4. **Backfill is idempotent + separate.** A one-shot edge function `backfill-affluent-families` reads B19131 for each city, writes the 4 columns. Safe to re-run. Not scheduled. When B23007 data-quality is resolved, weights can flip back with one file edit.
5. **Fallbacks preserve today's score.** If the new column is null for a city (fetch failed, city outside coverage), `recomputeCategoryScore` already treats it as unusable and re-normalizes remaining weights → that city sees the OLD math automatically. No broken cards.
6. **Store migration only strips Demand keys we're changing.** Bump `cityScoringStore` version; migrate resets **only** Demand sub-weights to new defaults, leaves Competitive + TAM untouched. Users who customized Demand lose that customization on first load (expected — new defaults are the point).
7. **One narrow test city set.** Backfill 3 named cities first, verify, then run for the full 935. Never a big-bang.

## What will change (plain English)

Today Demand uses 4 sub-metrics. Median Income hides the wealth tail — a "barbell" city (modest median, thick $200k+ layer) looks weaker than it really is. B19131 gives us families-with-kids-under-18 broken out by income bracket, which directly answers *"how many premium-fit customers actually live here?"*

**Number per city:**
1. Pull ACS 5-yr B19131.
2. `effective_threshold = 150,000 × (city RPP / 100)` (RPP already fetched by `fetchBeaRpp` for the TAM pillar; we call the same helper).
3. B19131 is bracketed. Snap the effective threshold to the nearest bracket boundary (…$100k, $125k, $150k, $200k…). Remember which bracket for the tooltip.
4. Compute **count** and **share** of families-with-own-children-under-18 above the snapped bracket.
5. Sub-score = 50/50 blend of `normalize(count)` + `normalize(share)`, produced inside the fetcher and stored as one final `affluent_families_score` column. **The registry treats it as one metric with one sub-weight**, exactly like the others. No change to `recomputeCategoryScore` signatures — this keeps the blast radius small.

Constants live in one file `src/lib/affluentFamilies.ts`:
```
export const AFFLUENCE_THRESHOLD_BASE = 150000; // PLACEHOLDER — pending enrollee income calibration
export const B19131_BRACKET_BOUNDARIES = [10000, 15000, ..., 150000, 200000];
```

## Affected surfaces (small + boxed)

| Surface | Change | Unwind |
|---|---|---|
| `us_cities_scored` (DB) | +4 nullable columns: `affluent_families_count`, `affluent_families_share`, `affluent_families_snapped_bracket`, `affluent_families_effective_threshold` | Drop 4 columns |
| `supabase/functions/_shared/metricFetchers.ts` | +`fetchB19131AffluentFamilies()` | Delete function |
| `supabase/functions/backfill-affluent-families/index.ts` (new) | One-shot backfill | Delete folder |
| `src/lib/affluentFamilies.ts` (new) | Constants + snap helper | Delete file |
| `src/lib/sowMetricRegistry.ts` | +1 registry row, weights `0.30/0.30/0.25/0.10/0.05` | Revert single hunk |
| `src/lib/sowNormalize.ts` | +1 range entry for `affluent_families_score` | Revert single hunk |
| `src/lib/featureFlags.ts` | +`FEATURE_AFFLUENT_FAMILIES` | Revert single hunk |
| `src/stores/cityScoringStore.ts` | Version bump + migrate() branch | Revert single hunk (old localStorage keeps working) |
| Metric-row tooltip component | +tooltip when `snapped_bracket` present | Revert single hunk |

**Not touched:** master category weights (still 40/30/30), CSI, TAM, Competitive metrics, Composite formula, Compare modal, Export, MVS pipeline, briefs, Site Analysis.

## Phases and turns

**Phase 1 — DB + fetcher scaffolding, flag OFF (1 turn)**
Migration (4 cols + GRANTs), `fetchB19131AffluentFamilies` helper, feature flag stub. No UI change. Ship dark.

**Phase 2 — Backfill 3 test cities (1 turn)**
Run backfill for 3 named cities you pick (or I suggest: Plano TX = high-income, Pittsburgh PA = wealth-barbell candidate, Fresno CA = low-income). Show the raw B19131 numbers + snapped bracket + effective threshold in chat. You approve before we backfill 935.

**Phase 3 — Full backfill + registry wiring + flag ON for staff (1 turn)**
Run backfill for all cities. Add registry row, rebalance weights with comments explaining Median demotion + Dual-Income demotion-pending-B23007. Store version bump. Enable flag for staff.

**Phase 4 — Before/after proof + tooltip (1 turn)**
Query the 3 cities, print Demand pillar **before** (flag off) vs **after** (flag on) in chat. Confirm the barbell city climbs relative to the high-income city. Ship the snapped-bracket tooltip on the metric row.

Total: **4 turns**.

## Risks + guardrails

- **B19131 fetch failure for a city** → column stays null → recompute falls back to 4-metric Demand for that city → no visible break.
- **RPP missing for a state** → threshold falls back to unadjusted $150k → note "RPP unavailable, unadjusted" in tooltip.
- **Wealth-barbell city fails to climb** → we caught the model wrong before shipping; either the 50/50 blend or the snap rule needs tweaking. Phase 4 is the gate.
- **User customization lost on migration** → only affects Demand sub-weights, only on first load after the store version bump. Acceptable per the pre-release policy.

## Full rollback (worst case)
1. Flip `FEATURE_AFFLUENT_FAMILIES` to false → app returns to 4-metric Demand instantly.
2. If you want the code gone: revert the small set of hunks above + drop 4 columns. No downstream feature depends on this data.

**Waiting for your approval before Phase 1.**
