
# Plan — CSI refactor (Prompt 1 + Prompt 2)

## Yes, I understand the goal

Today the CSI (Competitive Saturation Index) mixes three things:

1. Counted national brand camps (real data).
2. A **guessed** local provider count = `elementary_enrollment × 0.003`.
3. A **demand denominator** = `elementary_enrollment × (median_income / 65,000)`.

Because #2 and #3 both use elementary enrollment, city size mostly cancels itself out, and the guessed local count (about 72% of the "supply") drowns the real counted competitors. Income and city size also get counted twice, because the **Demand pillar** already measures them.

**Goal:** CSI must measure **only real counted competition**. Demand stays in the Demand pillar. Then tiers must come from the **real distribution** of the new numbers, not the old hardcoded cutoffs, and must be **relative to Demand** so a big-demand city isn't punished for having more camps.

I want your approval before I touch code. Below is what I will do, in safe phases.

---

## What the new formula looks like (plain English)

- **New raw CSI supply** = `(stem brand locations × 2.0) + (general brand locations × 1.0)`
  - STEM/coding brands weighted heavier because they compete more directly with Neuron Garage.
- **Competitive Opportunity** (the 0–100 pillar the UI shows, higher = better) still comes from the same `competitiveOpportunityFromCsi()` helper — I just update its internals so it works on the new raw-supply scale instead of the old 0–100 saturation scale.
- **Demand denominator is deleted.** Demand lives only in the Demand pillar.
- **Local provider estimate is deleted.** No replacement, no user-entered field.
- **Old stored CSI values become invalid.** A one-shot script recomputes every city from stored brand counts.
- **Old tier thresholds (0.0010 / 0.0020 / 0.0035 / 0.0050) are muted.** All tier labels show **"Pending recalibration"** until Prompt 2 lands.

Then Prompt 2 replaces "Pending recalibration" with real percentile tiers.

---

## Files and areas that will be touched

Frontend / shared math:
- `src/lib/marketView.ts` — update `competitiveOpportunityFromCsi()` internals + add named weight constants (`CSI_STEM_WEIGHT = 2.0`, `CSI_GENERAL_WEIGHT = 1.0`).
- `src/lib/sowMetricRegistry.ts` — remove the `csi_local_camp_estimate` metric entry and its "× 0.003" description; remove `csi_demand_adjusted_market` from the CSI pillar.
- `src/lib/sowNormalize.ts` — drop the `csi_local_camp_estimate` and `csi_demand_adjusted_market` normalize entries.
- `src/lib/cityScoringLiveData.ts` — stop reading `csi_local_provider_estimate` / `csi_demand_adjusted_market` into the pillar; feed the new `csi_raw_supply` value through the helper.
- Anywhere the "Saturation tier" label is rendered (city table, popover, drawer, compare modal, exports) — swap the label to **"Pending recalibration"** during Phase 1, then swap to the real percentile tier in Phase 3.

Database:
- New column `us_cities_scored.csi_raw_supply` (numeric) — the new raw supply number.
- New column `us_cities_scored.csi_tier_relative` (text) — Open / Competitive / Saturated (filled in Phase 3).
- New table `csi_tier_thresholds` (single-row config) storing the 60th and 85th percentile cutoffs computed from the live distribution, plus `computed_at`.
- Existing `csi_local_provider_estimate` and `csi_demand_adjusted_market` columns: **kept in the DB** (do not drop yet) but no longer read anywhere. Safer for rollback. Marked with a `COMMENT ON COLUMN … 'DEPRECATED …'`.
- Recompute script: updates `csi_raw_supply` and `score_csi` for every city from `stem_brand_locations` and `general_brand_locations` (the columns already present in the brand-detail JSON — I will confirm the exact column path when I read `csi_brand_detail` in Phase 0).

No changes to:
- The Demand pillar or the TAM Teachers pillar.
- The composite/tier math in `src/lib/marketView.ts` calibration curve.
- The Manus import feature or the `mvs_manus_cities` table (that's a separate wire-up you'll decide on later).

---

## Risks and things NOT to touch

- Composite score for every city **will change** once CSI is recomputed. That is the point, but every table, popover, compare modal, export, and saved-search snapshot will show new numbers. I will not touch the calibration curve — only the CSI input.
- I will **not** drop the old CSI columns yet. Rollback = revert code, data still there.
- I will **not** touch `mvs_manus_cities` or Market Validation UI.
- I will **not** touch Demand pillar weights or the composite weights.
- Old saturation-tier text must be muted **everywhere** in Phase 1, or users will see stale "Saturated" labels next to new CSI numbers.

---

## Phased build (one phase per approval)

### Phase 0 — Read-only audit (0 turns, no code)
I'll run three read-only queries to confirm:
1. The exact JSON path inside `csi_brand_detail` where STEM vs. general brand counts live (so the recompute script uses real columns, not guesses).
2. How many cities currently have brand counts vs. how many are null.
3. Current min/max/median of `score_csi` — the "before" snapshot for the 3-city verification.

Output: a short table pasted into chat. **You approve before Phase 1.**

### Phase 1 — Prompt 1: new formula + recompute (est. 2 turns)
- Add `CSI_STEM_WEIGHT` and `CSI_GENERAL_WEIGHT` constants.
- Update `competitiveOpportunityFromCsi()` to work on the new raw-supply scale (with the "why" comment you asked for).
- Remove local-estimate + demand-denominator from the sowMetricRegistry, sowNormalize, and live-data loader.
- Migration: add `csi_raw_supply` column, add deprecation comments on old CSI columns, add `csi_tier_thresholds` config table (empty).
- Recompute script (edge function `recompute-csi`): for every city, read brand counts → write new `csi_raw_supply` and new `score_csi`.
- Every "Saturation tier" label in the UI shows **"Pending recalibration"**.
- **Verification I will show you:** before/after CSI + Competitive Opportunity for 3 sample cities (a high-supply metro, a mid-market, a small city). You confirm before Phase 2.

### Phase 2 — Smoke test (0 code turns)
- I run the app, screenshot the City Search table for a well-known city, the popover, and the compare modal. Confirm numbers are consistent and the muted tier label shows everywhere.
- You tell me pass/fail before Phase 3.

### Phase 3 — Prompt 2: percentile tiers relative to Demand (est. 2 turns)
- Add `computeCsiTiers()` helper: for each city with live data, compute `ratio = csi_raw_supply / demand_pillar_score` (guard divide-by-zero → treat as 0). Compute 60th and 85th percentiles of that ratio across all such cities. Store the two cutoffs in `csi_tier_thresholds`.
- Assign each city a tier from those cutoffs: bottom 60% = **Open**, 60–85 = **Competitive**, top 15% = **Saturated**. Write to `us_cities_scored.csi_tier_relative`.
- Trigger recompute whenever `stem_brand_locations`, `general_brand_locations`, or a city row is inserted/updated (postgres trigger + on-demand button in the DB Health page for manual re-runs).
- Replace **"Pending recalibration"** everywhere with the real tier label + the raw CSI number next to it.
- **Verification I will show you:** distribution table (how many cities in Open / Competitive / Saturated) and the two computed cutoffs. Confirm they look sensible before I call it done.

### Phase 4 — Final smoke test + short write-up (0 code turns)
- Screenshots of the same 3 cities with new tier labels.
- One-paragraph plain-English summary of what changed for you to paste to Sam.

---

## What I need from you now

**Approve or push back on this plan.** Specifically:
1. OK to keep old CSI columns in the DB (not drop) for safe rollback? (Recommended.)
2. OK to build Phase 0 → 1 → 2 → 3 → 4 in order, stopping for your OK between each?
3. Are the 3 sample cities I pick fine, or do you want to name them (e.g., Nashville, Austin, and a small city you care about)?

I will not touch code until you say go.
