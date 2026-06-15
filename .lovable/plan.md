## Swap the 1A demo shortlist to Feature 1's Balanced top 8, anchor on San Antonio

### Final 8 cities (from Feature 1 Balanced ranking)

| Rank | City | Tier | Feature 1 Composite |
|---|---|---|---|
| 1 | New York, NY | A | 93 |
| 2 | Houston, TX | A | 92 |
| 3 | Chicago, IL | A | 91 |
| 4 | Boston, MA | A | 91 |
| 5 | **San Antonio, TX** *(deep-dive anchor)* | A | 91 |
| 6 | Philadelphia, PA | A | 91 |
| 7 | Los Angeles, CA | A | 90 |
| 8 | Indianapolis, IN | B | 88 |

### What changes

1. **`src/data/phase2DemoData.ts`**
   - Rewrite `SHORTLIST_DEMO` (8 rows) — city/state, county sub-label, plausible PCC scores in the 65–82 sample range, verdicts, status badges.
   - Rewrite `friscoMarketValidationDemo` → `sanAntonioMarketValidationDemo` (keep the export name structure; just rename the const and update `city: "San Antonio"`, `state: "TX"`, county "Bexar", and verdict copy). All sub-score values, provider rows, sample weeks, signals stay numerically the same — they're illustrative sample data and only the city label changes. PCC composite stays in the same range (≈78); we'll keep the demo number at 78 unless you say otherwise.
   - `activeCityId` default in `MarketValidation.tsx` flips from `"frisco-tx"` to `"san-antonio-tx"`.

2. **`src/pages/MarketValidation.tsx`**
   - Update the `isFrisco` guard → `isSanAntonio` (controls the "deep-dive shows the anchor city" callout shown when a non-anchor row is selected).
   - Update any "Frisco" string in callouts/labels to "San Antonio".

3. **`.lovable/phase-2/CHANGELOG.md`** — log the swap (date, why: align 1A demo with Feature 1 Balanced top 8; San Antonio anchor because client has Austin franchise).

### What does NOT change

- The 6 sub-scores, weights, formula, provider table, sellout curve, badges, cadence chip, PDF stub, Market Balance bands — all stay. Only the *city the page is anchored on* changes.
- No schema, no backend, no Feature 1 code.

### Open question (will assume default if no response)

- Anchor PCC composite stays at **78 / Strong tier** for San Antonio. Say the word if you want a different demo number.