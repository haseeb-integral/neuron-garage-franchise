
# Phase 2 only — Tighten pricing extraction in the existing discovery step

Approved scope locked. Nothing else will change.

## What this phase is

Improve **only** the Gemini extraction prompt (and add one extra Google search query) inside the discovery edge function so we pull `price_min` / `price_max` out of listing pages we already fetch. Same step, same caps, same code path.

## The one file that will change

- `supabase/functions/mvs-discover-providers/index.ts`

No other file, no schema, no other function, no UI.

## Exact changes inside that one file

1. **Tighten the Gemini "extract" prompt** (used by Sawyer, ActivityHero, Google Search, and Yelp variants). Add these rules to the system prompt:
   - "Only return a `price_min` or `price_max` if the **exact dollar amount appears in the source markdown**. Do not infer, estimate, average, or guess."
   - "Recognize these patterns as price: `$NNN/wk`, `$NNN per week`, `$NNN weekly`, `$NNN/week`, `tuition $NNN`, `from $NNN`, `starting at $NNN`, `$NNN–$NNN`."
   - "If only a single weekly number is shown, set both `price_min` and `price_max` to that number."
   - "If only a range is shown like `$300–$650`, set `price_min=300` and `price_max=650`."
   - "If no dollar amount is visible, return `price_min: null` and `price_max: null`. Do not invent values."

2. **Add a guard in code** (post-Gemini, before DB write): regex-check the source markdown for `\$\d{2,4}` near the provider name. If Gemini returned a price that **does not** appear anywhere in the markdown for that listing, drop the price (set to null). This enforces "only extract what is actually written".

3. **Add one extra Google Search variant** to the existing Google source block:
   - `"<city> kids summer camp prices per week"` (the current variants already hit "kids classes / camps / activities" without the word "price"). One extra query, same cap.

No new step, no new function, no DB columns, no new caps.

## What will NOT change

Scoring math, freshness rules, City Search, Saved Sites, Candidate Pipeline, PDF logic, schema, per-provider site scrape, Google/Gemini fallback step, classify step, extract step, pipeline orchestrator, UI.

## How I'll test (Columbus, Boston, Austin)

1. Read **before** numbers straight from DB:
   `SELECT city, COUNT(*) AS providers, COUNT(price_min) AS with_price, ROUND(100.0*COUNT(price_min)/COUNT(*),1) AS pct_priced FROM mvs_providers WHERE city IN ('Columbus, OH','Boston, MA','Austin, TX') GROUP BY city;`
   (Current snapshot: Columbus 18.9%, Boston 18.6%, Austin 26.7%.)
2. Run discover for each of the 3 cities with `forceFresh:true`.
3. Read **after** numbers with the same SQL.
4. Spot-check 5 random new priced rows per city — open the listing URL, confirm the dollar amount is really visible on the page.
5. Count Firecrawl calls used (from the run logs / `mvs_pipeline_runs` row).

## Report I will give you after Phase 2

- File changed: `supabase/functions/mvs-discover-providers/index.ts` (only).
- Exact prompt diff and the extra Google query string.
- Before vs after `% priced` table for Columbus, Boston, Austin.
- Firecrawl calls used per city (Apify is not used in MVS, so that count is 0).
- Any hallucinated prices caught by the regex guard (count).
- Any other risk or odd behavior noticed.
- Verdict: did Phase 2 alone get us to ≥30% priced? If yes, stop. If no, Phase 3 is still needed — I will wait for your approval.

## Risk

- **Very low.** Same step, same cap (`discover ≤ 25` Firecrawl calls per run), same code path.
- Worst case: the regex guard is too strict and drops a few legitimate prices → easy revert (1 turn, remove the guard).
- One extra Google query adds at most 1 Firecrawl `/v2/search` call per run, well inside the cap.

## Cost

- ~0 extra cost. Same cap, one extra search call per run (≈ $0.01).

## Turn estimate

- 1 turn to make the prompt + guard + query change.
- 1 turn to run the 3 test cities and report numbers.

## Hard stop after Phase 2

I will not start Phase 3 (Google/Gemini fallback) or Phase 4 (per-provider site scrape) until you explicitly approve them.

Approve this and I'll switch to build mode for the single-file change.
