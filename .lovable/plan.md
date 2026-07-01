## The bug (short version)

Johns Creek has **7 providers charging $400–$950/week** that are still tagged "mid" in the database. Only 2 rows are tagged "premium", so the "Premium providers — live" card shows just 2.

Camps stuck as "mid" even though price ≥ $400:

| Name | price_min | tier (wrong) |
|---|---|---|
| E-PLEX GA | $950 | mid |
| The Art Center | $845 | mid |
| Goldfish Swim School | $840 | mid |
| Catch Air | $699 | mid |
| KidStrong Johns Creek | $599 | mid |
| Hawaii Fluid Art | $450 | mid |
| Eye Level Johns Creek | $430 | mid |

## Why it happens

The pipeline runs steps in this order:

```text
discover  →  classify (tags tier)  →  acs  →  catch-up (fills missing prices)
```

The **classify** step runs BEFORE **catch-up**.

1. First pass: a provider has no price yet, so the classifier falls back to "mid" (rule 6 — unknown price defaults to mid).
2. Catch-up then finds a $500/wk price and writes it into `price_min`.
3. Nothing re-runs the classifier after that. The `tier` field stays "mid" forever.

The standalone **"Catch-Up Missing Prices"** button on the deep-dive page has the same gap — it fills prices but never re-classifies.

So this is a real logic bug, not a display bug. The premium card is reading the DB correctly; the DB is stale.

## Fix plan (2 small phases)

### Phase 1 — Backfill Johns Creek and every other done city (data-only, 1 turn)

Run a one-time SQL migration that re-derives `tier` from the current `price_min` / `price_max` / brand rules for every row where the price contradicts the tier. Uses the same thresholds the classifier already uses:

- `price ≥ $400` → `premium`
- `price < $200` → `budget`
- national premium brand regex → `premium`
- community brand regex → `community`
- everything else with a real price 200–400 → `mid`

Community and childcare-excluded rows are left alone. This immediately fixes Johns Creek's card (2 → ~9 premium) and every other city that ran catch-up.

### Phase 2 — Stop the bug from coming back (code, 1 turn)

Two small code changes in `supabase/functions/mvs-run-pipeline/index.ts`:

1. After the catch-up step finishes, invoke `mvs-classify-tier` a second time with `reclassify: true` so any newly-priced rows get re-tiered.
2. Same fix for the standalone "Catch-Up Missing Prices" flow: after it completes, call the classifier for that city.

No UI changes. No schema changes. No score-formula changes.

## Files touched

- Phase 1: new SQL migration only.
- Phase 2: `supabase/functions/mvs-run-pipeline/index.ts` and the client handler that fires the catch-up button (likely in `MarketValidationRollout.tsx` or its shared helper) — one extra edge-function call after catch-up finishes.

## Risk

- Very low. We are only re-deriving `tier` from data that already exists in the same table using the same thresholds the classifier already uses.
- Score impact: Johns Creek and other catch-up cities will see their **Pricing Acceptance** and **Market Depth** sub-scores jump because more rows now count as premium. That is the correct behavior — we were undercounting before.

## What to test after

1. Johns Creek Provider Evidence page — premium card should show ~9 providers, not 2.
2. MVS score for Johns Creek should recompute higher.
3. Force Fresh a small city → confirm catch-up-filled rows now show correct tiers automatically.

Approve and I will do Phase 1 first, then Phase 2.
