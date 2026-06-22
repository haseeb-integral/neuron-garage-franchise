
## Does this break Brett's rule?

**No.** Brett's rule is: every screen shows the same number, built from the same math (`computeMvs`), from the same raw data. The rule is about **consistency**, not about **recomputing every time**.

The new behavior still uses one shared `computeMvs` helper. Every screen still reads from the same cache. So Nashville's Demand = 72 everywhere, always. We just stop throwing the answer away the moment you leave the page.

If raw data changes (pipeline runs, override saved, watchlist toggled), the cache is told to refresh — so no stale numbers either.

---

## What the user will see

**Before:** Open Market Validation → blank → wait 2–4 seconds → table re-ranks 9 times → score cards finish loading.

**After:** Open Market Validation → scores show instantly (from last visit) → if anything changed in the background, table updates smoothly once, no flicker.

Scoring Console is unchanged. It still runs the pipeline (the thing that fetches fresh raw data). When the pipeline finishes, the cache is invalidated, and Market Validation picks up the new numbers next time it's opened (or right away if it's open).

---

## Plan

### Step 1 — Wrap `useLiveMvs` in React Query
- Convert the 7 parallel fetches inside `useLiveMvs` into a single `useQuery` keyed by `['mvs', cityId]`.
- `staleTime: 10 minutes` — within 10 min, return cached scores instantly, no refetch.
- `gcTime: 30 minutes` — keep in memory across page navigations.
- `refetchOnWindowFocus: false` — no surprise refetches when user tabs back.
- Inside the query function: run the same 7 fetches + same `computeMvs` call. **Math is untouched.**

### Step 2 — Invalidate cache when raw data changes
Add `queryClient.invalidateQueries({ queryKey: ['mvs'] })` in these existing spots:
- After a pipeline run completes (Scoring Console "Run pipeline" success handler).
- After an override is saved (operator watchlist, manual pillar override).
- After QA queue resolution.

That way, scores stay fresh without polling.

### Step 3 — Single shared loading state for score cards
Right now the big score cards show "loading" while the active city's 7 fetches run. After caching, on return visits this state will be `false` immediately because data is already cached. No code change needed — it becomes instant for free.

### Step 4 — Keep the "one calibrated number" guarantee visible
- Add a small "Scores as of HH:MM" timestamp under the table header, pulled from the query's `dataUpdatedAt`.
- Add a "Refresh scores" button that calls `invalidateQueries(['mvs'])` — for the rare case the user wants to force a recheck.

### Step 5 — Verify nothing else recomputes separately
Audit these surfaces to confirm they all read from the same cache (not their own fetch):
- Table rows
- `RowScorePopover`
- Selected-market right panel
- Compare modal
- CSV export

If any of them call `computeMvs` independently, switch them to read from the `['mvs', cityId]` cache.

---

## Technical details

**Files to change:**
- `src/hooks/useLiveMvs.ts` — wrap in `useQuery`.
- `src/pages/MarketValidation.tsx` — add timestamp + refresh button.
- Scoring Console run handler — add `invalidateQueries`.
- Override save handlers (watchlist, manual override, QA queue) — add `invalidateQueries`.
- Any surface from Step 5 audit that currently re-fetches.

**Files NOT touched:**
- `computeMvs` and `recomputedPillars.ts` — the math itself.
- Database schema — no new tables, no stored scores.
- Pipeline code — unchanged.

**Why React Query, not localStorage:** React Query already exists in the app (dashboard, candidate count, notifications use it). It handles cache invalidation, background refetch, and multi-tab sync correctly. localStorage would need all of that built by hand.

**Stale time choice (10 min):** Raw data only changes when the pipeline runs (usually weekly) or when an operator saves an override (handled by explicit invalidate). 10 min is safe — long enough to feel instant, short enough that any missed invalidation self-heals quickly.
