## Two small fixes

### 1. Make "Force fresh" a clearer outline button
- Today it's a small blue text link beside the Run button.
- Change it to a small outlined button (border + light hover bg, same row height) so Sam/Brett can spot and click it easily.
- Same behavior — just visual styling change in `CityRow` inside `src/pages/MarketValidationRollout.tsx`.

### 2. Fix duplicate "New York, NY" row
**Why it happens:** the page merges two sources:
- `SHORTLIST_SEED` (hard-coded 9 cities — already includes New York, NY)
- `useShortlistAdditions()` (rows the user added via "Add city" → stored in `mvs_shortlist_cities`)

Someone added "New York, NY" through Add city, so it now appears in both lists. The merge in `MarketValidationRollout.tsx` does no dedupe, so it shows twice.

**Fix:** dedupe the merged list by a normalized key (`lower(city) + ", " + upper(state)`). Seed wins; additions that match a seed entry (or another addition) are dropped from the table. No DB change — the stray `mvs_shortlist_cities` row stays harmless and can be cleaned later if you want.

**Optional follow-up (ask before doing):** also prevent the Add City dialog from accepting a city that already exists in the shortlist, so this can't happen again.

## Files touched
- `src/pages/MarketValidationRollout.tsx` only.

## Risk
- Very low. Pure UI + a `useMemo` dedupe. No scoring/data/backend changes.

## Test
- Force fresh appears as a small outlined button on every row.
- Only one "New York, NY" row shows; total goes from 12 → 11.

Approve and I'll ship both in one turn.
