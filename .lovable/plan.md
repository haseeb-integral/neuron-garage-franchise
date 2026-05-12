## Problem

After backfilling 110+ cities with metro/county/market_type, the Ranked Markets list collapsed from ~30 cities to 6. Reason: the dedupe step now picks live rows over sample rows unconditionally, but the new live rows have empty `population` and `composite_score` (only geo fields are filled). The Min Population (25k+) and Min Score (35) filters then drop them, and the sample versions are gone because live replaced them.

## Goal

Keep the full ranked list visible AND show metro/county/market_type for every city — without requiring Refresh Data on each one.

## Fix

One file: `src/lib/cityScoringLiveData.ts`

Change the dedupe logic in `dedupeRankedMarkets()` so:

1. A live row is considered "real" only if it has scoring data — i.e. `compositeScore > 0` OR `lastScrapedAt` is set OR `population > 0`.
2. If live is real → live wins (current behavior, correct).
3. If live is a stub (geo-only) AND a sample exists for the same city → keep the **sample row**, but copy the live row's `metroArea`, `county`, and `marketType` onto it. This way the list still shows the sample's score/population/tier (so it passes filters and renders), and the new geo fields populate the list and detail panel.
4. If only a live stub exists with no sample → still show it (so newly-added cities like Bellevue, Naperville, etc. appear in the list with their geo info, even with score 0). This is fine because users can filter Min Score down to 0 to see them, and clicking Refresh Data populates the rest.

## Expected outcome

- Ranked list returns to its previous size (~30+ cities pass the default filters).
- Every city shows correct Metro Area, County, and Market Type — both in the list row (county subtitle, market-type pill) and the detail panel.
- No DB changes, no edge function changes, no schema changes. Pure frontend dedupe logic.

## Risk

Low. Single function, reversible. No data loss possible — DB rows stay intact.
