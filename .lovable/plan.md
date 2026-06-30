## What's happening

You are on the **Provider Evidence Review** page (`/market-validation/.../evidence`). It still shows `295 of 295 providers` for Boston.

The Strict Camp View filter we built last turn only lives inside the **City Deep Dive** card (`LiveCityDeepDive.tsx`). The Evidence Review page (`ProviderEvidence.tsx`) was never told about excluded providers, so it still lists every row including parks, daycares, Home Depot workshops, etc.

That is why the count did not move.

## Plan (1 phase, 1 turn)

**Phase A — Apply Strict Camp View to Evidence Review**

1. Import the same `classifyExclusion` helper used by City Deep Dive so both pages agree on what counts as a camp.
2. In `ProviderEvidence.tsx`:
   - Split fetched providers into `activeCamps` and `excludedProviders`.
   - Change the header counter from `295 of 295 providers` to `173 of 173 active camps` and add a small grey chip next to it: `+122 excluded (daycare, park, retail, charity)` with a tooltip breakdown.
   - Default the table to show only active camps.
   - Add a toggle above the table: **"Show excluded locations"** (off by default). When on, excluded rows appear at the bottom with a grey "Excluded — {reason}" pill in the Verification column.
   - CSV export respects the current toggle (active only by default; full set when toggle is on) and includes an `exclusion_reason` column.
3. No backend, no schema, no scoring changes. Pure presentation filter on this one page.

## Files touched
- `src/pages/ProviderEvidence.tsx` (counter, toggle, filter, CSV)
- Reuse existing `classifyExclusion` helper from `LiveCityDeepDive.tsx` — if it is not exported yet, move it to `src/lib/mvs/classifyExclusion.ts` and import from both places.

## What will NOT change
- City Deep Dive card behaviour (already done last turn)
- Pipeline, discovery, catch-up loop, scores, DB rows
- Any other page

## Risks
- Very low. Read-only UI filter. If `classifyExclusion` mislabels one provider, toggle ON shows it and you can audit.

## What you test after I build
1. Open Boston Evidence Review → header should read ~173 active camps, with `+122 excluded` chip.
2. Toggle "Show excluded locations" → full 295 rows return, excluded ones marked.
3. Export CSV with toggle off → only active camps. Toggle on → all rows + reason column.
4. Open Columbus Evidence Review → counts also drop (sanity check the helper works city-agnostic).

Approve and I will implement Phase A in one turn.