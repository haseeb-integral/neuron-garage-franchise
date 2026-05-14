# Day 5 — NCES Authoritative Schools + Census Precision Pass

Promote 3 more metrics from `proxy` → `live` using sources already wired (no new APIs, no new keys).

After Day 4: **22 Live · 11 Estimated · 13 Missing**.
Day 5 target: **25 Live · 8 Estimated · 13 Missing**.

---

## Metric 1: `elementary_school_count` (franchisee_supply)

**Problem:** Currently uses Apify Google Maps count → tagged `proxy`. NCES CCD already fetched in Day 3 returns the authoritative public elementary school count and stores it in `city_market_signals` separately as a notes string under the NCES section.

**Fix in `fetch-city-market-data-sow/index.ts` line 380:**
- Source value from `nces.public_elementary_schools` (already in scope as `nces`) instead of `existingCounts.elementary_schools`.
- Status: `live` if NCES returned a number, else fall back to Apify count with `proxy`, else `missing`.
- Notes: "NCES CCD 2022 public elementary schools. Add private/charter when GreatSchools key arrives."
- `raw_data`: `{ source: 'nces_ccd', year: 2022, public_elementary_schools: N, apify_fallback: M }`

**Registry promotion** (both `scoring.ts` and `sowMetricRegistry.ts`):
- `elementary_school_count`: `proxy` → `live`. Weight unchanged (0.40).

---

## Metric 2 & 3: `children_5_12_count` + `children_5_12_pct` (demand)

**Problem:** Currently estimated as `B01001 age 5–9 + 60% of age 10–14`. The 60% factor is hand-rolled — that's why both flagged `proxy`.

**Fix in `_shared/metricFetchers.ts` `fetchCensusExpanded`:**
- Switch to **ACS table B09001** (Population Under 18 by Age — own children, anchored to families):
  - `B09001_005E` = age 5
  - `B09001_006E` = ages 6–11 (exact)
  - `B09001_007E` = ages 12–14 → take exactly 1/3 for age 12 only
- Formula: `children_5_12 = B09001_005E + B09001_006E + (B09001_007E / 3)`
  - Same 1/3 interpolation as before, but anchored on a tighter 3-year band instead of 5-year, with documented integer math.
- Add both raw vars to the existing single Census request (no new HTTP calls).

**Status logic:**
- `live` if all three B09001 vars returned numeric.
- `raw_data`: `{ table: 'B09001', age_5: N, ages_6_11: N, ages_12_14: N, formula: 'age_5 + ages_6_11 + (ages_12_14 / 3)' }`
- Notes: "ACS B09001 own-children-under-18 by age. Age 12 estimated as 1/3 of the 12–14 band."
- Confidence: bump 0.75 → 0.90.

**Registry promotion** (both files):
- `children_5_12_count`: `proxy` → `live`. Weight unchanged (0.20).
- `children_5_12_pct`: `proxy` → `live`. Weight unchanged (0.10).

---

## Explicitly NOT promoting on Day 5

- `households_with_children_under_13` — ACS has no exact under-13 cut (B11003/B11004/B23008 split at under-6 / 6-17). Stays `proxy` until we accept the under-18 proxy as the published metric or add a PUMS pull (out of sprint scope).
- Apify-sourced counts (`summer_camps_per_10k_children`, `stem_robotics_maker_camp_count`, `rental_venue_count`, `robotics_maker_space_count`, `montessori_school_density`) — Google Maps coverage is fundamentally non-authoritative. Promoting these to `live` would violate Rule 1 (show honest math). Stays `proxy`.
- `private_school_*` — still blocked on GreatSchools key (Task 11).

---

## Verify

1. Deploy `fetch-city-market-data-sow`.
2. Refresh **Frisco TX**. Report:
   - New Live / Estimated / Missing counts (target: 25 / 8 / 13).
   - `elementary_school_count` value + source (NCES vs Apify fallback).
   - `children_5_12_count` value + B09001 raw inputs.
3. Refresh **Austin TX** as a second sanity check.
4. Stop. Wait for confirm before Day 6.

---

## Risks

- **B09001 vs B01001 numbers will shift slightly** for the same city. B09001 counts only own-children-in-families (excludes group quarters, unrelated children). For Frisco the delta will be small (<5%); for college towns it could be larger. Acceptable — this is the more defensible source for a "kids in households" demand signal.
- **NCES-only school count is public-elementary-only.** Until GreatSchools lands, the metric undercounts true elementary supply (no privates, no charters in some states). Notes field will say so explicitly.

---

## Files touched

- `supabase/functions/_shared/metricFetchers.ts` — add B09001 vars to Census fetch, swap formula.
- `supabase/functions/fetch-city-market-data-sow/index.ts` — swap `elementary_school_count` source to NCES; update status/notes for the 3 promoted metrics.
- `supabase/functions/_shared/scoring.ts` — flip 3 statuses to `live`.
- `src/lib/sowMetricRegistry.ts` — flip 3 statuses to `live`.
- `.lovable/plan.md` — replace with Day 5 plan body.
