# Non-Premium Providers section + score-source legend

Reframe the existing "All Discovered Providers" block on the per-city **Market Brief** page (`/market-brief?city=...&state=...`) so it sits right under "Premium Provider Roster" and only shows the non-premium rows, plus a clear legend explaining what feeds the MVS score and what doesn't.

(The `/market-validation` list page is unchanged — this only touches the per-city brief, which is also what gets printed to PDF via Cmd/Ctrl+P.)

## What changes in `src/pages/MarketBrief.tsx`

1. **Rename section 4.5** from "All Discovered Providers" → **"Non-Premium Providers (context only — not scored)"**, placed immediately below the existing Premium Provider Roster table (same spot it's in now).
2. **Filter out premium rows** — show only `tier ∈ {mid, budget, community}`. Sort by tier then name. Keep the existing columns: Provider, Tier badge, $ min/wk, $ max/wk, Category, Sources chips.
3. **Add a legend box** between the Premium table and the Non-Premium table, written at ~grade-6 reading level:

   > **How the score works**
   > - The MVS score for this city is built **only from Premium providers** (the table above).
   > - We find providers from 5 sources: **gsearch** (Google web search), **gmaps** (Google Maps), **ah** (ActivityHero), **yelp**, **sawyer**.
   > - Every provider we find is sorted into a tier: **premium** ($400+/wk or known national brand), **mid**, **budget**, or **community**.
   > - The table below shows mid / budget / community providers. They confirm the market is real, but they do **not** change the score.

## Files touched

- `src/pages/MarketBrief.tsx` — rename section, add legend block, filter table to exclude `tier === 'premium'`.

## Out of scope

- No edge function changes, no classifier changes, no scoring math changes.
- No changes to `/market-validation` list page.
- No changes to print CSS — the new legend + table inherit existing print styles and will appear in the PDF export.
