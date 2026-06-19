## What's wrong

`score1PricingAcceptance` in `src/lib/mvs/computeMvs.ts` takes `price_max` from each premium provider, medians them, and normalizes against $300–$700 (a weekly band).

But `price_max` in `mvs_providers` is the **top of the listed price range** scraped from Sawyer / Google. For most camp operators that's a multi-week or full-summer bundle ($1,400 – $13,595), not a single week. Result: the displayed `medianPrice` (1862.50) is meaningless as "weekly price," and the Pricing Acceptance score (93.3) is inflated because every provider blows past the $700 ceiling.

## Fix

Change the input from "max listed price" to "estimated per-week price" before percentiles + normalization.

### Approach (pick one in implementation — I'll default to A unless you say otherwise)

**A. Use `price_min` as the weekly proxy.** Sawyer's `price_min` is typically the single-week / single-session price; `price_max` is the bundle. One-line change in `score1PricingAcceptance`: prefer `price_min`, fall back to `price_max` only when min is missing. Fastest, no schema change. Median for NYC drops to roughly the $300–$800 band where the formula was designed to operate.

**B. Compute a per-week price.** Add `weeks_offered` (or parse session length from the source listing) and divide. More accurate but requires extractor work and a column on `mvs_providers`. Slower.

**C. Cap outliers.** Discard any price above e.g. $2,000 before medianing. Quick safety net, but doesn't fix the semantic mismatch.

## Changes (Option A)

1. `src/lib/mvs/computeMvs.ts` — in `score1PricingAcceptance`, swap the mapper:
   ```ts
   .map((p) => (p.price_min != null ? p.price_min : p.price_max))
   ```
   and update the surrounding comment to "weekly price proxy."
2. `src/lib/mvs/computeMvs.test.ts` — flip the "falls back to price_min" test to its opposite ("falls back to price_max when price_min is null") and update the multi-provider fixtures that currently set only `price_max`.
3. Label tweak in the city blow-up card (`LiveCityDeepDive.tsx`) and the brief (`MarketBrief.tsx`, `MvsBriefDocument.tsx`): rename the row `medianPrice` → `Median weekly price (est.)` so the number is self-describing.
4. Same rename in the formula tooltip on `MVSMethodology.tsx` / `MVSSpec.tsx` where the input is referenced.

No DB migration, no recomputation job — scores recompute on read via the shared helper.

## Verification

- Run `bunx vitest run src/lib/mvs/computeMvs.test.ts`.
- Open `/market-validation` → New York → Pricing Acceptance card. Expect `medianPrice` to land in the $400–$900 range and Pricing Acceptance score to drop from 93.3 to a realistic mid-band number.
- Spot-check 2–3 other cities in the rollout table to confirm scores moved in a sensible direction.

## Open question for you

Confirm Option A is fine, or tell me to go with B (true per-week, slower) or C (cap outliers). Default is A.