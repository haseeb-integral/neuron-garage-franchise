
# Boston MVS Page Fix — All 3 Phases Together

Goal: after a fresh pipeline run, every word and number on the MVS deep-dive must match the live database. No more "Jun 19" stamps, no more "591 providers", no more "extract" mention.

## Phase 1 — Auto-refresh score after pipeline run
**File:** `supabase/functions/mvs-run-pipeline/index.ts`

After the existing `discover → classify → ACS` steps finish for a city, add one more call to the score-recompute path that the "Refresh scores" button already uses. Same city, same response shape. If recompute fails, the run still returns success and we log a warning — the user can hit "Refresh scores" manually as a fallback.

Result: score, sub-scores, and all "scraped on" dates update on their own when the run finishes.

## Phase 2 — Fix wrong copy under the score
**File:** `src/components/phase2-demo/LiveCityDeepDive.tsx` (the file that renders "Computed from 591 providers and 87 week rows")

Change the line to read the live counts from the same data the page already loads via `useLiveMvs`:
- "Computed from **{providerCount}** providers" — use the real provider count for the city.
- Drop "and X week rows" entirely (Market Absorption is retired, weeks don't feed the score anymore).

Also fix the Pricing sub-score helper text "Based on 10 of 15 providers with a readable price" so the denominator reads the live `mvs_providers` total for the city, not a cached sample.

## Phase 3 — Remove retired references from the page
**Files:** `src/components/phase2-demo/LiveCityDeepDive.tsx`, `src/components/phase2-demo/RunPipelineButton.tsx`, `src/components/phase2-demo/LiveCitySourcePanels.tsx`

- **Help text under Run Pipeline:** change `discover → classify → extract → cap 50 Firecrawl calls` → `discover → classify → ACS → cap 50 Firecrawl calls`.
- **Data sources card:** remove the `Sawyer week availability 51/87 loaded` chip — weeks step retired.
- **"Scraped Jun 19" stamps:** remove the date pill on sub-score cards that no longer use weeks data (keep it on cards still backed by live scrapes, like Premium Providers).

## What is NOT changing
- No DB schema changes.
- No score-math changes (weights, formulas, thresholds untouched).
- No RLS, grants, edge function auth changes.
- The `mvs-extract-weeks` function stays on disk (already unused) — we just remove UI mentions.

## Risk
- Low. Phase 1 adds one extra HTTP call inside an already-running function; wrapped in try/catch.
- Phase 2 & 3 are text + count swaps in one React file each.

## How to smoke-test after all 3 phases
1. Click any other city row → no red toast (already fixed last turn).
2. Open Boston → press **Run Pipeline**.
3. Wait ~2 min for green success toast.
4. Check the score card under Boston:
   - "Last refreshed" should read **just now / today**.
   - "Computed from **215** providers" (not 591, no "week rows").
   - Pricing card: "Based on 40 of 215 providers with a readable price" (not 10 of 15).
   - All sub-score "scraped on" dates should be today.
5. Help text under Run Pipeline should say `discover → classify → ACS`, no `extract`.
6. Data Sources card should not show "Sawyer week availability".

## Order of work
I'll do Phase 1 (backend edge function), then Phase 2 (page copy + counts), then Phase 3 (remove retired text), in that order, in **3 separate turns** so each is easy to review and rollback.

Approve and I'll start with Phase 1.
