
# Add "Why this number?" Popovers for Watchlist + ACS Rows

## What you saw
On the Pricing card you can click **40** (% of providers ≥ $500/wk) and a popover lists the 10 providers behind it. Good.

But on these rows there is no popover at all:
- **National operators (validating)** · 2 · Watchlist
- **Direct competitors / 10k kids** · 0.23 · Watchlist + ACS
- **Children 5–12 (US Census ACS)** · 43366 · US Census ACS
- **Coverage ratio (kids / seat)** · 2720.47 · US Census ACS
- **Affluent dual-income families (ACS)** · 40807 · US Census ACS

That is because `proofForInput()` in `LiveCityDeepDive.tsx` only knows how to build a list for price / premium count / categories. The 5 inputs above return `null` so the number stays plain text, not clickable.

## Fix plan (1 small UI phase)

Extend `proofForInput()` to return a row list for each of those 5 keys. All data is already loaded by `useLiveMvs` — no new fetch, no math change.

| Row | What the popover will show |
| --- | --- |
| **National operators (validating)** | Title: "Validating national operators (N)". List every watchlist brand whose name matches a premium provider in this city. Each row: brand name + overlap tag (direct/adjacent). Source: `mvs_operator_watchlist` + provider match. |
| **Direct competitors / 10k kids** | Title: "Direct competitors per 10k kids = X". Two-line explanation: `direct_match_count ÷ (children_5_12 ÷ 10000)`. List the direct-overlap brands matched in this city. |
| **Children 5–12 (US Census ACS)** | Title: "Children 5–12 in {city}". One row showing the ACS number and the source URL (data.census.gov). |
| **Coverage ratio (kids / seat)** | Title: "Coverage ratio = X kids per seat". Shows the formula `affluent_dual_income_families ÷ premium_provider_count` with the live inputs side by side and which band it lands in (Saturated/Competitive/Balanced/Underserved). |
| **Affluent dual-income families (ACS)** | Title: "Affluent dual-income families in {city}". Shows the formula `families_with_kids_5_12 × pct_dual_income × pct_above_150k` with each input value from `site_analysis_acs_cache`. |

## What is NOT changing
- No score math change.
- No new database fetch — all values are already on the page via `useLiveMvs`.
- The 3 existing popovers (price / premium count / categories) stay exactly as they are.
- All other cards untouched.

## Files touched
- `src/components/phase2-demo/LiveCityDeepDive.tsx` — extend `proofForInput()` to handle 5 more keys. Pass `watchlist`, `overrides`, and `acs` into it so it can build the rows.

## Risk
Very low. Pure presentation. If a needed input is `null`, the function returns `null` and the row stays non-clickable (same as today) — no broken popover.

## Smoke test
1. Open Boston deep-dive.
2. Click **2** on "National operators (validating)" → popover lists Steve & Kate's Camp (direct), Code Ninjas (adjacent).
3. Click **0.23** on "Direct competitors / 10k kids" → popover shows the formula and the matched direct brands.
4. Click **43366** on "Children 5–12 (US Census ACS)" → popover shows ACS source + value.
5. Click **2720.47** on "Coverage ratio" → popover shows the kids ÷ seats math and the band.
6. Click **40807** on "Affluent dual-income families" → popover shows the multiplication of the 3 ACS inputs.

Approve and I will implement in one turn.
