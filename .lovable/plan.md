# Fix scraping trust: retries + red/yellow pills

## What we are changing and why
Right now, if Google Maps or Yelp comes back with **0 providers** on a single try, we save that 0 and move on. Big cities keep scoring on only 3 sources instead of 5. That hurts trust in the composite score.

We will make the scraper try harder before giving up, and we will make the pills tell the truth loud and clear.

## The rules (plain English)
Five sources feed discover: **Google Maps, Google Search, Yelp, Sawyer, ActivityHero**.

**Critical sources (must not be 0):** Google Maps, Google Search.
**Secondary sources:** Yelp, Sawyer, ActivityHero.

**Retry rule (applies to any source that returns 0):**
1. First pass runs as today.
2. If any source returns 0 → wait ~15 seconds → **second pass** for just that source.
3. If still 0 → wait ~60 seconds → **third pass** for just that source.
4. If still 0 after 3 tries → save 0 and mark it "confirmed empty".

**Pill rule (in the rollout table):**
- **Red pill** = at least one *critical* source (Google Maps or Google Search) is confirmed 0 after all retries.
- **Yellow pill** = all critical sources are fine, but 1 or 2 *secondary* sources are confirmed 0.
- **Green pill (no pill)** = all 5 sources returned data.

The tooltip will show which sources were empty and note that 3 attempts were made.

## Phases

### Phase 1 — Backend retry logic (1 turn)
File: `supabase/functions/mvs-discover-providers/index.ts`
- Wrap each source's discover call in a helper `runWithRetry(source, fn)` that:
  - runs the source
  - if the returned count is 0 → sleep 15s → run again
  - if still 0 → sleep 60s → run again
  - returns the final count + `attempts` number
- Save `source_counts.discover` as `{ googleMaps: { count, attempts }, ... }` (small shape change — keep old numeric fallback for backward reads).
- Log each retry to edge function logs so we can see it working.
- **Risk:** longer runtime (up to ~75s extra per empty source). Edge functions run in background already, so this is safe.
- **Not touching:** the actual scraper query logic, the composite score math, other pipeline stages.

### Phase 2 — Frontend pill logic (1 turn)
File: `src/pages/MarketValidationRollout.tsx`
- Read the new `{ count, attempts }` shape (with fallback for old rows).
- Compute pill color:
  - red if `googleMaps.count === 0` OR `googleSearch.count === 0`
  - yellow if 1–2 secondary sources are 0
  - none if all 5 have data
- Update tooltip to say "Google Maps: 0 (tried 3 times)" for confirmed-empty sources.
- **Not touching:** any other page, any score math.

### Phase 3 — Re-run affected cities (manual, 0 code turns)
- After Phase 1+2 ship, click "Force Fresh" on the 5 big cities that showed 0s (New York, LA, Houston, Philadelphia, San Antonio).
- Confirm pills go green or reveal a real red (which then means Google itself is blocking us for that city — a different fix).

## Total: 2 code turns + manual re-run

## Risks / what NOT to touch
- Do **not** touch the composite score math or provider row inserts.
- Do **not** change Sawyer/ActivityHero/Yelp query shapes — only add retry wrapping.
- Runtime per city could grow by ~2–3 minutes worst case (5 sources × 75s). Still well under the background function timeout.

## What to test after each phase
- **Phase 1:** run pipeline for New York, check edge logs show "retry 2/3 for googleMaps", check `mvs_pipeline_runs.source_counts` has the new shape.
- **Phase 2:** open rollout page, confirm red pill appears if Google Maps is truly 0, yellow if only Yelp is 0, no pill if all green.

## Approve to start Phase 1?
