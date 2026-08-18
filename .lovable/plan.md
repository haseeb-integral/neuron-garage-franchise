# Refresh the methodology and spec docs

Goal: bring the Market Validation, City Search, and Site Analysis documentation back in line with what the app actually does today. Docs only — no engine, scoring, or UI code changes.

## Why

The docs have fallen behind the code:

- Market Validation spec still says **v1.6** and methodology says **v1.6 (updated 2026-07-07)**, but we have shipped through **v1.9** since then.
- City Search methodology still describes the watch list as per-user; it is now a shared team list.
- Site Analysis methodology does not mention the tooltips, "Show formula" drawers, or the updated grade-alignment weights.

## Files touched

| Doc | File |
| --- | --- |
| Market Validation spec | `src/pages/MVSSpec.tsx` |
| Market Validation methodology | `src/pages/MVSMethodology.tsx` |
| City Search spec | `src/pages/CitySearchSpec.tsx` |
| City Search methodology | `src/data/citySearchMethodology.md` |
| Site Analysis methodology | `src/pages/SASMethodology.tsx` |

Each page has both a printable/markdown export block and the on-screen JSX. Both halves get the same edits so the download can never drift from the screen.

## What gets written in

**Market Validation → v1.9**

- Pricing Acceptance formula: share of **all priced providers** at **≥ $500 per week** (replaces the old shortlist-only wording).
- Premium tier two-gate rule: min ≥ $300 **and** max ≥ $400.
- Tier precedence order: community/childcare → price gate → known premium brand → AI guess.
- One brand list: `mvs_operator_watchlist` with `aliases` and `is_premium_brand` as the only source of national-brand and premium-brand truth.
- Market Balance Index is a **zero-weight review flag**, not a scored pillar.
- Market Depth bands: 8–14 Moderate, 15–19 Deep, 20+ Very Deep, plus the Saturated and Unproven badges.
- Pricing crawler: B3 now uses Gemini unit-aware extraction (per-week vs multi-week), so "$840 for two weeks" is no longer read as $840/wk.
- Discovery changes: Google Maps run split to avoid timeouts, tighter Yelp categories, Sawyer limited to the single summer-camps URL, "tuition" banned from all queries.
- Reliability: DB-backed refresh queue, resume-stuck cron, Apify circuit breaker and its rollout card.
- `us_cities_scored` named as the single source of truth for city metrics.

**City Search**

- Watch list is **shared across the whole team**, not per user.
- Confirm the "one calibrated number everywhere" wording still matches `recomputedPillars.ts`.
- Refresh the deferred/out-of-scope list so finished items are not still listed as pending.

**Site Analysis**

- Per-sub-score tooltips and the "Show formula" drawer.
- Updated `school_type` grade-alignment weights from `sas-math.ts`.
- Note that the ACS cache write runs with elevated rights so caching works under the row-level rules.

## Method

For each item above I read the live code first (`computeMvs.ts`, `metricFetchers.ts`, `mvs-discover-providers`, `sas-math.ts`, `recomputedPillars.ts`, watch list table) and only write what the code actually says. Nothing invented.

## Phases

1. **Market Validation spec + methodology → v1.9.** Biggest chunk. ~2 turns.
2. **City Search spec + methodology.** ~1 turn.
3. **Site Analysis methodology.** ~1 turn.

## Risk

Low. These are documentation pages. The only care needed is keeping the markdown export string and the JSX in sync inside each page, and not breaking the download buttons.

## What to test

Open `/mvs-spec`, `/mvs-methodology`, `/city-search-spec`, `/city-search-methodology`, `/sas-methodology`. Check the pages render, the version headers read correctly, and the download button still produces a file.
